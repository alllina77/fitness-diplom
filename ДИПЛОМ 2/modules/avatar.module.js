window.AppModules = window.AppModules || {};

window.AppModules.avatar = {
  storageKey: "digitalAvatar_v1",
  progressStorageKey: "avatarProgress_v1",
  styleId: "digital-avatar-styles-v1",

  stages: [
    {
      id: "beginner",
      title: "Начинающий",
      minLevel: 1,
      muscle: 0.05,
      scale: 0.82,
    },
    {
      id: "amateur",
      title: "Любитель",
      minLevel: 10,
      muscle: 0.32,
      scale: 0.92,
    },
    {
      id: "pro",
      title: "Профессионал",
      minLevel: 20,
      muscle: 0.62,
      scale: 1.0,
    },
    { id: "legend", title: "Легенда", minLevel: 30, muscle: 0.85, scale: 1.06 },
    { id: "deity", title: "Божество", minLevel: 40, muscle: 1.0, scale: 1.12 },
  ],

  xpPerLevel: 100,
  xpRules: { set: 5, meal: 2, checkin: 10 },

  escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  },

  readJson(key, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return v ?? fallback;
    } catch (_e) {
      return fallback;
    }
  },

  loadUi() {
    const saved = this.readJson(this.storageKey, {});
    return {
      previewStage: saved.previewStage || "auto",
      debug: saved.debug && typeof saved.debug === "object" ? saved.debug : {},
    };
  },

  saveUi(next) {
    localStorage.setItem(this.storageKey, JSON.stringify(next));
  },

  todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  },

  dateInLastDays(dateStr, days) {
    if (!dateStr) return false;
    const t = new Date(String(dateStr) + "T12:00:00").getTime();
    if (Number.isNaN(t)) return false;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));
    return t >= start.getTime();
  },

  getProfilePhotoDataUrl() {
    try {
      const u = window.AppAuth?.user?.username;
      if (!u) return "";
      const all =
        JSON.parse(localStorage.getItem("profileVisualByUser_v1")) || {};
      return String(all?.[u]?.photo || "");
    } catch (_e) {
      return "";
    }
  },

  getToolbarInitials() {
    const u = String(window.AppAuth?.user?.username || "").trim();
    if (!u) return "—";
    const ascii = u.replace(/[^a-zA-Z0-9_]/g, "");
    if (ascii.length >= 2) return ascii.slice(0, 2).toUpperCase();
    return u.slice(0, 2).toUpperCase();
  },

  collectMetrics() {
    const today = this.todayKey();
    const nutrition = this.readJson("nutritionEntries_v1", []);
    const checkins = this.readJson("mentalAssistant_checkins_v1", []);
    const workoutsByPlan = this.readJson("trainingWorkouts_v4", {});
    const entries = Array.isArray(nutrition) ? nutrition : [];
    const mental = Array.isArray(checkins) ? checkins : [];
    const workouts = [];
    Object.values(workoutsByPlan || {}).forEach((list) => {
      if (Array.isArray(list)) workouts.push(...list);
    });

    const nutritionDays = new Set(
      entries.map((e) => e.dateKey).filter(Boolean),
    );
    const nutritionDays7 = new Set(
      entries
        .filter((e) => this.dateInLastDays(e.dateKey, 7))
        .map((e) => e.dateKey),
    ).size;
    const todayFood = entries.filter((e) => e.dateKey === today);
    const todayKcal = todayFood.reduce((s, e) => s + (Number(e.kcal) || 0), 0);
    const todayProtein = todayFood.reduce((s, e) => s + (Number(e.p) || 0), 0);
    const todayCheckin = mental.find((c) => c.dateKey === today);
    const avgSleep = mental.length
      ? mental.reduce((s, c) => s + (Number(c.sleep_hours) || 0), 0) /
        mental.length
      : 0;
    const workouts7 = workouts.filter((w) =>
      this.dateInLastDays(w.date, 7),
    ).length;
    const totalSets = workouts.reduce(
      (sum, w) => sum + (Array.isArray(w.sets) ? w.sets.length : 0),
      0,
    );
    const latestCheckin =
      [...mental].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0] ||
      null;

    const r = this.xpRules;
    const xp =
      totalSets * r.set + entries.length * r.meal + mental.length * r.checkin;
    const perLevel = this.xpPerLevel;
    const level = Math.max(1, Math.min(99, 1 + Math.floor(xp / perLevel)));
    const levelProgress = (xp % perLevel) / perLevel;

    try {
      const username = String(window.AppAuth?.user?.username || "").trim();
      localStorage.setItem(
        this.progressStorageKey,
        JSON.stringify({
          username,
          xp,
          level,
          levelProgress,
          entriesTotal: entries.length,
          workoutsTotal: workouts.length,
          checkinsTotal: mental.length,
          updatedAt: Date.now(),
        }),
      );
    } catch (_e) {
      // no-op
    }

    return {
      xp,
      level,
      levelProgress,
      nutritionDays: nutritionDays.size,
      nutritionDays7,
      todayKcal,
      todayProtein,
      hasTodayFood: todayFood.length > 0,
      hasTodaySleep: Boolean(
        todayCheckin && Number(todayCheckin.sleep_hours) > 0,
      ),
      avgSleep,
      workoutsTotal: workouts.length,
      workouts7,
      totalSets,
      entriesTotal: entries.length,
      checkinsTotal: mental.length,
      mood: latestCheckin?.emotional_state || "calm",
    };
  },

  stageFromLevel(level) {
    let out = this.stages[0];
    this.stages.forEach((s) => {
      if (level >= s.minLevel) out = s;
    });
    return out;
  },

  getAvatarState() {
    const metrics = this.collectMetrics();
    const ui = this.loadUi();
    const autoStage = this.stageFromLevel(metrics.level);
    const previewStage =
      ui.previewStage === "auto" ? autoStage.id : ui.previewStage;
    const stage = this.stages.find((s) => s.id === previewStage) || autoStage;
    const d = ui.debug || {};

    const hungry =
      d.hungry ?? (!metrics.hasTodayFood || metrics.todayKcal < 1200);
    const sleepy = d.sleepy ?? (!metrics.hasTodaySleep || metrics.avgSleep < 6);
    const poorNutrition = d.poorNutrition ?? metrics.nutritionDays7 < 3;
    const noTraining = d.noTraining ?? metrics.workouts7 === 0;
    const stressed =
      d.stressed ??
      (metrics.mood === "anxious" || metrics.mood === "irritated");

    return {
      ...metrics,
      stage,
      autoStage,
      previewStage: ui.previewStage,
      states: { hungry, sleepy, poorNutrition, noTraining, stressed },
    };
  },

  ensureStyles() {
    if (document.getElementById(this.styleId)) return;
    const style = document.createElement("style");
    style.id = this.styleId;
    style.textContent = `
      .avatar-toolbar-preview { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block; }
      .avatar-toolbar-initials { font-size: 13px; font-weight: 800; color: #fff; letter-spacing: .04em; user-select: none; }
      .da-wrap { max-width: 1060px; margin: 0 auto; padding: 0 4px; display: grid; gap: 16px; color: #f4ecff; }
      .da-card {
        border-radius: 22px;
        padding: 18px;
        border: 1px solid rgba(194,168,250,.32);
        background:
          radial-gradient(circle at 18% 0%, rgba(124,92,255,.2), transparent 35%),
          linear-gradient(155deg, rgba(29,22,56,.96), rgba(8,10,24,.98));
        box-shadow: 0 24px 60px rgba(4, 2, 14, .45);
      }
      .da-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; flex-wrap: wrap; margin-bottom: 14px; }
      .da-head h1 { margin: 0; font-size: 26px; letter-spacing: -.02em; }
      .da-head p { margin: 6px 0 0; color: #cdbceb; max-width: 620px; line-height: 1.5; font-size: 14px; }
      .da-level { padding: 8px 14px; border-radius: 999px; border: 1px solid rgba(200,175,255,.4); background: rgba(255,255,255,.08); font-weight: 800; white-space: nowrap; }
      .da-xp { margin-bottom: 16px; }
      .da-xp-top { display: flex; justify-content: space-between; gap: 10px; color: #dcd0ff; font-size: 13px; margin-bottom: 7px; }
      .da-xp-bar { position: relative; height: 14px; border-radius: 999px; background: rgba(255,255,255,.08); overflow: hidden; border: 1px solid rgba(255,255,255,.08); }
      .da-xp-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, #7c3aed, #22d3ee, #facc15); box-shadow: 0 0 18px rgba(34,211,238,.4); transition: width .45s ease; }
      .da-layout { display: grid; grid-template-columns: minmax(320px, 1fr) 300px; gap: 16px; align-items: stretch; }
      .da-stage {
        position: relative;
        min-height: 540px;
        border-radius: 22px;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,.1);
        background:
          radial-gradient(circle at 50% 24%, rgba(124,92,255,.25), transparent 45%),
          linear-gradient(180deg, rgba(15,23,42,.72), rgba(2,6,23,.95));
        display: grid; place-items: center;
      }
      .da-ground {
        position: absolute; left: 8%; right: 8%; bottom: 36px; height: 40px; border-radius: 50%;
        background: radial-gradient(ellipse at center, rgba(124,92,255,.28), transparent 70%);
        filter: blur(4px);
      }
      .da-bubbles {
        position: absolute; top: 16px; left: 50%; transform: translateX(-50%);
        width: min(92%, 460px); z-index: 6;
        display: grid; gap: 6px; pointer-events: none;
      }
      .da-bubble {
        justify-self: center;
        padding: 8px 14px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,.18);
        background: rgba(8,10,24,.78);
        backdrop-filter: blur(6px);
        color: #fff; font-size: 12.5px; font-weight: 800;
        box-shadow: 0 10px 24px rgba(0,0,0,.26);
      }
      .da-bubble.bad { color: #fecaca; border-color: rgba(248,113,113,.4); }
      .da-bubble.warn { color: #fde68a; border-color: rgba(250,204,21,.4); }
      .da-bubble.good { color: #bbf7d0; border-color: rgba(74,222,128,.4); }
      .da-char {
        position: relative; width: 320px; height: 460px;
        transform-style: preserve-3d;
        animation: daFloat 3.8s ease-in-out infinite;
      }
      @keyframes daFloat { 0%,100% { transform: translateY(0) rotateX(3deg); } 50% { transform: translateY(-8px) rotateX(1deg); } }
      .da-char.stage-deity { animation: daLevitate 4.2s ease-in-out infinite; }
      @keyframes daLevitate { 0%,100% { transform: translateY(-18px) rotateX(3deg); } 50% { transform: translateY(-30px) rotateX(1deg); } }
      .da-svg { width: 100%; height: 100%; display: block; overflow: visible; }
      .da-debug { display: grid; gap: 12px; }
      .da-debug-card { border-radius: 18px; border: 1px solid rgba(194,168,250,.26); background: rgba(255,255,255,.06); padding: 13px; }
      .da-debug-card h3 { margin: 0 0 10px; font-size: 14px; color: #fff; letter-spacing: .01em; }
      .da-debug-note { margin: 0 0 10px; font-size: 12px; color: rgba(220,208,255,.85); line-height: 1.4; }
      .da-btns { display: flex; gap: 8px; flex-wrap: wrap; }
      .da-btn {
        border: 1px solid rgba(194,168,250,.4);
        background: rgba(255,255,255,.07);
        color: #efe8ff;
        border-radius: 999px;
        padding: 8px 11px;
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
        transition: transform .2s ease, background .25s ease, border-color .25s ease;
      }
      .da-btn:hover { transform: translateY(-1px); }
      .da-btn.active { background: linear-gradient(135deg, rgba(124,92,255,.55), rgba(34,211,238,.28)); border-color: rgba(255,255,255,.72); }
      .da-metrics { display: grid; gap: 6px; font-size: 12.5px; color: #d7ccf2; }
      .da-metric { display: flex; justify-content: space-between; gap: 10px; border-bottom: 1px dashed rgba(255,255,255,.12); padding: 4px 0; }
      .da-metric strong { color: #fff; }
      @media (max-width: 960px) {
        .da-layout { grid-template-columns: 1fr; }
        .da-stage { min-height: 520px; }
      }
      body.light-theme .da-card {
        color: #0f172a;
        background: linear-gradient(180deg, #ffffff, #eef2ff);
        border-color: rgba(60,81,114,.15);
        box-shadow: 0 18px 44px rgba(15,23,42,.12);
      }
      body.light-theme .da-head p, body.light-theme .da-xp-top, body.light-theme .da-metrics { color: #475569; }
      body.light-theme .da-level, body.light-theme .da-debug-card { background: #f8fafc; border-color: rgba(60,81,114,.15); }
      body.light-theme .da-debug-card h3 { color: #0f172a; }
      body.light-theme .da-btn { color: #334155; background: #fff; border-color: rgba(60,81,114,.18); }
      body.light-theme .da-stage { background: linear-gradient(180deg, #f8fafc, #dbeafe); border-color: rgba(60,81,114,.14); }

      /* XP toast */
      #avatarXpToastHost {
        position: fixed; top: 18px; left: 50%; transform: translateX(-50%);
        display: grid; gap: 10px; z-index: 9999; pointer-events: none;
      }
      .da-toast {
        display: inline-flex; align-items: center; gap: 10px;
        padding: 10px 16px 10px 12px; border-radius: 14px;
        color: #fff; font-size: 14px; font-weight: 800; letter-spacing: .01em;
        background: linear-gradient(135deg, rgba(124,92,255,.95), rgba(34,211,238,.9));
        border: 1px solid rgba(255,255,255,.25);
        box-shadow: 0 14px 40px rgba(124,92,255,.35), 0 0 0 1px rgba(255,255,255,.04) inset;
        opacity: 0; transform: translateY(-12px) scale(.96);
        transition: opacity .35s ease, transform .35s cubic-bezier(.2,.9,.35,1.2);
      }
      .da-toast.visible { opacity: 1; transform: translateY(0) scale(1); }
      .da-toast.leaving { opacity: 0; transform: translateY(-10px) scale(.96); }
      .da-toast-ico {
        display: inline-grid; place-items: center;
        width: 28px; height: 28px; border-radius: 50%;
        background: radial-gradient(circle at 30% 30%, #fff7cc, #f59e0b 65%, #dc2626 100%);
        color: #7c2d12; font-size: 16px; font-weight: 900;
        box-shadow: 0 0 16px rgba(250,204,21,.55);
      }
      .da-toast .da-toast-xp { color: #fde68a; font-weight: 900; margin-left: 2px; }
      body.light-theme .da-toast {
        background: linear-gradient(135deg, #7c3aed, #22d3ee);
        box-shadow: 0 14px 34px rgba(79,70,229,.28);
      }
    `;
    document.head.appendChild(style);
  },

  renderCharacterSvg(state) {
    const stage = state.stage;
    const s = state.states;
    const mus = stage.muscle;
    const skin = "#f2c6a0";
    const skin2 = "#d29874";
    const skinShade = "#b57f5e";
    const hairColor = "#1e1b4b";
    const cloth =
      stage.id === "beginner"
        ? "#475569"
        : stage.id === "amateur"
          ? "#4338ca"
          : stage.id === "pro"
            ? "#7c2d12"
            : stage.id === "legend"
              ? "#b45309"
              : "#f1f5f9";
    const cloth2 =
      stage.id === "beginner"
        ? "#94a3b8"
        : stage.id === "amateur"
          ? "#22d3ee"
          : stage.id === "pro"
            ? "#f59e0b"
            : stage.id === "legend"
              ? "#fbbf24"
              : "#fde68a";
    const eyeFill =
      stage.id === "pro" || stage.id === "legend" ? "#f97316" : "#0f172a";
    const eyeGlow =
      stage.id === "pro" || stage.id === "legend"
        ? '<filter id="daEyeGlow"><feGaussianBlur stdDeviation="1.6"/></filter>'
        : "";

    // Body proportions scale with muscle
    const shoulderW = 78 + mus * 38;
    const waistW = 44 + mus * 18;
    const legW = 22 + mus * 12;

    // Arm proportions (capsule-based)
    const upperW = 22 + mus * 14; // upper arm thickness
    const foreW = 18 + mus * 10; // forearm thickness
    const bicepR = 12 + mus * 10; // bicep bulge
    const handR = 12 + mus * 3;

    // Arm joint positions (slight natural bend at the elbow)
    const lShoulderX = -shoulderW + 4,
      lShoulderY = -8;
    const lElbowX = -shoulderW - 8,
      lElbowY = 64;
    const lWristX = -shoulderW + 6,
      lWristY = 146;
    const rShoulderX = shoulderW - 4,
      rShoulderY = -8;
    const rElbowX = shoulderW + 8,
      rElbowY = 64;
    const rWristX = shoulderW - 6,
      rWristY = 146;

    const absOpacity = Math.max(0, mus - 0.2);
    const chestOpacity = Math.max(0, mus - 0.1);

    const eyeBags = s.sleepy
      ? `<path d="M -24 8 Q -18 14 -10 8" stroke="#6d28d9" stroke-width="2" fill="none" opacity=".6" />
         <path d="M  10 8 Q  18 14  24 8" stroke="#6d28d9" stroke-width="2" fill="none" opacity=".6" />`
      : "";
    const mouth =
      s.hungry || s.sleepy || s.poorNutrition
        ? `<path d="M -8 20 Q 0 15 8 20" stroke="#7f1d1d" stroke-width="2.5" fill="none" stroke-linecap="round" />`
        : `<path d="M -10 18 Q 0 26 10 18" stroke="#7f1d1d" stroke-width="2.8" fill="none" stroke-linecap="round" />`;
    const belly =
      s.hungry || s.poorNutrition
        ? `<ellipse cx="0" cy="48" rx="18" ry="12" fill="none" stroke="#f87171" stroke-width="2.2" stroke-dasharray="3 4">
           <animate attributeName="rx" values="16;22;16" dur="1.2s" repeatCount="indefinite"/>
           <animate attributeName="ry" values="10;14;10" dur="1.2s" repeatCount="indefinite"/>
         </ellipse>`
        : "";
    const sparks = s.stressed
      ? `<g fill="#facc15">
           <path d="M 60 -100 L 66 -90 L 72 -100 L 66 -96 Z">
             <animate attributeName="opacity" values="0.4;1;0.4" dur=".9s" repeatCount="indefinite"/>
           </path>
           <path d="M -72 -96 L -66 -104 L -60 -96 L -66 -100 Z" opacity=".8"/>
         </g>`
      : "";
    const halo =
      stage.id === "deity"
        ? `<ellipse cx="0" cy="-148" rx="44" ry="10" fill="none" stroke="#facc15" stroke-width="5" filter="url(#daSoftGlow)" />`
        : "";
    const wings =
      stage.id === "deity"
        ? `<g opacity=".92">
           <path d="M -60 -40 C -140 -80 -170 0 -110 60 C -90 20 -70 10 -60 10 Z" fill="url(#daWing)" />
           <path d="M  60 -40 C  140 -80  170 0  110 60 C  90 20  70 10  60 10 Z" fill="url(#daWing)" />
         </g>`
        : "";

    // Fire "flame" generator — a cluster of teardrop flames centered on the hand
    const flame = (cx, cy, delay) => `
      <g transform="translate(${cx} ${cy})" filter="url(#daFireGlow)">
        <ellipse cx="0" cy="4" rx="${handR + 12}" ry="${handR + 8}" fill="url(#daFireOuter)" opacity=".7">
          <animate attributeName="rx" values="${handR + 10};${handR + 18};${handR + 10}" dur="1.4s" begin="${delay}s" repeatCount="indefinite"/>
          <animate attributeName="ry" values="${handR + 6};${handR + 14};${handR + 6}" dur="1.4s" begin="${delay}s" repeatCount="indefinite"/>
        </ellipse>
        <path fill="url(#daFireInner)" d="M -18 8 C -22 -8 -12 -22 -4 -30 C -6 -20 -2 -16 0 -22 C 4 -30 12 -20 14 -10 C 20 -4 16 10 0 14 C -10 14 -16 12 -18 8 Z">
          <animateTransform attributeName="transform" type="scale" values="1 1;1.08 1.22;1 1" dur="0.9s" begin="${delay}s" repeatCount="indefinite"/>
        </path>
        <path fill="#fff7cc" opacity=".85" d="M -6 4 C -8 -4 -2 -10 0 -14 C 2 -10 6 -4 4 4 C 2 8 -2 8 -6 4 Z">
          <animateTransform attributeName="transform" type="scale" values="1 1;1 1.3;1 1" dur="0.7s" begin="${delay}s" repeatCount="indefinite"/>
        </path>
      </g>
    `;
    const burningHands =
      stage.id === "legend" || stage.id === "deity"
        ? `<g class="da-fire">
           ${flame(lWristX, lWristY, 0)}
           ${flame(rWristX, rWristY, 0.25)}
         </g>`
        : "";

    return `
      <svg class="da-svg" viewBox="-180 -200 360 500" role="img" aria-label="Цифровой аватар ${this.escapeHtml(stage.title)}">
        <defs>
          <linearGradient id="daSkin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${skin}"/>
            <stop offset="100%" stop-color="${skin2}"/>
          </linearGradient>
          <linearGradient id="daSkinArm" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"  stop-color="${skinShade}"/>
            <stop offset="40%" stop-color="${skin}"/>
            <stop offset="100%" stop-color="${skin2}"/>
          </linearGradient>
          <linearGradient id="daCloth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${cloth2}"/>
            <stop offset="100%" stop-color="${cloth}"/>
          </linearGradient>
          <linearGradient id="daPants" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#111827"/>
            <stop offset="100%" stop-color="#020617"/>
          </linearGradient>
          <radialGradient id="daFireOuter" cx="50%" cy="55%" r="55%">
            <stop offset="0%"  stop-color="#fff7cc" stop-opacity=".9"/>
            <stop offset="45%" stop-color="#f97316" stop-opacity=".85"/>
            <stop offset="80%" stop-color="#dc2626" stop-opacity=".6"/>
            <stop offset="100%" stop-color="#7f1d1d" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="daFireInner" cx="50%" cy="65%" r="55%">
            <stop offset="0%"  stop-color="#fffbe6"/>
            <stop offset="35%" stop-color="#fde047"/>
            <stop offset="70%" stop-color="#f97316"/>
            <stop offset="100%" stop-color="#dc2626" stop-opacity=".75"/>
          </radialGradient>
          <linearGradient id="daWing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="100%" stop-color="#a5f3fc"/>
          </linearGradient>
          <filter id="daSoftGlow"><feGaussianBlur stdDeviation="3"/></filter>
          <filter id="daFireGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b"/>
            <feMerge>
              <feMergeNode in="b"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          ${eyeGlow}
        </defs>

        <g transform="scale(${stage.scale})">
          ${wings}

          <!-- Shadow -->
          <ellipse cx="0" cy="240" rx="96" ry="14" fill="rgba(0,0,0,.35)" />

          <!-- Legs -->
          <rect x="${-legW - 4}" y="130" width="${legW}" height="120" rx="${legW / 2}" fill="url(#daPants)"/>
          <rect x="${4}" y="130" width="${legW}" height="120" rx="${legW / 2}" fill="url(#daPants)"/>
          <!-- Shoes -->
          <ellipse cx="${-legW / 2 - 4}" cy="252" rx="${legW * 0.9}" ry="8" fill="#111827"/>
          <ellipse cx="${legW / 2 + 4}" cy="252" rx="${legW * 0.9}" ry="8" fill="#111827"/>

          <!-- Torso (shirt) -->
          <path d="
            M ${-shoulderW} -20
            Q ${-shoulderW - 6} 60 ${-waistW} 130
            L ${waistW} 130
            Q ${shoulderW + 6} 60 ${shoulderW} -20
            Q 0 -36 ${-shoulderW} -20 Z
          " fill="url(#daCloth)"/>

          <!-- Chest accent -->
          <path d="M ${-shoulderW * 0.72} 2 Q 0 22 ${shoulderW * 0.72} 2" stroke="rgba(255,255,255,${chestOpacity * 0.55})" stroke-width="3" fill="none"/>

          <!-- Abs (visible on muscle>0.2) -->
          <g opacity="${absOpacity}">
            <path d="M 0 30 L 0 120" stroke="rgba(0,0,0,.2)" stroke-width="3"/>
            <path d="M -18 60 L 18 60" stroke="rgba(0,0,0,.18)" stroke-width="2.4"/>
            <path d="M -20 86 L 20 86" stroke="rgba(0,0,0,.18)" stroke-width="2.4"/>
            <path d="M -22 112 L 22 112" stroke="rgba(0,0,0,.18)" stroke-width="2.4"/>
          </g>

          <!-- Belly (hunger) -->
          ${belly}

          <!-- Arms (capsules: upper arm + forearm + bicep + hand) -->
          <g stroke-linecap="round" fill="none">
            <!-- Left upper arm -->
            <line x1="${lShoulderX}" y1="${lShoulderY}" x2="${lElbowX}" y2="${lElbowY}" stroke="url(#daSkinArm)" stroke-width="${upperW}"/>
            <!-- Left forearm -->
            <line x1="${lElbowX}" y1="${lElbowY}" x2="${lWristX}" y2="${lWristY}" stroke="url(#daSkinArm)" stroke-width="${foreW}"/>
            <!-- Right upper arm -->
            <line x1="${rShoulderX}" y1="${rShoulderY}" x2="${rElbowX}" y2="${rElbowY}" stroke="url(#daSkinArm)" stroke-width="${upperW}"/>
            <!-- Right forearm -->
            <line x1="${rElbowX}" y1="${rElbowY}" x2="${rWristX}" y2="${rWristY}" stroke="url(#daSkinArm)" stroke-width="${foreW}"/>
          </g>
          <g>
            <!-- Bicep bulges (only when muscular) -->
            <ellipse cx="${(lShoulderX + lElbowX) / 2 - 4}" cy="${(lShoulderY + lElbowY) / 2}" rx="${bicepR * 0.9}" ry="${bicepR}" fill="${skin2}" opacity="${chestOpacity}"/>
            <ellipse cx="${(rShoulderX + rElbowX) / 2 + 4}" cy="${(rShoulderY + rElbowY) / 2}" rx="${bicepR * 0.9}" ry="${bicepR}" fill="${skin2}" opacity="${chestOpacity}"/>
            <!-- Shoulder caps -->
            <circle cx="${lShoulderX}" cy="${lShoulderY}" r="${upperW / 2}" fill="url(#daSkinArm)"/>
            <circle cx="${rShoulderX}" cy="${rShoulderY}" r="${upperW / 2}" fill="url(#daSkinArm)"/>
            <!-- Hands -->
            <circle cx="${lWristX}" cy="${lWristY}" r="${handR}" fill="${skin}"/>
            <circle cx="${lWristX + 2}" cy="${lWristY + 3}" r="${handR - 3}" fill="${skin2}" opacity=".55"/>
            <circle cx="${rWristX}" cy="${rWristY}" r="${handR}" fill="${skin}"/>
            <circle cx="${rWristX - 2}" cy="${rWristY + 3}" r="${handR - 3}" fill="${skin2}" opacity=".55"/>
          </g>

          <!-- Burning hands for Legend/Deity (fire centered on wrist) -->
          ${burningHands}

          <!-- Neck -->
          <rect x="-14" y="-46" width="28" height="30" rx="10" fill="url(#daSkin)"/>

          <!-- Head -->
          <g transform="translate(0 -100)">
            <ellipse cx="0" cy="0" rx="46" ry="54" fill="url(#daSkin)"/>
            <!-- Hair -->
            <path d="M -46 -10 Q -40 -58 0 -60 Q 40 -58 46 -10 Q 30 -34 0 -32 Q -30 -34 -46 -10 Z" fill="${hairColor}"/>
            <!-- Ears -->
            <ellipse cx="-46" cy="4" rx="6" ry="10" fill="${skin2}"/>
            <ellipse cx=" 46" cy="4" rx="6" ry="10" fill="${skin2}"/>
            <!-- Eyebrows -->
            <path d="M -26 -14 Q -17 -20 -8 -14" stroke="${hairColor}" stroke-width="3" fill="none" stroke-linecap="round"/>
            <path d="M  26 -14 Q  17 -20  8 -14" stroke="${hairColor}" stroke-width="3" fill="none" stroke-linecap="round"/>
            <!-- Eyes white -->
            <ellipse cx="-17" cy="-2" rx="9" ry="7" fill="#fff"/>
            <ellipse cx=" 17" cy="-2" rx="9" ry="7" fill="#fff"/>
            <!-- Pupils -->
            <ellipse cx="-17" cy="-2" rx="3.6" ry="4" fill="${eyeFill}" ${eyeGlow ? 'filter="url(#daEyeGlow)"' : ""} />
            <ellipse cx=" 17" cy="-2" rx="3.6" ry="4" fill="${eyeFill}" ${eyeGlow ? 'filter="url(#daEyeGlow)"' : ""} />
            <!-- Nose -->
            <path d="M 0 4 Q 3 10 0 14 Q -3 12 0 4 Z" fill="${skin2}" opacity=".6"/>
            <!-- Eye bags (sleepy) -->
            ${eyeBags}
            <!-- Mouth -->
            ${mouth}
          </g>

          <!-- Halo (deity) -->
          ${halo}

          <!-- Sparks (stressed) -->
          ${sparks}
        </g>
      </svg>
    `;
  },

  ensureToastHost() {
    this.ensureStyles();
    let host = document.getElementById("avatarXpToastHost");
    if (!host) {
      host = document.createElement("div");
      host.id = "avatarXpToastHost";
      document.body.appendChild(host);
    }
    return host;
  },

  showXpToast(message, amount) {
    const host = this.ensureToastHost();
    const el = document.createElement("div");
    el.className = "da-toast";
    const xp =
      Number(amount) > 0
        ? `<span class="da-toast-xp">+${amount} XP</span>`
        : "";
    el.innerHTML = `<span class="da-toast-ico" aria-hidden="true">⚡</span><span>${this.escapeHtml(message)}</span>${xp}`;
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add("visible"));
    setTimeout(() => {
      el.classList.remove("visible");
      el.classList.add("leaving");
      setTimeout(() => el.remove(), 420);
    }, 2600);
  },

  grantXp(kind, amount) {
    const xp = Number(amount) > 0 ? Number(amount) : this.xpRules?.[kind] || 0;
    if (!xp) return;
    const messages = {
      workout: `Вы записали тренировку, начислено ${xp} опыта!`,
      meal: `Вы добавили приём пищи, начислено ${xp} опыта!`,
      checkin: `Вы заполнили чекин, начислено ${xp} опыта!`,
    };
    this.showXpToast(messages[kind] || `Начислено ${xp} опыта!`, xp);
    try {
      if (document.getElementById("avatarModuleMount")) {
        this.renderPanel("avatarModuleMount");
      }
      if (document.getElementById("virtualAvatarMount")) {
        this.render("virtualAvatarMount");
      }
    } catch (_e) {
      /* no-op */
    }
  },

  render(mountId) {
    const root = document.getElementById(mountId);
    if (!root) return;
    this.ensureStyles();
    const photo = this.getProfilePhotoDataUrl();
    if (photo) {
      root.innerHTML = `<img class="avatar-toolbar-preview" src="${photo.replace(/"/g, "&quot;")}" alt="" />`;
      return;
    }
    root.innerHTML = `<span class="avatar-toolbar-initials" aria-hidden="true">${this.escapeHtml(this.getToolbarInitials())}</span>`;
  },

  renderPanel(mountId) {
    const root = document.getElementById(mountId);
    if (!root) return;
    this.ensureStyles();
    const ui = this.loadUi();
    const state = this.getAvatarState();
    const stage = state.stage;

    const messages = [];
    if (state.states.hungry)
      messages.push(["bad", "Я хочу есть!!! Накорми меня!"]);
    if (state.states.poorNutrition && !state.states.hungry)
      messages.push(["bad", "Живот бурлит — питайся нормально!"]);
    if (state.states.sleepy)
      messages.push(["warn", "Я хочу спать... заполни сон"]);
    if (state.states.noTraining)
      messages.push(["warn", "Я полон энергии! Давай тренироваться!"]);
    if (state.states.stressed)
      messages.push(["warn", "Мне тревожно — давай подышим"]);
    if (!messages.length && stage.id === "deity")
      messages.push(["good", "Ты моя гордость!"]);
    const bubblesHtml = messages
      .map(
        ([k, t]) => `<div class="da-bubble ${k}">${this.escapeHtml(t)}</div>`,
      )
      .join("");

    const stageBtns = [
      { id: "auto", title: "Авто" },
      ...this.stages.map((s) => ({ id: s.id, title: s.title })),
    ]
      .map(
        (b) =>
          `<button type="button" class="da-btn${(ui.previewStage || "auto") === b.id ? " active" : ""}" data-avatar-stage="${this.escapeHtml(b.id)}">${this.escapeHtml(b.title)}</button>`,
      )
      .join("");
    const stateList = [
      ["hungry", "Голод"],
      ["sleepy", "Плохой сон"],
      ["poorNutrition", "Плохое питание"],
      ["noTraining", "Нет тренировок"],
      ["stressed", "Стресс"],
    ];
    const stateBtns = stateList
      .map(
        ([id, t]) =>
          `<button type="button" class="da-btn${(ui.debug || {})[id] ? " active" : ""}" data-avatar-state="${id}">${this.escapeHtml(t)}</button>`,
      )
      .join("");

    root.innerHTML = `
      <div class="da-wrap">
        <section class="da-card">
          <header class="da-head">
            <div>
              <h1>Цифровой аватар</h1>
              <p>Персонаж прокачивается вместе с вами: питание, сон, эмоции и тренировки превращаются в опыт, уровень и внешний вид.</p>
            </div>
            <div class="da-level">${this.escapeHtml(stage.title)} · LVL ${state.level}</div>
          </header>

          <div class="da-xp">
            <div class="da-xp-top">
              <span>Опыт: ${state.xp} XP</span>
              <span>${Math.round(state.levelProgress * 100)}% до следующего уровня</span>
            </div>
            <div class="da-xp-bar"><div class="da-xp-fill" style="width:${Math.round(state.levelProgress * 100)}%"></div></div>
          </div>

          <div class="da-layout">
            <div class="da-stage">
              <div class="da-bubbles">${bubblesHtml}</div>
              <div class="da-char stage-${this.escapeHtml(stage.id)}">
                ${this.renderCharacterSvg(state)}
              </div>
              <div class="da-ground"></div>
            </div>

            <aside class="da-debug">
              <div class="da-debug-card">
                <h3>Просмотр уровней (временно)</h3>
                <p class="da-debug-note">Переключайтесь между стадиями, чтобы увидеть как выглядит персонаж на каждом уровне. «Авто» — по реальным данным.</p>
                <div class="da-btns">${stageBtns}</div>
              </div>
              <div class="da-debug-card">
                <h3>Состояния (временно)</h3>
                <p class="da-debug-note">Включайте, чтобы проверить, как персонаж реагирует на голод, плохой сон и отсутствие тренировок.</p>
                <div class="da-btns">${stateBtns}</div>
              </div>
              <div class="da-debug-card">
                <h3>Данные персонажа</h3>
                <div class="da-metrics">
                  <div class="da-metric"><span>Подходов всего</span><strong>${state.totalSets || 0} × 5 XP</strong></div>
                  <div class="da-metric"><span>Приёмов пищи</span><strong>${state.entriesTotal || 0} × 2 XP</strong></div>
                  <div class="da-metric"><span>Чекинов</span><strong>${state.checkinsTotal || 0} × 10 XP</strong></div>
                  <div class="da-metric"><span>Ккал сегодня</span><strong>${Math.round(state.todayKcal)}</strong></div>
                  <div class="da-metric"><span>Тренировки за 7 дней</span><strong>${state.workouts7}</strong></div>
                  <div class="da-metric"><span>Средний сон</span><strong>${state.avgSleep ? state.avgSleep.toFixed(1) + " ч" : "нет данных"}</strong></div>
                  <div class="da-metric"><span>Настроение</span><strong>${this.escapeHtml(state.mood)}</strong></div>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    `;

    root.querySelectorAll("[data-avatar-stage]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const next = btn.getAttribute("data-avatar-stage") || "auto";
        const cur = this.loadUi();
        this.saveUi({ ...cur, previewStage: next });
        this.renderPanel(mountId);
      });
    });
    root.querySelectorAll("[data-avatar-state]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-avatar-state");
        if (!key) return;
        const cur = this.loadUi();
        const debug = { ...(cur.debug || {}) };
        debug[key] = !debug[key];
        this.saveUi({ ...cur, debug });
        this.renderPanel(mountId);
      });
    });
  },
};
