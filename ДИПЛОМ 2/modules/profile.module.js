window.AppModules = window.AppModules || {};

window.AppModules.profile = {
  visualStorageKey: "profileVisualByUser_v1",

  escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  },

  ensureStyles() {
    document.getElementById("profile-module-styles")?.remove();
    document.getElementById("profile-module-styles-v2")?.remove();
    document.getElementById("profile-module-styles-v3")?.remove();
    document.getElementById("profile-module-styles-v4")?.remove();
    document.getElementById("profile-module-styles-v5")?.remove();
    if (document.getElementById("profile-module-styles-v6")) return;
    const style = document.createElement("style");
    style.id = "profile-module-styles-v6";
    style.textContent = `
      .profile-wrap { max-width: 980px; margin: 0 auto; display: grid; gap: 14px; }
      .profile-card { background: linear-gradient(160deg, rgba(147,126,214,0.16), rgba(84,73,150,0.1)); border: 1px solid rgba(171,148,230,0.35); border-radius: 16px; padding: 16px; }
      .profile-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
      .profile-grid .full { grid-column: 1 / -1; }
      .profile-field { display: grid; gap: 6px; }
      .profile-field label { font-size: 12px; color: var(--muted); }
      .profile-actions { display: flex; justify-content: flex-end; margin-top: 8px; }
      .profile-hero { position: relative; overflow: hidden; min-height: 240px; background: linear-gradient(135deg, #3a2b66, #1c2e4e); }
      .profile-bg { position: absolute; inset: 0; opacity: .45; background-size: cover; background-position: center; }
      .profile-overlay { position: absolute; inset: 0; background: radial-gradient(circle at 20% 20%, rgba(255,255,255,.2), transparent 38%); }
      .profile-emoji-layer { position: absolute; inset: 0; pointer-events:none; z-index: 0; }
      .profile-emoji {
        position: absolute;
        font-size: 30px;
        opacity: 0.62;
        filter: blur(0.1px) drop-shadow(0 10px 18px rgba(0,0,0,.2));
        transform: translate(-50%, -50%);
        will-change: transform;
      }
      .profile-hero-content { position: relative; z-index: 1; display:flex; gap:14px; align-items:flex-end; padding: 14px; border-radius: 14px; background: rgba(10, 7, 20, 0.28); backdrop-filter: blur(6px); border: 1px solid rgba(255,255,255,0.08); }
      .profile-avatar-lg { width: 96px; height:96px; border-radius:50%; border:3px solid rgba(255,255,255,.65); background:rgba(255,255,255,.15); object-fit:cover; }
      .profile-avatar-fallback { width: 96px; height:96px; border-radius:50%; border:3px solid rgba(255,255,255,.65); display:grid;place-items:center;font-size:34px;background:linear-gradient(135deg,#7c5cff,#45d4c6); }
      .profile-main-title { margin:0; font-size:28px; color:#fff; }
      .profile-main-sub { margin:4px 0 0; color:#e8dcff; }
      .profile-pills { display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; }
      .profile-pill { border:1px solid rgba(255,255,255,.35); border-radius:999px; padding:6px 10px; color:#f6eeff; background:rgba(255,255,255,.1); font-size:12px; }
      .profile-edit-wrap { display:none; }
      .profile-edit-wrap.open { display:block; }
      .profile-status-dot { width:10px;height:10px;border-radius:50%;background:#5dffb0;box-shadow:0 0 12px rgba(93,255,176,0.65);display:inline-block;margin-right:8px;vertical-align:middle; }
      .profile-settings-actions { display:flex; flex-wrap:wrap; gap:10px; align-items:center; }
      .profile-theme-btn, .profile-logout-btn { border-radius:12px; padding:10px 16px; font-weight:600; cursor:pointer; font-size:14px; transition: transform 0.15s ease, box-shadow 0.2s ease, border-color 0.2s ease; border:1px solid rgba(194,168,250,0.5); }
      .profile-theme-btn { background: linear-gradient(135deg, rgba(117, 91, 197, 0.45), rgba(74, 206, 184, 0.28)); color:#f4ecff; }
      .profile-theme-btn:hover { border-color: rgba(235,225,255,0.85); box-shadow: 0 8px 20px rgba(20, 12, 42, 0.35); }
      .profile-logout-btn { background: rgba(180, 60, 90, 0.22); color:#ffd6de; border-color: rgba(255, 150, 170, 0.45); }
      .profile-logout-btn:hover { background: rgba(200, 70, 100, 0.32); border-color: rgba(255, 190, 200, 0.65); }
      body.light-theme .profile-hero-content { background: rgba(248, 250, 252, 0.7); border-color: rgba(60, 81, 114, 0.12); }
      body.light-theme .profile-theme-btn { color: #1e2a3d; border-color: rgba(60, 81, 114, 0.22); background: linear-gradient(135deg, rgba(230, 236, 255, 0.95), rgba(200, 230, 255, 0.65)); }
      body.light-theme .profile-logout-btn { color: #7a1e2e; border-color: rgba(200, 100, 120, 0.35); background: rgba(255, 220, 228, 0.75); }
      .profile-appearance-card {
        border-radius: 18px;
        padding: 0;
        overflow: hidden;
        border: 1px solid rgba(171,148,230,0.45);
        background: linear-gradient(145deg, rgba(52, 38, 98, 0.55), rgba(24, 18, 48, 0.92));
        box-shadow: 0 16px 40px rgba(12, 8, 28, 0.45);
      }
      .profile-appearance-head {
        width: 100%;
        border: none;
        background: rgba(255,255,255,0.04);
        color: #f4ecff;
        padding: 16px 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        cursor: pointer;
        font-size: 17px;
        font-weight: 700;
        text-align: left;
        border-radius: 0;
        box-shadow: none;
        transition: background 0.32s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.35s ease, border-color 0.25s ease;
      }
      .profile-wrap button.profile-appearance-head:hover {
        transform: none;
        filter: none;
        background: rgba(255,255,255,0.09);
        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
      }
      .profile-wrap button.profile-appearance-head:active {
        transform: scale(0.998);
        box-shadow: inset 0 2px 8px rgba(0,0,0,0.15);
      }
      .profile-appearance-chev {
        font-size: 12px;
        color: #cbb8f0;
        width: 32px;
        height: 32px;
        border-radius: 10px;
        display: grid;
        place-items: center;
        background: rgba(0,0,0,0.2);
        border: 1px solid rgba(255,255,255,0.1);
        transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1), background 0.25s ease, color 0.2s ease;
      }
      .profile-appearance-card.is-open .profile-appearance-chev { transform: rotate(90deg); background: rgba(124, 92, 255, 0.28); color: #fff; }
      .profile-appearance-body {
        display: grid;
        grid-template-rows: minmax(0, 0fr);
        border-top: none;
        margin: 0;
        padding: 0;
        overflow: hidden;
        overflow: clip;
        contain: paint;
        pointer-events: none;
        transition: grid-template-rows 0.4s cubic-bezier(0.25, 0.85, 0.35, 1);
      }
      .profile-appearance-card.is-open .profile-appearance-body {
        grid-template-rows: minmax(0, 1fr);
        border-top: 1px solid rgba(255,255,255,0.08);
        pointer-events: auto;
      }
      .profile-appearance-slide {
        min-height: 0;
        max-height: 100%;
        overflow: hidden;
        overflow: clip;
        box-sizing: border-box;
        padding: 0 18px;
        contain: paint;
      }
      .profile-appearance-card.is-open .profile-appearance-slide {
        padding: 14px 18px 18px;
      }
      .profile-appearance-intro {
        margin-top: 0;
        padding: 14px 16px;
        border-radius: 14px;
        background: rgba(0,0,0,0.2);
        border: 1px solid rgba(255,255,255,0.08);
        display: grid;
        gap: 8px;
      }
      .profile-appearance-intro strong {
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #c4b5fd;
      }
      .profile-appearance-intro span { font-size: 14px; line-height: 1.55; color: #d8cbf3; }
      .profile-upload-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 14px;
        margin-top: 16px;
      }
      .profile-upload-cell { display: grid; gap: 8px; min-width: 0; }
      .profile-upload-label { font-size: 12px; font-weight: 700; color: #cbb8e8; letter-spacing: 0.02em; }
      .profile-upload-box {
        border-radius: 14px;
        border: 1px dashed rgba(200, 175, 255, 0.42);
        background: rgba(0,0,0,0.16);
        padding: 12px 14px;
        transition: border-color 0.28s ease, background 0.28s ease, box-shadow 0.3s ease;
      }
      .profile-upload-box:focus-within {
        border-color: rgba(180, 154, 255, 0.75);
        background: rgba(124, 92, 255, 0.12);
        box-shadow: 0 0 0 2px rgba(124, 92, 255, 0.2);
      }
      .profile-file-input {
        width: 100%;
        font-size: 13px;
        color: #e8dcff;
        cursor: pointer;
      }
      .profile-upload-photo-row { display: grid; grid-template-columns: 54px 1fr; gap: 12px; align-items: center; }
      .profile-upload-thumb {
        width: 54px;
        height: 54px;
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.08);
        overflow: hidden;
        display: grid;
        place-items: center;
        box-shadow: 0 10px 22px rgba(0,0,0,0.18);
      }
      .profile-upload-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .profile-upload-thumb span { font-size: 22px; font-weight: 800; color: #fff; }
      .profile-upload-meta { min-width: 0; display: grid; gap: 2px; }
      .profile-upload-meta strong { font-size: 14px; color: #f4ecff; line-height: 1.25; }
      .profile-upload-hint { font-size: 12px; color: rgba(216, 203, 243, 0.8); line-height: 1.35; }
      .profile-file-input::file-selector-button,
      .profile-file-input::-webkit-file-upload-button {
        margin-right: 14px;
        padding: 10px 16px;
        border-radius: 11px;
        border: 1px solid rgba(185, 160, 245, 0.5);
        background: linear-gradient(135deg, rgba(124, 92, 255, 0.4), rgba(58, 184, 154, 0.22));
        color: #fff;
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
        transition: filter 0.22s ease, border-color 0.22s ease;
      }
      .profile-file-input::file-selector-button:hover,
      .profile-file-input::-webkit-file-upload-button:hover {
        filter: brightness(1.06);
        border-color: rgba(220, 200, 255, 0.75);
      }
      .profile-emoji-field { margin-top: 14px; }
      .profile-select-soft {
        width: 100%;
        border-radius: 12px;
        border: 1px solid rgba(194, 168, 250, 0.35);
        background: rgba(12, 8, 28, 0.45);
        color: #f4ecff;
        padding: 12px 14px;
        font-size: 14px;
        cursor: pointer;
      }
      .profile-sf-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
      .profile-sf-btn {
        flex: 1;
        min-width: 0;
        border-radius: 14px;
        border: 1px solid rgba(200, 175, 255, 0.35);
        background: rgba(255,255,255,0.05);
        color: #efe8ff;
        padding: 12px 16px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.28s ease, border-color 0.25s ease, transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.28s ease;
      }
      .profile-wrap button.profile-sf-btn:hover {
        transform: translateY(-1px) scale(1.01);
        filter: none;
        background: rgba(255,255,255,0.1);
        border-color: rgba(220, 200, 255, 0.55);
        box-shadow: 0 6px 18px rgba(0,0,0,0.18);
      }
      .profile-wrap button.profile-sf-btn:active { transform: translateY(0) scale(0.995); }
      .profile-modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 4000;
        background: rgba(8, 6, 18, 0.72);
        backdrop-filter: blur(6px);
        display: none;
        align-items: center;
        justify-content: center;
        padding: 16px;
      }
      .profile-modal-overlay.is-on { display: flex; }
      .profile-modal {
        width: min(420px, 94vw);
        max-height: min(72vh, 520px);
        overflow: auto;
        border-radius: 16px;
        border: 1px solid rgba(194,168,250,0.5);
        background: rgba(28, 22, 52, 0.98);
        padding: 16px 18px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.45);
      }
      .profile-modal h3 { margin: 0 0 10px 0; font-size: 18px; color: #f4ecff; }
      .profile-modal-close {
        float: right;
        border: none;
        background: rgba(255,255,255,0.08);
        color: #e8dcff;
        width: 32px;
        height: 32px;
        border-radius: 10px;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
      }
      .profile-modal-close:hover { background: rgba(255,255,255,0.14); }
      .profile-modal-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
      .profile-modal-list li {
        padding: 10px 12px;
        border-radius: 10px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(180,160,235,0.2);
        color: #efe8ff;
        font-size: 15px;
      }
      .profile-main-fields { margin-top: 12px; display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px; }
      .profile-main-fields .full { grid-column: 1 / -1; }
      .profile-main-fields input:disabled { opacity: 0.85; cursor: default; }
      .profile-primary-save {
        margin-top: 16px;
        width: 100%;
        border: none;
        border-radius: 14px;
        padding: 14px 18px;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        color: #fff;
        background: linear-gradient(135deg, #7c5cff, #3ab89a);
        box-shadow: 0 8px 22px rgba(60, 40, 120, 0.4);
        transition: filter 0.28s ease, box-shadow 0.3s ease;
      }
      .profile-wrap button.profile-primary-save:hover {
        transform: none;
        filter: brightness(1.05);
        box-shadow: 0 10px 26px rgba(60, 40, 120, 0.48);
      }
      .profile-wrap button.profile-primary-save:active {
        transform: scale(0.995);
        filter: brightness(0.98);
      }
      button.profile-modal-close:hover {
        transform: none;
        filter: brightness(1.08);
      }
      .profile-wrap button.profile-theme-btn:hover,
      .profile-wrap button.profile-logout-btn:hover {
        transform: translateY(-1px) scale(1.01);
        filter: none;
      }
      .profile-wrap button.profile-theme-btn:active,
      .profile-wrap button.profile-logout-btn:active {
        transform: translateY(0) scale(0.99);
      }
      body.light-theme .profile-appearance-card {
        background: linear-gradient(180deg, #ffffff, #f3f6ff);
        border-color: rgba(60, 81, 114, 0.16);
        box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
      }
      body.light-theme .profile-appearance-head { color: #1e293b; background: rgba(248, 250, 252, 0.9); }
      body.light-theme .profile-wrap button.profile-appearance-head:hover {
        background: #f8fafc;
        box-shadow: inset 0 0 0 1px rgba(60, 81, 114, 0.1);
      }
      body.light-theme .profile-appearance-chev { color: #64748b; background: #fff; border-color: rgba(60, 81, 114, 0.14); }
      body.light-theme .profile-appearance-card.is-open .profile-appearance-chev { background: #e0e7ff; color: #3730a3; }
      body.light-theme .profile-appearance-card.is-open .profile-appearance-body {
        border-top-color: rgba(60, 81, 114, 0.12);
      }
      body.light-theme .profile-appearance-intro { background: #f8fafc; border-color: rgba(60, 81, 114, 0.12); }
      body.light-theme .profile-appearance-intro strong { color: #4f46e5; }
      body.light-theme .profile-appearance-intro span { color: #475569; }
      body.light-theme .profile-upload-box { background: #fff; border-color: rgba(99, 102, 241, 0.35); }
      body.light-theme .profile-upload-thumb { background: #f8fafc; border-color: rgba(60, 81, 114, 0.14); box-shadow: 0 10px 22px rgba(15, 23, 42, 0.1); }
      body.light-theme .profile-upload-meta strong { color: #0f172a; }
      body.light-theme .profile-upload-hint { color: #64748b; }
      body.light-theme .profile-file-input { color: #334155; }
      body.light-theme .profile-select-soft { background: #fff; color: #0f172a; border-color: rgba(60, 81, 114, 0.18); }
      body.light-theme .profile-sf-btn { color: #1e293b; background: #fff; border-color: rgba(60, 81, 114, 0.16); }
      body.light-theme .profile-wrap button.profile-sf-btn:hover {
        background: #f8fafc;
        border-color: rgba(99, 102, 241, 0.35);
        box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
      }
      body.light-theme .profile-modal { background: #fff; color: #1e293b; border-color: rgba(60, 81, 114, 0.18); }
      body.light-theme .profile-modal h3 { color: #0f172a; }
      body.light-theme .profile-modal-list li { background: #f8fafc; color: #334155; border-color: rgba(60, 81, 114, 0.12); }
      @media (max-width: 780px) {
        .profile-grid { grid-template-columns: 1fr; }
        .profile-main-fields { grid-template-columns: 1fr; }
        .profile-upload-grid { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  },

  readVisuals() {
    try {
      const parsed = JSON.parse(localStorage.getItem(this.visualStorageKey));
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_e) {
      return {};
    }
  },

  saveVisualForUser(username, payload) {
    if (!username) return;
    const all = this.readVisuals();
    all[username] = { ...(all[username] || {}), ...payload };
    localStorage.setItem(this.visualStorageKey, JSON.stringify(all));
  },

  getVisualForUser(username) {
    const all = this.readVisuals();
    return all[username] || {};
  },

  getInputValue(root, id) {
    return String(root.querySelector(`#${id}`)?.value || "").trim();
  },

  async saveProfile(root) {
    if (!window.AppAuth?.updateProfile) return;
    const base = window.AppAuth.profile || {};
    const payload = {
      ...base,
      firstName: this.getInputValue(root, "profileFirstName"),
      lastName: this.getInputValue(root, "profileLastName"),
      phone: this.getInputValue(root, "profilePhone"),
    };
    const msg = root.querySelector("#profileMessage");
    try {
      await window.AppAuth.updateProfile(payload);
      if (msg) msg.textContent = "Профиль сохранен";
    } catch (err) {
      if (msg) msg.textContent = err.message || "Ошибка сохранения";
    }
  },

  render(mountId) {
    const root = document.getElementById(mountId);
    if (!root) return;
    this.ensureStyles();
    const p = window.AppAuth?.profile || {};
    const username = window.AppAuth?.user?.username || "";
    const visuals = this.getVisualForUser(username);
    const emojis = Array.isArray(visuals.emojis) ? visuals.emojis : ["💪", "🔥"];
    const avatarSrc = visuals.photo || p.avatarPhoto || "";
    window.AppModules?.social?.migrateFollowEdgesIfNeeded?.();
    const subsList = window.AppModules?.social?.getFollowedUsers?.() || [];
    const fansList = window.AppModules?.social?.getFollowersOf?.(username) || [];
    const nick = username || "Пользователь";
    const badge = p.fitnessGoal || "На пути к цели";
    const emojiSlots = [
      // top band
      { x: 8, y: 16 }, { x: 18, y: 12 }, { x: 30, y: 18 }, { x: 42, y: 12 }, { x: 54, y: 18 }, { x: 66, y: 12 }, { x: 78, y: 18 }, { x: 92, y: 22 },
      // mid band
      { x: 10, y: 36 }, { x: 22, y: 44 }, { x: 34, y: 36 }, { x: 46, y: 46 }, { x: 58, y: 36 }, { x: 70, y: 46 }, { x: 82, y: 36 }, { x: 94, y: 44 },
      // lower band
      { x: 8, y: 62 }, { x: 20, y: 68 }, { x: 32, y: 60 }, { x: 44, y: 70 }, { x: 56, y: 60 }, { x: 68, y: 70 }, { x: 80, y: 60 }, { x: 92, y: 68 },
      // bottom band
      { x: 12, y: 84 }, { x: 30, y: 86 }, { x: 50, y: 84 }, { x: 70, y: 86 }, { x: 88, y: 84 },
    ];
    root.innerHTML = `
      <div class="profile-wrap">
        <section class="profile-card profile-hero">
          <div class="profile-bg" style="${visuals.background ? `background-image:url('${visuals.background}');` : ""}"></div>
          <div class="profile-overlay"></div>
          <div class="profile-emoji-layer">
            ${emojiSlots
              .map((pos, index) => {
                const emoji = emojis.length ? emojis[index % emojis.length] : "✨";
                return `<span class="profile-emoji" style="left:${pos.x}%;top:${pos.y}%;">${emoji}</span>`;
              })
              .join("")}
          </div>
          <div class="profile-hero-content">
            ${
              avatarSrc
                ? `<img class="profile-avatar-lg" src="${avatarSrc}" alt="avatar" />`
                : `<div class="profile-avatar-fallback">👤</div>`
            }
            <div>
              <h1 class="profile-main-title">${nick}</h1>
              <p class="profile-main-sub"><span class="profile-status-dot" aria-hidden="true"></span>Личный канал · фото и оформление видны в соцсети</p>
              <div class="profile-pills">
                <span class="profile-pill">${badge}</span>
                <span class="profile-pill">Чекин: ${window.AppModules?.psychology?.getCheckinStreak?.() || 0} дн. подряд</span>
                <span class="profile-pill">Уровень активности: ${p.activityLevel === "high" ? "высокий" : p.activityLevel === "medium" ? "средний" : p.activityLevel === "low" ? "лёгкий" : "не указан"}</span>
              </div>
            </div>
          </div>
        </section>
        <section class="profile-card">
          <h2 style="margin:0 0 8px 0;">Настройки</h2>
          <p style="margin:0 0 12px 0;color:var(--muted)">Тема оформления и выход из аккаунта.</p>
          <div class="profile-settings-actions">
            <button type="button" id="themeToggle" class="profile-theme-btn" title="Сменить тему">Тёмная тема</button>
            <button type="button" id="authLogoutBtn" class="profile-logout-btn">Выйти</button>
          </div>
        </section>
        <section class="profile-card profile-appearance-card" id="profileAppearanceCard">
          <button type="button" class="profile-appearance-head" id="profileAppearanceToggle" aria-expanded="false">
            <span>Оформление и данные</span>
            <span class="profile-appearance-chev" aria-hidden="true">▸</span>
          </button>
          <div class="profile-appearance-body" id="profileAppearanceBody">
            <div class="profile-appearance-slide">
            <div class="profile-upload-grid">
              <div class="profile-upload-cell">
                <span class="profile-upload-label">Фото профиля</span>
                <div class="profile-upload-box">
                  <div class="profile-upload-photo-row">
                    <div class="profile-upload-thumb" aria-hidden="true">
                      ${
                        avatarSrc
                          ? `<img src="${avatarSrc}" alt="" />`
                          : `<span>👤</span>`
                      }
                    </div>
                    <div class="profile-upload-meta">
                      <strong>Загрузить новую аватарку</strong>
                      <div class="profile-upload-hint">JPG/PNG/WebP · лучше квадратное фото</div>
                    </div>
                  </div>
                  <input class="profile-file-input" id="profilePhotoFile" type="file" accept="image/*" />
                </div>
              </div>
            </div>
            <div class="profile-field full profile-emoji-field">
              <label>Эмодзи на фоне</label>
              <select id="profileEmojiPreset" class="profile-select-soft">
                <option value="💪,🔥,⚡,🏆,💜">Спорт</option>
                <option value="🌊,🌿,✨,🫧,🌙">Спокойствие</option>
                <option value="🎯,🚀,🧠,📈,✅">Прогресс</option>
                <option value="☕,📖,🎧,🧘,💭">Уют</option>
                <option value="🐱,🐶,💫,🎮,💬">Разное</option>
              </select>
            </div>
            <div class="profile-main-fields">
              <div class="profile-field full"><label>Логин</label><input id="profileLoginDisplay" value="${this.escapeHtml(username)}" disabled /></div>
              <div class="profile-field"><label>Фамилия</label><input id="profileLastName" value="${this.escapeHtml(p.lastName || "")}" /></div>
              <div class="profile-field"><label>Имя</label><input id="profileFirstName" value="${this.escapeHtml(p.firstName || "")}" /></div>
              <div class="profile-field full"><label>Телефон</label><input id="profilePhone" value="${this.escapeHtml(p.phone || "")}" placeholder="+7…" /></div>
            </div>
            <div class="profile-sf-row">
              <button type="button" class="profile-sf-btn" id="profileOpenSubs">Подписки · ${subsList.length}</button>
              <button type="button" class="profile-sf-btn" id="profileOpenFans">Подписчики · ${fansList.length}</button>
            </div>
            <button type="button" class="profile-primary-save" id="profileSaveBtn">Сохранить</button>
            <div id="profileMessage" class="muted small" style="margin-top:10px"></div>
            </div>
          </div>
        </section>
      </div>
      <div class="profile-modal-overlay" id="profileSubsOverlay" aria-hidden="true">
        <div class="profile-modal" role="dialog" aria-labelledby="profileSubsTitle">
          <button type="button" class="profile-modal-close" id="profileSubsClose" aria-label="Закрыть">×</button>
          <h3 id="profileSubsTitle">Мои подписки</h3>
          <ul class="profile-modal-list">${subsList.length ? subsList.map((n) => `<li>${this.escapeHtml(n)}</li>`).join("") : "<li>Вы ни на кого не подписаны</li>"}</ul>
        </div>
      </div>
      <div class="profile-modal-overlay" id="profileFansOverlay" aria-hidden="true">
        <div class="profile-modal" role="dialog" aria-labelledby="profileFansTitle">
          <button type="button" class="profile-modal-close" id="profileFansClose" aria-label="Закрыть">×</button>
          <h3 id="profileFansTitle">Подписчики</h3>
          <ul class="profile-modal-list">${fansList.length ? fansList.map((n) => `<li>${this.escapeHtml(n)}</li>`).join("") : "<li>Пока нет подписчиков</li>"}</ul>
        </div>
      </div>
    `;
    const appearanceCard = root.querySelector("#profileAppearanceCard");
    const appearanceToggle = root.querySelector("#profileAppearanceToggle");
    if (appearanceCard && appearanceToggle) {
      appearanceToggle.addEventListener("click", () => {
        const open = appearanceCard.classList.toggle("is-open");
        appearanceToggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }

    const smoothCollapseAppearance = () => {
      if (!appearanceCard || !appearanceToggle) return;
      if (!appearanceCard.classList.contains("is-open")) return;
      appearanceCard.classList.remove("is-open");
      appearanceToggle.setAttribute("aria-expanded", "false");
    };

    const openOverlay = (el) => el && el.classList.add("is-on");
    const closeOverlay = (el) => el && el.classList.remove("is-on");
    const subsOv = root.querySelector("#profileSubsOverlay");
    const fansOv = root.querySelector("#profileFansOverlay");
    root.querySelector("#profileOpenSubs")?.addEventListener("click", () => openOverlay(subsOv));
    root.querySelector("#profileOpenFans")?.addEventListener("click", () => openOverlay(fansOv));
    subsOv?.addEventListener("click", (e) => {
      if (e.target === subsOv || e.target.id === "profileSubsClose") closeOverlay(subsOv);
    });
    fansOv?.addEventListener("click", (e) => {
      if (e.target === fansOv || e.target.id === "profileFansClose") closeOverlay(fansOv);
    });

    const applyImage = (inputEl, key) => {
      if (!inputEl) return;
      inputEl.addEventListener("change", () => {
        const file = inputEl.files?.[0];
        if (!file) return;
        smoothCollapseAppearance();
        const reader = new FileReader();
        reader.onload = async () => {
          const dataUrl = String(reader.result || "");
          this.saveVisualForUser(username, { [key]: dataUrl });

          // Мгновенно обновляем текущую картинку без полного render(), чтобы не было "ожидания".
          if (key === "photo") {
            const heroWrap = root.querySelector(".profile-hero-content");
            if (heroWrap) {
              const existingImg = heroWrap.querySelector("img.profile-avatar-lg");
              if (existingImg) {
                existingImg.src = dataUrl;
              } else {
                const fb = heroWrap.querySelector(".profile-avatar-fallback");
                if (fb) fb.outerHTML = `<img class="profile-avatar-lg" src="${this.escapeHtml(dataUrl)}" alt="avatar" />`;
              }
            }
            const thumb = root.querySelector(".profile-upload-thumb");
            if (thumb) {
              const timg = thumb.querySelector("img");
              if (timg) {
                timg.src = dataUrl;
              } else {
                thumb.innerHTML = `<img src="${this.escapeHtml(dataUrl)}" alt="" />`;
              }
            }
          }

          if (key === "photo" && window.AppAuth?.updateProfile) {
            try {
              await window.AppAuth.updateProfile({
                ...(window.AppAuth.profile || {}),
                avatarPhoto: dataUrl,
              });
              window.dispatchEvent(
                new CustomEvent("app:avatar-photo-updated", {
                  detail: { username: String(username || ""), photo: dataUrl },
                })
              );
            } catch (_e) {
              const msg = root.querySelector("#profileMessage");
              if (msg) msg.textContent = "Фото сохранено локально; сервер недоступен.";
            }
          }
          if (key === "photo") {
            try {
              window.AppModules?.avatar?.render?.("virtualAvatarMount");
              window.AppModules?.avatar?.renderPanel?.("avatarModuleMount");
              window.AppModules?.social?.render?.("socialModuleMount");
            } catch (_e) {
              // no-op
            }
          }
          // Полный render делаем чуть позже (после сворачивания), чтобы обновить остальной UI без резкого скачка.
          setTimeout(() => this.render(mountId), 260);
        };
        reader.readAsDataURL(file);
      });
    };
    applyImage(root.querySelector("#profilePhotoFile"), "photo");
    const emojiPreset = root.querySelector("#profileEmojiPreset");
    if (emojiPreset) {
      emojiPreset.addEventListener("change", () => {
        const list = String(emojiPreset.value || "").split(",").filter(Boolean);
        this.saveVisualForUser(username, { emojis: list });
        this.render(mountId);
      });
    }
    const saveBtn = root.querySelector("#profileSaveBtn");
    if (saveBtn) saveBtn.addEventListener("click", () => this.saveProfile(root));

    this.bindProfileChrome(root);
  },

  bindProfileChrome(root) {
    const THEME_KEY = "uiTheme_v1";
    const themeBtn = root.querySelector("#themeToggle");
    if (themeBtn) {
      const syncThemeLabel = () => {
        const isLight = document.body.classList.contains("light-theme");
        themeBtn.textContent = isLight ? "☀️ Светлая" : "🌙 Тёмная";
      };
      syncThemeLabel();
      themeBtn.addEventListener("click", () => {
        const isLight = document.body.classList.contains("light-theme");
        const next = isLight ? "dark" : "light";
        document.body.classList.toggle("light-theme", next === "light");
        localStorage.setItem(THEME_KEY, next);
        syncThemeLabel();
      });
    }
    const logoutBtn = root.querySelector("#authLogoutBtn");
    if (logoutBtn && window.AppAuth) {
      logoutBtn.addEventListener("click", () => {
        window.AppAuth.clearAuth();
        window.location.reload();
      });
    }
  },
};
