const path = require("path");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

dotenv.config();
const { initDb, get, run, all } = require("./db");

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required in environment variables");
}

const app = express();
const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const FRONTEND_DIR = path.join(__dirname, "..", "..", "ДИПЛОМ 2");
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(",") }));
app.use(express.json({ limit: "8mb" }));
app.use(express.static(FRONTEND_DIR));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Слишком много попыток, попробуйте позже" },
});

function createToken(user) {
  return jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function buildProfilePayload(body = {}) {
  const rawAvatar =
    typeof body.avatarPhoto === "string"
      ? body.avatarPhoto
      : typeof body.avatar_photo === "string"
        ? body.avatar_photo
        : "";
  const avatar_photo =
    rawAvatar.length > 1_800_000 ? rawAvatar.slice(0, 1_800_000) : rawAvatar;
  return {
    first_name: String(body.firstName || "").trim(),
    last_name: String(body.lastName || "").trim(),
    middle_name: String(body.middleName || "").trim(),
    birth_date: String(body.birthDate || "").trim(),
    gender: String(body.gender || "").trim(),
    height_cm: Number(body.heightCm || 0) || 0,
    weight_kg: Number(body.weightKg || 0) || 0,
    target_weight_kg: Number(body.targetWeightKg || 0) || 0,
    activity_level: String(body.activityLevel || "").trim(),
    fitness_goal: String(body.fitnessGoal || "").trim(),
    city: String(body.city || "").trim(),
    phone: String(body.phone || "").trim(),
    emergency_contact: String(body.emergencyContact || "").trim(),
    medical_notes: String(body.medicalNotes || "").trim(),
    avatar_photo,
  };
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || "";
  const [, token] = auth.split(" ");
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (_err) {
    res.status(401).json({ error: "Invalid token" });
  }
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "fitness-backend" });
});

app.post(
  "/api/auth/register",
  authLimiter,
  asyncHandler(async (req, res) => {
    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "");
    const profile = buildProfilePayload(req.body);

    if (username.length < 3 || password.length < 6) {
      res.status(400).json({
        error: "Username минимум 3 символа, пароль минимум 6 символов",
      });
      return;
    }
    if (
      !profile.first_name ||
      !profile.last_name ||
      !profile.birth_date ||
      !profile.gender
    ) {
      res.status(400).json({
        error: "Для регистрации заполните: имя, фамилию, дату рождения и пол",
      });
      return;
    }
    if (!["male", "female"].includes(profile.gender)) {
      res.status(400).json({ error: "Пол должен быть: male или female" });
      return;
    }

    const existing = await get("SELECT id FROM users WHERE username = $1", [username]);
    if (existing) {
      res.status(409).json({ error: "Пользователь уже существует" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const createdAt = new Date().toISOString();
    const result = await run(
      "INSERT INTO users (username, password_hash, created_at) VALUES ($1, $2, $3) RETURNING id",
      [username, passwordHash, createdAt]
    );
    const userId = result.lastID;
    await run(
      `
      INSERT INTO user_profiles (
        user_id, first_name, last_name, middle_name, birth_date, gender,
        height_cm, weight_kg, target_weight_kg, activity_level, fitness_goal,
        city, phone, emergency_contact, medical_notes, avatar_photo, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      `,
      [
        userId,
        profile.first_name,
        profile.last_name,
        profile.middle_name,
        profile.birth_date,
        profile.gender,
        profile.height_cm,
        profile.weight_kg,
        profile.target_weight_kg,
        profile.activity_level,
        profile.fitness_goal,
        profile.city,
        profile.phone,
        profile.emergency_contact,
        profile.medical_notes,
        profile.avatar_photo || "",
        createdAt,
      ]
    );
    const user = { id: userId, username };
    const token = createToken(user);
    res.status(201).json({
      token,
      user: {
        ...user,
        firstName: profile.first_name,
        lastName: profile.last_name,
      },
    });
  })
);

app.post(
  "/api/auth/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "");

    const user = await get(
      "SELECT id, username, password_hash FROM users WHERE username = $1",
      [username]
    );
    if (!user) {
      res.status(401).json({ error: "Неверный логин или пароль" });
      return;
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Неверный логин или пароль" });
      return;
    }
    const token = createToken(user);
    res.json({ token, user: { id: user.id, username: user.username } });
  })
);

