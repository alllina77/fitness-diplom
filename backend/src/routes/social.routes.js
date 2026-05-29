const express = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const { authMiddleware } = require("../middleware/auth");
const { all, get, run } = require("../db");

function uid(prefix = "s") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

async function fetchSocialPosts() {
  const posts = await all(
    `
    SELECT id, author, content, created_at AS "createdAt", pinned
    FROM social_posts
    ORDER BY pinned DESC, created_at DESC
    LIMIT 200
    `
  );

  const ids = posts.map((p) => p.id);
  if (!ids.length) return [];

  const likes = await all(
    "SELECT post_id AS \"postId\", username FROM social_likes WHERE post_id = ANY($1::text[])",
    [ids]
  );
  const reactions = await all(
    "SELECT post_id AS \"postId\", emoji, username FROM social_reactions WHERE post_id = ANY($1::text[])",
    [ids]
  );
  const comments = await all(
    "SELECT id, post_id AS \"postId\", author, text, created_at AS \"createdAt\" FROM social_comments WHERE post_id = ANY($1::text[]) ORDER BY created_at ASC",
    [ids]
  );

  const byId = new Map();
  posts.forEach((p) => {
    byId.set(p.id, {
      id: p.id,
      author: p.author,
      content: p.content,
      createdAt: Number(p.createdAt) || 0,
      pinned: Boolean(p.pinned),
      likes: [],
      reactions: { "❤️": [], "🔥": [], "💪": [], "👎": [] },
      comments: [],
    });
  });

  likes.forEach((l) => {
    const post = byId.get(l.postId);
    if (post) post.likes.push(l.username);
  });

  reactions.forEach((r) => {
    const post = byId.get(r.postId);
    if (!post) return;
    if (!post.reactions[r.emoji]) post.reactions[r.emoji] = [];
    post.reactions[r.emoji].push(r.username);
  });

  comments.forEach((c) => {
    const post = byId.get(c.postId);
    if (!post) return;
    post.comments.push({
      id: c.id,
      author: c.author,
      text: c.text,
      createdAt: Number(c.createdAt) || 0,
    });
  });

  const list = posts.map((p) => byId.get(p.id)).filter(Boolean);

  const usernames = new Set();
  list.forEach((post) => {
    usernames.add(post.author);
    post.comments.forEach((comment) => usernames.add(comment.author));
  });

  if (usernames.size) {
    const rows = await all(
      `
      SELECT u.username, COALESCE(up.avatar_url, '') AS avatar_url
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      WHERE u.username = ANY($1::text[])
      `,
      [[...usernames]]
    );

    const avatarMap = Object.fromEntries(rows.map((row) => [row.username, row.avatar_url]));

    list.forEach((post) => {
      post.authorAvatar = avatarMap[post.author] || "";
      post.comments.forEach((comment) => {
        comment.authorAvatar = avatarMap[comment.author] || "";
      });
    });
  }

  return list;
}

