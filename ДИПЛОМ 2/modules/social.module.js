window.AppModules = window.AppModules || {};

window.AppModules.social = {
  storageKey: "socialFeedPosts_v1",
  followsKey: "socialFollows_v1",
  followEdgesKey: "socialFollowEdges_v1",
  currentUser: "Вы",
  uiState: {
    query: "",
    sort: "new",
    highlightPostId: "",
    isLoading: false,
  },
  cache: {
    posts: [],
    lastFetchAt: 0,
  },

  uid() {
    return "s_" + Math.random().toString(36).slice(2, 10);
  },

  getToken() {
    try {
      return String(localStorage.getItem("appAuthToken_v1") || "");
    } catch (_e) {
      return "";
    }
  },

  async api(path, options = {}) {
    const token = this.getToken();
    const headers = { ...(options.headers || {}) };
    if (!headers["Content-Type"] && options.body != null) {
      headers["Content-Type"] = "application/json";
    }
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(path, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data;
  },

  escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  },

  getSeedPosts() {
    const now = Date.now();
    return [
      {
        id: this.uid(),
        author: "Алина",
        content:
          "Сегодня закрыла 10 000 шагов и сделала растяжку 20 минут. Чувствую себя супер!",
        createdAt: now - 1000 * 60 * 60 * 4,
        likes: ["Иван", "Марина"],
        reactions: {
          "❤️": ["Иван"],
          "🔥": ["Марина"],
          "💪": [],
          "👎": [],
        },
        comments: [
          {
            id: this.uid(),
            author: "Иван",
            text: "Красавица! Так держать 🔥",
            createdAt: now - 1000 * 60 * 60 * 3,
          },
        ],
      },
      {
        id: this.uid(),
        author: "Денис",
        content:
          "Первый раз сделал 100 кг в приседе на 5 повторений. Новый личный рекорд!",
        createdAt: now - 1000 * 60 * 60 * 9,
        likes: ["Алина"],
        reactions: {
          "❤️": ["Алина"],
          "🔥": [],
          "💪": ["Иван"],
          "👎": [],
        },
        comments: [
          {
            id: this.uid(),
            author: "Марина",
            text: "Мощно! Поздравляю с прогрессом!",
            createdAt: now - 1000 * 60 * 60 * 8,
          },
          {
            id: this.uid(),
            author: "Иван",
            text: "Теперь цель 110 💪",
            createdAt: now - 1000 * 60 * 60 * 7,
          },
        ],
      },
    ];
  },

  async loadPostsRemote() {
    const data = await this.api("/api/social/posts");
    const posts = Array.isArray(data?.posts) ? data.posts : [];
    this.cache.posts = this.normalizePosts(posts);
    this.cache.lastFetchAt = Date.now();
    return this.cache.posts;
  },

  migrateFollowEdgesIfNeeded() {
    try {
      if (localStorage.getItem(this.followEdgesKey)) return;
      const legacy = JSON.parse(localStorage.getItem(this.followsKey) || "[]");
      const me = window.AppAuth?.user?.username || "";
      if (!me || !Array.isArray(legacy) || !legacy.length) return;
      const edges = legacy.map((followee) => ({ follower: me, followee }));
      localStorage.setItem(this.followEdgesKey, JSON.stringify(edges));
    } catch (_e) {
      /* no-op */
    }
  },

  getFollowEdges() {
    this.migrateFollowEdgesIfNeeded();
    try {
      const list = JSON.parse(localStorage.getItem(this.followEdgesKey)) || [];
      return Array.isArray(list) ? list : [];
    } catch (_e) {
      return [];
    }
  },

  setFollowEdges(list) {
    localStorage.setItem(this.followEdgesKey, JSON.stringify(list));
  },

  getFollowersOf(username) {
    const u = String(username || "");
    return [
      ...new Set(
        this.getFollowEdges()
          .filter((e) => e.followee === u && e.follower && e.follower !== u)
          .map((e) => e.follower)
      ),
    ];
  },

  loadPosts() {
    return this.normalizePosts(this.cache.posts || []);
  },

  formatDate(ts) {
    try {
      return new Date(ts).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (_e) {
      return "";
    }
  },

  normalizePosts(posts) {
    return posts.map((post) => ({
      ...post,
      authorAvatar: String(post.authorAvatar || ""),
      pinned: Boolean(post.pinned),
      likes: Array.isArray(post.likes) ? post.likes : [],
      comments: Array.isArray(post.comments)
        ? post.comments.map((c) => ({
            ...c,
            authorAvatar: String(c.authorAvatar || ""),
          }))
        : [],
      reactions: this.normalizeReactions(post.reactions, post.likes),
    }));
  },

  normalizeReactions(rawReactions, likes) {
    const base = { "❤️": [], "🔥": [], "💪": [], "👎": [] };
    const reactionKeys = Object.keys(base);
    const safeLikes = Array.isArray(likes) ? likes : [];
    const normalized = reactionKeys.reduce((acc, key) => {
      const list = rawReactions?.[key];
      acc[key] = Array.isArray(list) ? [...new Set(list)] : [];
      return acc;
    }, base);
    if (!normalized["❤️"].length && safeLikes.length) {
      normalized["❤️"] = [...new Set(safeLikes)];
    }
    return normalized;
  },

  reactionEmojiOrder: ["❤️", "🔥", "💪", "👎"],

  countUserReactionKinds(post, userName) {
    post.reactions = this.normalizeReactions(post.reactions, post.likes);
    return this.reactionEmojiOrder.filter((code) =>
      (post.reactions[code] || []).includes(userName)
    );
  },

  /** Не более 3 видов реакций у одного пользователя одновременно (включая ❤️ от лайка). */
  trimReactionsSoUserHasMaxThree(post, userName, incomingKind) {
    post.reactions = this.normalizeReactions(post.reactions, post.likes);
    let kinds = this.countUserReactionKinds(post, userName);
    if (kinds.includes(incomingKind)) return;
    const dropPriority = ["👎", "💪", "🔥", "❤️"];
    while (kinds.length >= 3) {
      const victim = dropPriority.find(
        (c) => c !== incomingKind && (post.reactions[c] || []).includes(userName)
      );
      if (!victim) break;
      post.reactions[victim] = (post.reactions[victim] || []).filter(
        (n) => n !== userName
      );
      if (victim === "❤️") {
        post.likes = (post.likes || []).filter((n) => n !== userName);
      }
      kinds = this.countUserReactionKinds(post, userName);
    }
  },

  getInitials(name) {
    const safeName = String(name || "").trim();
    if (!safeName) return "?";
    const parts = safeName.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  },

  getAvatarTone(name) {
    const palette = [
      ["#8f6bff", "#5de2c5"],
      ["#ff8a65", "#ffd166"],
      ["#4fc3f7", "#7c5cff"],
      ["#81c784", "#64b5f6"],
      ["#f48fb1", "#ba68c8"],
    ];
    const seed = String(name || "")
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return palette[seed % palette.length];
  },

  getAvatarPhoto(name, remoteUrl) {
    if (remoteUrl && String(remoteUrl).trim()) return String(remoteUrl).trim();
    try {
      const all = JSON.parse(localStorage.getItem("profileVisualByUser_v1")) || {};
      return String(all?.[name]?.photo || "");
    } catch (_e) {
      return "";
    }
  },

  renderAvatar(name, sizeClass = "", remoteUrl = "") {
    const initials = this.escapeHtml(this.getInitials(name));
    const [from, to] = this.getAvatarTone(name);
    const photo = this.getAvatarPhoto(name, remoteUrl);
    if (photo) {
      return `
      <div class="social-avatar ${sizeClass}" title="${this.escapeHtml(name)}">
        <img src="${this.escapeHtml(photo)}" alt="${this.escapeHtml(name)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />
      </div>
    `;
    }
    return `
      <div
        class="social-avatar ${sizeClass}"
        style="background: linear-gradient(135deg, ${from}, ${to})"
        title="${this.escapeHtml(name)}"
      >
        ${initials}
      </div>
    `;
  },

  ensureStyles() {
    if (document.getElementById("social-module-styles")) return;
    const style = document.createElement("style");
    style.id = "social-module-styles";
    style.textContent = `
      .social-wrap { max-width: 920px; margin: 0 auto; display: grid; gap: 14px; }
      .social-composer, .social-post { background: linear-gradient(160deg, rgba(147,126,214,0.18), rgba(84,73,150,0.12)); border: 1px solid rgba(171,148,230,0.35); border-radius: 16px; padding: 16px; box-shadow: 0 12px 32px rgba(18, 12, 34, 0.32); }
      .social-post { transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease; }
      .social-post:hover { transform: translateY(-2px); box-shadow: 0 16px 36px rgba(34, 22, 61, 0.45); border-color: rgba(206, 183, 255, 0.58); }
      .social-post-new { animation: socialPostPop .55s ease; }
      @keyframes socialPostPop {
        0% { transform: scale(0.98); opacity: 0; }
        60% { transform: scale(1.01); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
      .social-title { margin: 0 0 8px 0; font-size: 32px; line-height: 1.2; }
      .social-subtitle { margin: 0 0 14px 0; color: var(--muted); font-size: 17px; line-height: 1.55; }
      .social-composer textarea { width: 100%; min-height: 84px; border-radius: 10px; padding: 10px; resize: vertical; background: rgba(52,37,92,0.35); color: #f3ecff; border: 1px solid rgba(188,166,242,0.35); }
      .social-row { display: flex; gap: 8px; align-items: center; justify-content: space-between; margin-top: 8px; }
      .social-btn { cursor: pointer; border-radius: 10px; border: 1px solid rgba(191,169,242,0.6); background: rgba(128,101,196,0.25); color: #f2ebff; padding: 8px 12px; }
      .social-btn:hover { border-color: rgba(208,183,255,0.95); background: rgba(138,108,214,0.35); }
      .social-feed { display: grid; gap: 12px; }
      .social-toolbar { display: grid; grid-template-columns: 1fr 170px; gap: 10px; margin-bottom: 10px; }
      .social-search { width: 100%; }
      .social-select { width: 100%; }
      .social-post-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
      .social-post-main { display: flex; align-items: center; gap: 10px; min-width: 0; }
      .social-author-wrap { display: grid; gap: 2px; min-width: 0; }
      .social-author { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .social-role { color: var(--muted); font-size: 12px; display: flex; align-items: center; gap: 6px; }
      .social-badge { font-size: 11px; color: #d7fff4; background: rgba(63, 224, 197, 0.16); border: 1px solid rgba(63, 224, 197, 0.35); border-radius: 999px; padding: 2px 7px; white-space: nowrap; }
      .social-date { color: var(--muted); font-size: 12px; }
      .social-content { margin: 0 0 10px 0; white-space: pre-wrap; font-size: 15px; line-height: 1.55; }
      .social-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
      .social-count { color: var(--muted); font-size: 13px; }
      .social-counter { font-size: 12px; color: var(--muted); }
      .social-counter.limit-near { color: #ffd166; }
      .social-comment-form { display: flex; align-items: center; gap: 8px; }
      .social-comment-form input { flex: 1; border-radius: 8px; border: 1px solid rgba(188,166,242,0.35); background: rgba(52,37,92,0.35); color: #f3ecff; padding: 8px 10px; }
      .social-comments { margin-top: 10px; display: grid; gap: 8px; }
      .social-comment { display: flex; align-items: flex-start; gap: 8px; background: rgba(73,56,122,0.3); border: 1px solid rgba(171,148,230,0.35); border-radius: 10px; padding: 8px 10px; }
      .social-comment-body { min-width: 0; flex: 1; }
      .social-comment-meta { display: flex; justify-content: space-between; color: var(--muted); font-size: 12px; margin-bottom: 4px; }
      .social-avatar { width: 40px; height: 40px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 13px; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 6px 14px rgba(0,0,0,0.25); flex-shrink: 0; }
      .social-avatar.social-avatar-sm { width: 30px; height: 30px; font-size: 11px; }
      .social-like-btn { position: relative; min-width: 128px; }
      .social-like-btn.liked { border-color: rgba(255, 154, 198, 0.85); background: linear-gradient(135deg, rgba(255, 94, 162, 0.4), rgba(255, 136, 110, 0.36)); }
      .social-like-btn .heart { display: inline-block; transform-origin: center; }
      .social-like-btn.liked .heart { animation: socialHeartBeat .35s ease; }
      @keyframes socialHeartBeat {
        0% { transform: scale(1); }
        35% { transform: scale(1.35); }
        100% { transform: scale(1); }
      }
      .social-pin-btn.pinned { border-color: rgba(255, 209, 102, 0.9); background: rgba(255, 209, 102, 0.22); color: #ffe8a6; }
      .social-post-pin { font-size: 12px; color: #ffe08f; padding: 4px 8px; border-radius: 999px; border: 1px solid rgba(255, 209, 102, 0.4); background: rgba(255, 209, 102, 0.12); margin-bottom: 8px; display: inline-flex; }
      .social-reactions { display: flex; flex-wrap: wrap; gap: 6px; }
      .social-reaction-btn { display: inline-flex; align-items: center; gap: 4px; border: 1px solid rgba(188,166,242,0.45); background: rgba(128,101,196,0.12); color: #f2ebff; border-radius: 999px; padding: 5px 10px; cursor: pointer; transition: transform .2s ease, border-color .2s ease, background .2s ease; }
      .social-reaction-btn:hover { transform: translateY(-1px); border-color: rgba(208,183,255,0.95); background: rgba(138,108,214,0.3); }
      .social-reaction-btn.active { border-color: rgba(63,224,197,0.85); background: rgba(63,224,197,0.2); color: #d8fff5; }
      .social-reaction-count { font-size: 12px; opacity: .9; }
      .social-toast-wrap { position: fixed; right: 18px; bottom: 18px; z-index: 1200; display: grid; gap: 8px; pointer-events: none; }
      .social-toast { background: linear-gradient(135deg, rgba(61, 45, 113, 0.95), rgba(33, 26, 71, 0.95)); border: 1px solid rgba(195, 172, 255, 0.6); color: #f4ecff; border-radius: 12px; padding: 10px 12px; min-width: 230px; box-shadow: 0 14px 26px rgba(10, 8, 20, 0.45); animation: socialToastIn .25s ease; }
      @keyframes socialToastIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      .social-skeleton-card { border-radius: 16px; border: 1px solid rgba(171,148,230,0.25); padding: 14px; background: rgba(147,126,214,0.08); }
      .social-skeleton-line { height: 12px; border-radius: 8px; background: linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.22), rgba(255,255,255,0.08)); background-size: 180% 100%; animation: socialShimmer 1.1s infinite linear; }
      .social-skeleton-line + .social-skeleton-line { margin-top: 8px; }
      .social-skeleton-head { height: 40px; width: 60%; margin-bottom: 12px; }
      .social-skeleton-content { width: 95%; }
      .social-skeleton-content.short { width: 68%; }
      @keyframes socialShimmer { from { background-position: 180% 0; } to { background-position: -20% 0; } }
      .social-empty { color: var(--muted); text-align: center; padding: 10px; border: 1px dashed rgba(255,255,255,0.12); border-radius: 10px; }
      @media (max-width: 680px) {
        .social-toolbar { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  },

  getFilteredPosts(posts) {
    const query = this.uiState.query.trim().toLowerCase();
    const sorted = [...posts];
    if (this.uiState.sort === "popular") {
      sorted.sort(
        (a, b) =>
          (b.likes?.length || 0) +
          (b.comments?.length || 0) -
          ((a.likes?.length || 0) + (a.comments?.length || 0))
      );
    } else {
      sorted.sort((a, b) => b.createdAt - a.createdAt);
    }

    sorted.sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));

    if (!query) return sorted;
    return sorted.filter((post) => {
      const inPost =
        String(post.author || "")
          .toLowerCase()
          .includes(query) ||
        String(post.content || "")
          .toLowerCase()
          .includes(query);
      const inComments = (post.comments || []).some(
        (comment) =>
          String(comment.author || "")
            .toLowerCase()
            .includes(query) ||
          String(comment.text || "")
            .toLowerCase()
            .includes(query)
      );
      return inPost || inComments;
    });
  },

  getAuthorStats(posts) {
    return posts.reduce((acc, post) => {
      const author = post.author || "Неизвестно";
      if (!acc[author]) {
        acc[author] = { posts: 0, likes: 0, comments: 0 };
      }
      acc[author].posts += 1;
      acc[author].likes += post.likes?.length || 0;
      acc[author].comments += post.comments?.length || 0;
      return acc;
    }, {});
  },

  getFollowedUsers() {
    const me = window.AppAuth?.user?.username || "";
    if (!me) {
      try {
        const list = JSON.parse(localStorage.getItem(this.followsKey)) || [];
        return Array.isArray(list) ? list : [];
      } catch (_e) {
        return [];
      }
    }
    this.migrateFollowEdgesIfNeeded();
    const fromEdges = this.getFollowEdges()
      .filter((e) => e.follower === me)
      .map((e) => e.followee)
      .filter(Boolean);
    if (fromEdges.length) return [...new Set(fromEdges)];
    try {
      const list = JSON.parse(localStorage.getItem(this.followsKey)) || [];
      return Array.isArray(list) ? list : [];
    } catch (_e) {
      return [];
    }
  },

  setFollowedUsers(list) {
    const me = window.AppAuth?.user?.username || "";
    localStorage.setItem(this.followsKey, JSON.stringify(list));
    if (!me) return;
    const others = this.getFollowEdges().filter((e) => e.follower !== me);
    const next = [
      ...others,
      ...list.map((followee) => ({ follower: me, followee })),
    ];
    this.setFollowEdges(next);
  },

  getPeople(posts) {
    const users = new Set();
    posts.forEach((post) => {
      if (post.author) users.add(post.author);
      (post.comments || []).forEach((comment) => {
        if (comment.author) users.add(comment.author);
      });
    });
    users.delete(this.currentUser);
    return Array.from(users).sort((a, b) => a.localeCompare(b, "ru"));
  },

  getAuthorBadge(author, statsMap) {
    const stats = statsMap[author];
    if (!stats) return "Новый участник";
    const score = stats.posts * 2 + stats.likes + stats.comments;
    if (score >= 10) return "Топ недели";
    if (score >= 5) return "Активный";
    return "В команде";
  },

  renderPeopleList(root, posts) {
    const followed = this.getFollowedUsers();
    const peopleQuery = String(root.querySelector("#socialPeopleSearch")?.value || "")
      .trim()
      .toLowerCase();
    const peopleHtml = this.getPeople(posts)
      .filter((name) => !peopleQuery || name.toLowerCase().includes(peopleQuery))
      .map(
        (name) => `
          <div class="social-comment" style="align-items:center;">
            ${this.renderAvatar(name, "social-avatar-sm")}
            <div class="social-comment-body">
              <div style="font-weight:600;">${this.escapeHtml(name)}</div>
            </div>
            <button class="social-btn" data-action="follow" data-user="${this.escapeHtml(name)}">
              ${followed.includes(name) ? "Подписка ✓" : "Подписаться"}
            </button>
          </div>
        `
      )
      .join("");
    const peopleMount = root.querySelector("#socialPeopleList");
    if (peopleMount) {
      peopleMount.innerHTML =
        peopleHtml || '<div class="social-empty">Никого не найдено</div>';
    }
  },

  renderFeed(root, posts) {
    const feed = root.querySelector("#socialFeed");
    if (!feed) return;
    const statsMap = this.getAuthorStats(posts);
    if (this.uiState.isLoading) {
      feed.innerHTML = `
        <div class="social-skeleton-card">
          <div class="social-skeleton-line social-skeleton-head"></div>
          <div class="social-skeleton-line social-skeleton-content"></div>
          <div class="social-skeleton-line social-skeleton-content short"></div>
        </div>
        <div class="social-skeleton-card">
          <div class="social-skeleton-line social-skeleton-head"></div>
          <div class="social-skeleton-line social-skeleton-content"></div>
          <div class="social-skeleton-line social-skeleton-content short"></div>
        </div>
      `;
      return;
    }

    if (!posts.length) {
      feed.innerHTML = '<div class="social-empty">В ленте пока нет постов</div>';
      return;
    }

    feed.innerHTML = this.getFilteredPosts(posts)
      .map((post) => {
        const likedByMe = Array.isArray(post.likes)
          ? post.likes.includes(this.currentUser)
          : false;
        const comments = Array.isArray(post.comments) ? post.comments : [];
        const reactionMap = this.normalizeReactions(post.reactions, post.likes);
        const reactionButtons = ["❤️", "🔥", "💪", "👎"]
          .map((emoji) => {
            const users = reactionMap[emoji] || [];
            const isMine = users.includes(this.currentUser);
            return `
              <button
                class="social-reaction-btn ${isMine ? "active" : ""}"
                data-action="react"
                data-emoji="${emoji}"
                data-post-id="${this.escapeHtml(post.id)}"
                title="${isMine ? "Убрать реакцию" : "Поставить реакцию"}"
              >
                <span>${emoji}</span>
                <span class="social-reaction-count">${users.length}</span>
              </button>
            `;
          })
          .join("");
        return `
          <article class="social-post ${
            this.uiState.highlightPostId === post.id ? "social-post-new" : ""
          }" data-post-id="${this.escapeHtml(post.id)}">
            ${
              post.pinned
                ? '<div class="social-post-pin">📌 Закрепленный пост</div>'
                : ""
            }
            <div class="social-post-head">
              <div class="social-post-main">
                ${this.renderAvatar(post.author, "", post.authorAvatar)}
                <div class="social-author-wrap">
                  <div class="social-author">${this.escapeHtml(post.author)}</div>
                  <div class="social-role">
                    <span>Участник сообщества</span>
                    <span class="social-badge">${this.getAuthorBadge(
                      post.author,
                      statsMap
                    )}</span>
                  </div>
                </div>
              </div>
              <div class="social-date">${this.formatDate(post.createdAt)}</div>
            </div>
            <p class="social-content">${this.escapeHtml(post.content)}</p>
            <div class="social-actions">
              <button class="social-btn social-like-btn ${
                likedByMe ? "liked" : ""
              }" data-action="like" data-post-id="${this.escapeHtml(
                post.id
              )}">
                <span class="heart">${likedByMe ? "❤️" : "🤍"}</span>
                <span>${likedByMe ? "Нравится" : "Лайк"}</span>
              </button>
              <button class="social-btn social-pin-btn ${
                post.pinned ? "pinned" : ""
              }" data-action="pin" data-post-id="${this.escapeHtml(post.id)}">
                ${post.pinned ? "Открепить" : "Закрепить"}
              </button>
              <div class="social-reactions">${reactionButtons}</div>
              <span class="social-count">Лайки: ${post.likes?.length || 0}</span>
              <span class="social-count">Комментарии: ${comments.length}</span>
            </div>
            <form class="social-comment-form" data-action="comment-form" data-post-id="${this.escapeHtml(
              post.id
            )}">
              <input type="text" name="comment" maxlength="240" placeholder="Напишите комментарий..." />
              <button class="social-btn" type="submit">Комментировать</button>
            </form>
            <div class="social-comments">
              ${
                comments.length
                  ? comments
                      .map(
                        (comment) => `
                    <div class="social-comment">
                      ${this.renderAvatar(comment.author, "social-avatar-sm", comment.authorAvatar)}
                      <div class="social-comment-body">
                        <div class="social-comment-meta">
                          <span>${this.escapeHtml(comment.author)}</span>
                          <span>${this.formatDate(comment.createdAt)}</span>
                        </div>
                        <div>${this.escapeHtml(comment.text)}</div>
                      </div>
                    </div>
                  `
                      )
                      .join("")
                  : '<div class="social-empty">Пока нет комментариев</div>'
              }
            </div>
          </article>
        `;
      })
      .join("");
  },

  bindEvents(root) {
    if (root.__socialBound) return;
    root.__socialBound = true;

    const submitPost = root.querySelector("#socialSubmitPost");
    const postInput = root.querySelector("#socialPostText");
    const postCounter = root.querySelector("#socialPostCounter");
    const searchInput = root.querySelector("#socialSearch");
    const sortSelect = root.querySelector("#socialSort");

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        this.uiState.query = searchInput.value || "";
        this.renderFeed(root, this.loadPosts());
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener("change", () => {
        this.uiState.sort = sortSelect.value || "new";
        this.renderFeed(root, this.loadPosts());
      });
    }

    if (postInput && postCounter) {
      const updateCounter = () => {
        const max = 1200;
        const current = postInput.value.length;
        postCounter.textContent = `${current}/${max}`;
        postCounter.classList.toggle("limit-near", current > max * 0.85);
      };
      updateCounter();
      postInput.addEventListener("input", updateCounter);
    }

    if (submitPost && postInput) {
      submitPost.addEventListener("click", () => {
        (async () => {
          const content = postInput.value.trim();
          if (!content) return;
          const result = await this.api("/api/social/posts", {
            method: "POST",
            body: JSON.stringify({ content }),
          });
          const newId = result?.id || "";
          this.uiState.highlightPostId = newId;
          postInput.value = "";
          const posts = await this.loadPostsRemote();
          this.renderFeed(root, posts);
          this.showToast("Пост опубликован");
          setTimeout(() => {
            this.uiState.highlightPostId = "";
          }, 700);
        })().catch((e) => this.showToast(e.message || "Ошибка"));
      });
    }

    root.addEventListener("click", (event) => {
      const button = event.target.closest('button[data-action="like"]');
      if (!button) return;
      const postId = button.getAttribute("data-post-id");
      (async () => {
        if (!postId) return;
        await this.api(`/api/social/posts/${encodeURIComponent(postId)}/like`, {
          method: "POST",
        });
        const posts = await this.loadPostsRemote();
        this.renderFeed(root, posts);
      })().catch((e) => this.showToast(e.message || "Ошибка"));
    });

    root.addEventListener("click", (event) => {
      const button = event.target.closest('button[data-action="follow"]');
      if (!button) return;
      const username = button.getAttribute("data-user");
      if (!username) return;
      const followed = this.getFollowedUsers();
      const exists = followed.includes(username);
      const next = exists
        ? followed.filter((name) => name !== username)
        : [...followed, username];
      this.setFollowedUsers(next);
      this.render(root.id);
      this.showToast(exists ? `Отписка: ${username}` : `Подписка: ${username}`);
    });

    root.addEventListener("click", (event) => {
      const button = event.target.closest('button[data-action="react"]');
      if (!button) return;
      const postId = button.getAttribute("data-post-id");
      const emoji = button.getAttribute("data-emoji");
      if (!postId || !emoji) return;
      (async () => {
        await this.api(`/api/social/posts/${encodeURIComponent(postId)}/react`, {
          method: "POST",
          body: JSON.stringify({ emoji }),
        });
        const posts = await this.loadPostsRemote();
        this.renderFeed(root, posts);
      })().catch((e) => this.showToast(e.message || "Ошибка"));
    });

    root.addEventListener("click", (event) => {
      const button = event.target.closest('button[data-action="pin"]');
      if (!button) return;
      const postId = button.getAttribute("data-post-id");
      (async () => {
        if (!postId) return;
        await this.api(`/api/social/posts/${encodeURIComponent(postId)}/pin`, {
          method: "POST",
        });
        const posts = await this.loadPostsRemote();
        this.renderFeed(root, posts);
      })().catch((e) => this.showToast(e.message || "Ошибка"));
    });

    root.addEventListener("submit", (event) => {
      const form = event.target.closest('form[data-action="comment-form"]');
      if (!form) return;
      event.preventDefault();
      const postId = form.getAttribute("data-post-id");
      const input = form.querySelector('input[name="comment"]');
      const text = (input?.value || "").trim();
      if (!postId || !text) return;

      (async () => {
        await this.api(`/api/social/posts/${encodeURIComponent(postId)}/comments`, {
          method: "POST",
          body: JSON.stringify({ text }),
        });
        if (input) input.value = "";
        const posts = await this.loadPostsRemote();
        this.renderFeed(root, posts);
        this.showToast("Комментарий добавлен");
      })().catch((e) => this.showToast(e.message || "Ошибка"));
    });
  },

  ensureToastContainer() {
    let wrap = document.getElementById("socialToastWrap");
    if (wrap) return wrap;
    wrap = document.createElement("div");
    wrap.id = "socialToastWrap";
    wrap.className = "social-toast-wrap";
    document.body.appendChild(wrap);
    return wrap;
  },

  showToast(message) {
    const wrap = this.ensureToastContainer();
    const toast = document.createElement("div");
    toast.className = "social-toast";
    toast.textContent = message;
    wrap.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      toast.style.transition = "opacity .2s ease, transform .2s ease";
      setTimeout(() => toast.remove(), 240);
    }, 1700);
  },

  render(mountId) {
    const root = document.getElementById(mountId);
    if (!root) return;
    this.currentUser = window.AppAuth?.user?.username || "Вы";
    this.ensureStyles();

    root.innerHTML = `
      <div class="social-wrap">
        <div class="social-composer">
          <h1 class="social-title">Сообщество</h1>
          <p class="social-subtitle">Публикуйте посты, лайкайте и комментируйте записи других участников.</p>
          <div class="social-toolbar">
            <input id="socialSearch" class="social-search" type="text" placeholder="Поиск по авторам, постам и комментариям..." />
            <select id="socialSort" class="social-select">
              <option value="new">Сначала новые</option>
              <option value="popular">Сначала популярные</option>
            </select>
          </div>
          <textarea id="socialPostText" maxlength="1200" placeholder="Что нового у вас сегодня?"></textarea>
          <div class="social-row">
            <span class="social-count">Пользователь: ${this.currentUser}</span>
            <span id="socialPostCounter" class="social-counter">0/1200</span>
            <button id="socialSubmitPost" class="social-btn">Опубликовать</button>
          </div>
        </div>
        <div id="socialFeed" class="social-feed"></div>
      </div>
    `;

    const searchInput = root.querySelector("#socialSearch");
    const sortSelect = root.querySelector("#socialSort");
    if (searchInput) searchInput.value = this.uiState.query;
    if (sortSelect) sortSelect.value = this.uiState.sort;

    this.uiState.isLoading = true;
    const currentPosts = this.cache.posts || [];
    this.renderFeed(root, currentPosts);
    this.bindEvents(root);
    (async () => {
      const posts = await this.loadPostsRemote();
      this.uiState.isLoading = false;
      this.renderFeed(root, posts);
    })().catch((_e) => {
      this.uiState.isLoading = false;
      this.renderFeed(root, []);
      this.showToast("Не удалось загрузить ленту");
    });
  },
};