app.get(
  "/api/auth/me",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = await get("SELECT id, username, created_at FROM users WHERE id = $1", [
      req.user.userId,
    ]);
    if (!user) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }
    const profile = await get(
      `
      SELECT first_name, last_name, middle_name, birth_date, gender,
            height_cm, weight_kg, target_weight_kg, activity_level,
            fitness_goal, city, phone, emergency_contact, medical_notes,
            avatar_photo
      FROM user_profiles
      WHERE user_id = $1
      `,
      [req.user.userId]
    );
    res.json({ user, profile });
  })
);

app.get(
  "/api/profile",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const profile = await get(
      `
      SELECT first_name, last_name, middle_name, birth_date, gender,
            height_cm, weight_kg, target_weight_kg, activity_level,
            fitness_goal, city, phone, emergency_contact, medical_notes,
            avatar_photo
      FROM user_profiles
      WHERE user_id = $1
      `,
      [req.user.userId]
    );
    res.json({ profile: profile || null });
  })
);

app.put(
  "/api/profile",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const existing = await get("SELECT avatar_photo FROM user_profiles WHERE user_id = $1", [
      req.user.userId,
    ]);
    const profile = buildProfilePayload(req.body);
    const keepAvatar =
      !Object.prototype.hasOwnProperty.call(req.body || {}, "avatarPhoto") &&
      !Object.prototype.hasOwnProperty.call(req.body || {}, "avatar_photo");
    const avatarPhoto =
      keepAvatar && existing?.avatar_photo != null
        ? String(existing.avatar_photo)
        : profile.avatar_photo;
    const now = new Date().toISOString();

    await run(
      `
      INSERT INTO user_profiles (
        user_id, first_name, last_name, middle_name, birth_date, gender,
        height_cm, weight_kg, target_weight_kg, activity_level, fitness_goal,
        city, phone, emergency_contact, medical_notes, avatar_photo, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT(user_id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        middle_name = EXCLUDED.middle_name,
        birth_date = EXCLUDED.birth_date,
        gender = EXCLUDED.gender,
        height_cm = EXCLUDED.height_cm,
        weight_kg = EXCLUDED.weight_kg,
        target_weight_kg = EXCLUDED.target_weight_kg,
        activity_level = EXCLUDED.activity_level,
        fitness_goal = EXCLUDED.fitness_goal,
        city = EXCLUDED.city,
        phone = EXCLUDED.phone,
        emergency_contact = EXCLUDED.emergency_contact,
        medical_notes = EXCLUDED.medical_notes,
        avatar_photo = EXCLUDED.avatar_photo,
        updated_at = EXCLUDED.updated_at
      `,
      [
        req.user.userId,
        profile.first_name,
        profile.last_name,
        profile.middle_name,
        profile.birth_date,
        profile.gender,
        profile.height_cm,
        profile.weight_kg,
        profile.target_weight_kg,
        profile.activity_level,
        profile.fitness_goal,
        profile.city,
        profile.phone,
        profile.emergency_contact,
        profile.medical_notes,
        avatarPhoto,
        now,
      ]
    );
    res.json({ ok: true });
  })
);

app.get(
  "/api/storage",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const rows = await all(
      "SELECT key, value_json, updated_at FROM user_storage WHERE user_id = $1",
      [req.user.userId]
    );
    const payload = {};
    rows.forEach((row) => {
      payload[row.key] = {
        value: row.value_json,
        updatedAt: row.updated_at,
      };
    });
    res.json({ items: payload });
  })
);

app.put(
  "/api/storage/:key",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const key = String(req.params.key || "").trim();
    if (!key) {
      res.status(400).json({ error: "Некорректный ключ" });
      return;
    }
    const value = typeof req.body?.value === "string" ? req.body.value : "";
    const now = new Date().toISOString();

    await run(
      `
      INSERT INTO user_storage (user_id, key, value_json, updated_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT(user_id, key)
      DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = EXCLUDED.updated_at
      `,
      [req.user.userId, key, value, now]
    );
    res.json({ ok: true });
  })
);