function createSocialRouter() {
  const router = express.Router();

  router.get(
    "/posts",
    authMiddleware,
    asyncHandler(async (_req, res) => {
      const posts = await fetchSocialPosts();
      return res.json({ posts });
    })
  );

  router.post(
    "/posts",
    authMiddleware,
    asyncHandler(async (req, res) => {
      const content = String(req.body?.content || "").trim();
      if (!content) {
        return res.status(400).json({ error: "Пустой текст" });
      }
      const id = uid("post");
      await run(
        "INSERT INTO social_posts (id, author, content, created_at, pinned) VALUES ($1, $2, $3, $4, FALSE)",
        [id, req.user.username, content, Date.now()]
      );
      return res.status(201).json({ ok: true, id });
    })
  );

  router.post(
    "/posts/:id/comments",
    authMiddleware,
    asyncHandler(async (req, res) => {
      const postId = String(req.params.id || "").trim();
      const text = String(req.body?.text || "").trim();
      if (!postId || !text) {
        return res.status(400).json({ error: "Некорректные данные" });
      }
      const post = await get("SELECT id FROM social_posts WHERE id = $1", [postId]);
      if (!post) {
        return res.status(404).json({ error: "Пост не найден" });
      }
      const id = uid("c");
      await run(
        "INSERT INTO social_comments (id, post_id, author, text, created_at) VALUES ($1, $2, $3, $4, $5)",
        [id, postId, req.user.username, text, Date.now()]
      );
      return res.json({ ok: true, id });
    })
  );

  router.post(
    "/posts/:id/like",
    authMiddleware,
    asyncHandler(async (req, res) => {
      const postId = String(req.params.id || "").trim();
      const me = req.user.username;
      const post = await get("SELECT id FROM social_posts WHERE id = $1", [postId]);
      if (!post) {
        return res.status(404).json({ error: "Пост не найден" });
      }

      const exists = await get(
        "SELECT post_id FROM social_likes WHERE post_id = $1 AND username = $2",
        [postId, me]
      );

      if (exists) {
        await run("DELETE FROM social_likes WHERE post_id = $1 AND username = $2", [postId, me]);
        await run("DELETE FROM social_reactions WHERE post_id = $1 AND emoji = $2 AND username = $3", [
          postId,
          "❤️",
          me,
        ]);
        return res.json({ ok: true, liked: false });
      }

      await run("INSERT INTO social_likes (post_id, username, created_at) VALUES ($1, $2, $3)", [
        postId,
        me,
        Date.now(),
      ]);
      await run(
        "INSERT INTO social_reactions (post_id, emoji, username, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (post_id, emoji, username) DO NOTHING",
        [postId, "❤️", me, Date.now()]
      );
      return res.json({ ok: true, liked: true });
    })
  );

  router.post(
    "/posts/:id/react",
    authMiddleware,
    asyncHandler(async (req, res) => {
      const postId = String(req.params.id || "").trim();
      const emoji = String(req.body?.emoji || "").trim();
      const allowed = new Set(["❤️", "🔥", "💪", "👎"]);
      if (!postId || !allowed.has(emoji)) {
        return res.status(400).json({ error: "Некорректные данные" });
      }

      const post = await get("SELECT id FROM social_posts WHERE id = $1", [postId]);
      if (!post) return res.status(404).json({ error: "Пост не найден" });

      const me = req.user.username;
      const exists = await get(
        "SELECT post_id FROM social_reactions WHERE post_id = $1 AND emoji = $2 AND username = $3",
        [postId, emoji, me]
      );

      if (exists) {
        await run("DELETE FROM social_reactions WHERE post_id = $1 AND emoji = $2 AND username = $3", [
          postId,
          emoji,
          me,
        ]);
        if (emoji === "❤️") {
          await run("DELETE FROM social_likes WHERE post_id = $1 AND username = $2", [postId, me]);
        }
        return res.json({ ok: true, active: false });
      }

      await run(
        "INSERT INTO social_reactions (post_id, emoji, username, created_at) VALUES ($1, $2, $3, $4)",
        [postId, emoji, me, Date.now()]
      );
      if (emoji === "❤️") {
        await run(
          "INSERT INTO social_likes (post_id, username, created_at) VALUES ($1, $2, $3) ON CONFLICT (post_id, username) DO NOTHING",
          [postId, me, Date.now()]
        );
      }

      return res.json({ ok: true, active: true });
    })
  );

  router.post(
    "/posts/:id/pin",
    authMiddleware,
    asyncHandler(async (req, res) => {
      const postId = String(req.params.id || "").trim();
      const post = await get("SELECT id, pinned, author FROM social_posts WHERE id = $1", [postId]);
      if (!post) return res.status(404).json({ error: "Пост не найден" });

      if (post.author !== req.user.username) {
        return res.status(403).json({ error: "Закреплять пост может только его автор" });
      }

      const nextPinned = !Boolean(post.pinned);
      await run("UPDATE social_posts SET pinned = $1 WHERE id = $2", [nextPinned, postId]);
      return res.json({ ok: true, pinned: nextPinned });
    })
  );

  return router;
}

module.exports = { createSocialRouter };