app.delete(
  "/api/storage/:key",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const key = String(req.params.key || "").trim();
    if (!key) {
      res.status(400).json({ error: "Некорректный ключ" });
      return;
    }
    await run("DELETE FROM user_storage WHERE user_id = $1 AND key = $2", [
      req.user.userId,
      key,
    ]);
    res.json({ ok: true });
  })
);

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
    `SELECT post_id AS "postId", username FROM social_likes WHERE post_id = ANY($1::text[])`,
    [ids]
  );
  const reactions = await all(
    `SELECT post_id AS "postId", emoji, username FROM social_reactions WHERE post_id = ANY($1::text[])`,
    [ids]
  );
  const comments = await all(
    `SELECT id, post_id AS "postId", author, text, created_at AS "createdAt" FROM social_comments WHERE post_id = ANY($1::text[]) ORDER BY created_at ASC`,
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
  const names = new Set();
  list.forEach((post) => {
    if (post.author) names.add(post.author);
    (post.comments || []).forEach((comment) => {
      if (comment.author) names.add(comment.author);
    });
  });
  const nameArr = [...names];
  let avatarMap = {};
  if (nameArr.length) {
    const rows = await all(
      `
      SELECT u.username, COALESCE(up.avatar_photo, '') AS avatar_photo
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      WHERE u.username = ANY($1::text[])
      `,
      [nameArr]
    );
    avatarMap = Object.fromEntries(
      rows.map((row) => [row.username, String(row.avatar_photo || "")])
    );
  }
  list.forEach((post) => {
    post.authorAvatar = avatarMap[post.author] || "";
    (post.comments || []).forEach((comment) => {
      comment.authorAvatar = avatarMap[comment.author] || "";
    });
  });
  return list;
}

app.get(
  "/api/social/posts",
  authMiddleware,
  asyncHandler(async (_req, res) => {
    const posts = await fetchSocialPosts();
    res.json({ posts });
  })
);

app.post(
  "/api/social/posts",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const content = String(req.body?.content || "").trim();
    if (!content) {
      res.status(400).json({ error: "Пустой текст" });
      return;
    }
    const id = uid("post");
    const createdAt = Date.now();
    await run(
      "INSERT INTO social_posts (id, author, content, created_at, pinned) VALUES ($1, $2, $3, $4, FALSE)",
      [id, req.user.username, content, createdAt]
    );
    res.status(201).json({ ok: true, id });
  })
);

app.post(
  "/api/social/posts/:id/comments",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const postId = String(req.params.id || "").trim();
    const text = String(req.body?.text || "").trim();
    if (!postId || !text) {
      res.status(400).json({ error: "Некорректные данные" });
      return;
    }
    const post = await get("SELECT id FROM social_posts WHERE id = $1", [postId]);
    if (!post) {
      res.status(404).json({ error: "Пост не найден" });
      return;
    }
    const id = uid("c");
    await run(
      "INSERT INTO social_comments (id, post_id, author, text, created_at) VALUES ($1, $2, $3, $4, $5)",
      [id, postId, req.user.username, text, Date.now()]
    );
    res.json({ ok: true, id });
  })
);

app.post(
  "/api/social/posts/:id/like",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const postId = String(req.params.id || "").trim();
    if (!postId) {
      res.status(400).json({ error: "Некорректный postId" });
      return;
    }
    const me = req.user.username;
    const post = await get("SELECT id FROM social_posts WHERE id = $1", [postId]);
    if (!post) {
      res.status(404).json({ error: "Пост не найден" });
      return;
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
      res.json({ ok: true, liked: false });
      return;
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
    res.json({ ok: true, liked: true });
  })
);

app.post(
  "/api/social/posts/:id/react",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const postId = String(req.params.id || "").trim();
    const emoji = String(req.body?.emoji || "").trim();
    const allowed = new Set(["❤️", "🔥", "💪", "👎"]);
    if (!postId || !allowed.has(emoji)) {
      res.status(400).json({ error: "Некорректные данные" });
      return;
    }
    const me = req.user.username;
    const post = await get("SELECT id FROM social_posts WHERE id = $1", [postId]);
    if (!post) {
      res.status(404).json({ error: "Пост не найден" });
      return;
    }
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
      res.json({ ok: true, active: false });
      return;
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
    res.json({ ok: true, active: true });
  })
);

app.post(
  "/api/social/posts/:id/pin",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const postId = String(req.params.id || "").trim();
    if (!postId) {
      res.status(400).json({ error: "Некорректный postId" });
      return;
    }
    const post = await get("SELECT id, pinned FROM social_posts WHERE id = $1", [postId]);
    if (!post) {
      res.status(404).json({ error: "Пост не найден" });
      return;
    }
    const nextPinned = !Boolean(post.pinned);
    await run("UPDATE social_posts SET pinned = $1 WHERE id = $2", [nextPinned, postId]);
    res.json({ ok: true, pinned: nextPinned });
  })
);

app.get("*", (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "213223232.html"));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Внутренняя ошибка сервера" });
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server started: http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("DB init error:", err);
    process.exit(1);
  });
