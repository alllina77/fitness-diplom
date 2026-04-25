window.AppModules = window.AppModules || {};

window.AppModules.psychology = {
  storageKeys: {
    checkins: "mentalAssistant_checkins_v1",
    adviceDay: "mentalAssistant_advice_day_v1",
    adviceId: "mentalAssistant_advice_id_v1",
    fatigueDecisionDay: "mentalAssistant_fatigue_decision_day_v1",
    onboardingDone: "mentalAssistant_onboarding_done_v1",
    dailyNote: "mentalAssistant_daily_note_v1",
  },
  calendarCursor: null,
  advicePool: null,
  adviceTimer: null,
  breathTimer: null,
  adviceFallback: [
    {
      id: 1,
      text: "Доброе утро! Стакан воды и 2 минуты без телефона помогают проснуться мягче. Пусть день пройдет спокойно.",
      tags: ["сон", "осознанность"],
    },
    {
      id: 2,
      text: "Иногда полезно начать с малого: одна короткая пауза на дыхание между задачами уже снижает напряжение.",
      tags: ["стресс", "дыхание"],
    },
    {
      id: 3,
      text: "Небольшой стресс можно пережить легче, если заранее планировать короткий отдых. Сегодня попробуем этот ритм.",
      tags: ["стресс", "баланс"],
    },
  ],

  escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  },

  todayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  },

  dateKeyFromLocalDate(d) {
    const dt = d instanceof Date ? d : new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  },

  async loadAdvicePool() {
    try {
      const response = await fetch("./data/mental-advice.json");
      if (!response.ok) throw new Error("Advice file unavailable");
      const data = await response.json();
      if (Array.isArray(data) && data.length) return data;
      return this.adviceFallback;
    } catch (_e) {
      return this.adviceFallback;
    }
  },

  async resolveAdviceForToday() {
    const pool = await this.loadAdvicePool();
    const day = this.todayKey();
    const savedDay = localStorage.getItem(this.storageKeys.adviceDay);
    const savedId = Number(localStorage.getItem(this.storageKeys.adviceId));

    if (savedDay === day) {
      const existing = pool.find((item) => item.id === savedId);
      if (existing) return existing;
    }

    const index = Math.floor(Math.random() * pool.length);
    const advice = pool[index];
    localStorage.setItem(this.storageKeys.adviceDay, day);
    localStorage.setItem(this.storageKeys.adviceId, String(advice.id));
    return advice;
  },

  rotateAdvice(root) {
    const adviceMount = root.querySelector("#mentalAdviceText");
    if (!adviceMount || !Array.isArray(this.advicePool) || !this.advicePool.length) {
      return;
    }
    const index = Math.floor(Math.random() * this.advicePool.length);
    const advice = this.advicePool[index];
    adviceMount.style.opacity = "0";
    setTimeout(() => {
      adviceMount.textContent = advice.text;
      adviceMount.style.opacity = "1";
    }, 180);
  },

  loadCheckins() {
    try {
      const parsed = JSON.parse(localStorage.getItem(this.storageKeys.checkins));
      return Array.isArray(parsed) ? parsed : [];
    } catch (_e) {
      return [];
    }
  },

  saveCheckins(checkins) {
    localStorage.setItem(this.storageKeys.checkins, JSON.stringify(checkins));
  },

  getWeeklyStats() {
    const checkins = this.loadCheckins();
    const now = Date.now();
    const weekAgo = now - 6 * 24 * 60 * 60 * 1000;
    const recent = checkins.filter((item) => item.timestamp >= weekAgo);
    const moodCount = { calm: 0, anxious: 0, irritated: 0, happy: 0 };
    recent.forEach((item) => {
      if (moodCount[item.emotional_state] !== undefined) {
        moodCount[item.emotional_state] += 1;
      }
    });
    return { total: recent.length, moodCount };
  },

  hasCheckinToday() {
    const today = this.todayKey();
    return this.loadCheckins().some((item) => item.dateKey === today);
  },

  getCheckinStreak() {
    const checkins = this.loadCheckins().sort((a, b) => b.timestamp - a.timestamp);
    if (!checkins.length) return 0;
    let streak = 0;
    let cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    for (const item of checkins) {
      const key = this.dateKeyFromLocalDate(cursor);
      if (item.dateKey === key) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else if (item.dateKey < key) {
        break;
      }
    }
    return streak;
  },

  saveCheckin(physicalState, emotionalState, noteText) {
    const checkins = this.loadCheckins();
    const now = Date.now();
    const today = this.todayKey();
    const withoutToday = checkins.filter((item) => item.dateKey !== today);
    withoutToday.push({
      timestamp: now,
      dateKey: today,
      physical_state: physicalState,
      emotional_state: emotionalState,
      note: (noteText || "").trim().slice(0, 240),
      sleep_hours: 0,
      sleep_score: 0,
    });
    this.saveCheckins(withoutToday.sort((a, b) => a.timestamp - b.timestamp));

    try {
      const xpFlagKey = "mentalAssistant_checkinXpDay_v1";
      const last = localStorage.getItem(xpFlagKey);
      if (last !== today) {
        localStorage.setItem(xpFlagKey, today);
        window.AppModules?.avatar?.grantXp?.("checkin", 10);
      }
    } catch (_e) { /* no-op */ }
  },

  getConsecutiveRiskDays() {
    const checkins = this.loadCheckins().sort((a, b) => b.timestamp - a.timestamp);
    let streak = 0;
    for (const item of checkins) {
      const riskPhysical =
        item.physical_state === "tired" || item.physical_state === "exhausted";
      const riskEmotional =
        item.emotional_state === "anxious" ||
        item.emotional_state === "irritated";
      if (riskPhysical || riskEmotional) {
        streak += 1;
      } else {
        break;
      }
      if (streak >= 3) break;
    }
    return streak;
  },

  detectPlannedTrainingType() {
    try {
      const plans = JSON.parse(localStorage.getItem("trainingPlans_v3")) || [];
      const planId = localStorage.getItem("trainingCurrentPlanId_v2");
      const currentPlan = plans.find((plan) => plan.id === planId) || plans[0];
      if (!currentPlan || !Array.isArray(currentPlan.days) || !currentPlan.days.length) {
        return "unknown";
      }
      const dayIdx = Number(localStorage.getItem("trainingCurrentDayIdx_v2"));
      const day =
        currentPlan.days[Number.isFinite(dayIdx) ? dayIdx : 0] ||
        currentPlan.days[0];
      const exercises = Array.isArray(day.exercises) ? day.exercises : [];
      const names = exercises.map((item) =>
        String(item.name || "").toLowerCase()
      );

      const hiitWords = ["hiit", "интервал", "бурпи", "табата", "спринт"];
      const hasHiit = names.some((name) =>
        hiitWords.some((word) => name.includes(word))
      );
      if (hasHiit) return "hiit";

      const hasStrength = exercises.some(
        (item) => (item.type || "").toLowerCase() === "силовое"
      );
      if (hasStrength) return "strength";
      return "unknown";
    } catch (_e) {
      return "unknown";
    }
  },

  buildActionRequired() {
    const streak = this.getConsecutiveRiskDays();
    const trainingType = this.detectPlannedTrainingType();
    const fatigueAlert =
      streak >= 2 && (trainingType === "strength" || trainingType === "hiit");
    return {
      fatigue_alert: fatigueAlert,
      scheduled_training_type: trainingType,
      suggestion: fatigueAlert ? "replace_with_walk" : "keep_plan",
      message: fatigueAlert
        ? "Заметили, что вы устали. Силовая сегодня может забрать последние силы. Предлагаем заменить ее на прогулку или легкую растяжку."
        : "Состояние стабильно. Можно продолжать план в комфортном темпе.",
    };
  },

  replaceWorkoutWithRecovery() {
    try {
      const workoutsByPlan = JSON.parse(localStorage.getItem("trainingWorkouts_v4")) || {};
      const plans = JSON.parse(localStorage.getItem("trainingPlans_v3")) || [];
      const planId = localStorage.getItem("trainingCurrentPlanId_v2") || plans[0]?.id;
      if (!planId) return;
      const planWorkouts = Array.isArray(workoutsByPlan[planId])
        ? workoutsByPlan[planId]
        : [];
      const today = this.todayKey();

      planWorkouts.push({
        id: "recovery_" + Math.random().toString(36).slice(2, 9),
        date: today,
        exId: "recovery_walk",
        exName: "Восстановительная прогулка",
        muscle: "кардио",
        sets: [{ w: 0, r: 40 }],
        isCustom: true,
      });

      workoutsByPlan[planId] = planWorkouts;
      localStorage.setItem("trainingWorkouts_v4", JSON.stringify(workoutsByPlan));
    } catch (_e) {
      // no-op
    }
  },

  ensureStyles() {
    const legacy = document.getElementById("mental-assistant-styles");
    if (legacy) legacy.remove();
    const prevV2 = document.getElementById("mental-assistant-styles-v2");
    if (prevV2) prevV2.remove();
    const prevV3 = document.getElementById("mental-assistant-styles-v3");
    if (prevV3) prevV3.remove();
    document.getElementById("mental-assistant-styles-v4")?.remove();
    document.getElementById("mental-assistant-styles-v5")?.remove();
    document.getElementById("mental-assistant-styles-v6")?.remove();
    if (document.getElementById("mental-assistant-styles-v7")) return;
    const style = document.createElement("style");
    style.id = "mental-assistant-styles-v7";
    style.textContent = `
      .mental-wrap { max-width: 980px; margin: 0 auto; display: grid; gap: 16px; color: #dce7f3; }
      .mental-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: stretch; }
      .mental-card { background: linear-gradient(180deg, rgba(147, 126, 214, 0.14), rgba(84, 73, 150, 0.12)); border: 1px solid rgba(171, 148, 230, 0.35); border-radius: 16px; padding: 18px 18px 16px; box-shadow: 0 12px 32px rgba(18, 12, 34, 0.22); }
      .mental-kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 10px; }
      .mental-kpi { background: rgba(81, 63, 132, 0.35); border: 1px solid rgba(171, 148, 230, 0.28); border-radius: 10px; padding: 10px; text-align: center; }
      .mental-kpi-value { font-size: 20px; font-weight: 700; color: #f0e5ff; }
      .mental-kpi-label { font-size: 12px; color: #d4c9f2; }
      .mental-top-actions { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
      .mental-badge { padding: 6px 10px; border-radius: 999px; background: rgba(99, 77, 157, 0.35); border: 1px solid rgba(185, 160, 245, 0.45); font-size: 12px; color: #efe5ff; }
      .mental-equal-card {
        display: flex;
        flex-direction: column;
        min-height: 0;
        height: clamp(600px, 68vh, 860px);
        max-height: clamp(600px, 68vh, 860px);
      }
      .mental-checkin-shell { flex: 1; min-height: 0; display: flex; flex-direction: column; }
      .mental-checkin-inner { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 0; }
      .mental-checkin-scroll { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; padding-right: 6px; -webkit-overflow-scrolling: touch; }
      .mental-title { margin: 0 0 8px 0; font-size: 26px; font-weight: 700; letter-spacing: -0.02em; }
      .mental-sub { margin: 0; color: #d4c9f2; line-height: 1.55; font-size: 15px; transition: opacity 0.35s ease; }
      .mental-card > h3 { margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #f4ecff; }
      .mental-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
      .mental-btn { border: 1px solid rgba(191, 169, 242, 0.6); background: rgba(128, 101, 196, 0.25); color: #f2ebff; padding: 11px 16px; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; }
      .mental-btn:hover { border-color: rgba(208, 183, 255, 0.95); background: rgba(138, 108, 214, 0.35); }
      .mental-checkin-group { margin-top: 12px; }
      .mental-checkin-q { margin: 0 0 8px 0; font-weight: 600; font-size: 15px; }
      .mental-chip { border: 1px solid rgba(182, 160, 236, 0.5); background: rgba(72, 57, 112, 0.28); color: #eee5ff; border-radius: 999px; padding: 12px 16px; font-size: 15px; cursor: pointer; }
      .mental-chip.active { border-color: rgba(213, 191, 255, 0.95); background: rgba(125, 93, 194, 0.45); }
      .mental-note { color: #d6c9f1; font-size: 14px; margin-top: 8px; }
      .mental-mini-input { width: 100%; margin-top: 10px; background: rgba(59, 45, 98, 0.35); border: 1px solid rgba(182, 160, 236, 0.45); border-radius: 12px; color: #f2ebff; padding: 12px 14px; font-size: 15px; line-height: 1.45; box-sizing: border-box; }
      #mentalDailyNote { min-height: 100px; resize: vertical; }
      .mental-sleep-row { display: grid; grid-template-columns: 1fr; gap: 10px; margin-top: 10px; }
      .mental-sleep-top { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-items: center; }
      .mental-sleep-stepper { display: grid; grid-template-columns: 42px 1fr 42px; gap: 8px; align-items: center; }
      .mental-sleep-step-btn {
        border: 1px solid rgba(182, 160, 236, 0.55);
        background: rgba(72, 57, 112, 0.28);
        color: #efe5ff;
        border-radius: 12px;
        height: 44px;
        font-size: 18px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.25s ease;
      }
      .mental-sleep-step-btn:hover { border-color: rgba(213, 191, 255, 0.95); background: rgba(125, 93, 194, 0.45); }
      .mental-sleep-stepper .mental-mini-input { margin-top: 0; text-align: center; }
      .mental-sleep-quick { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
      .mental-sleep-chip { padding: 10px 12px; font-size: 14px; }
      .mental-sleep-pill { border: 1px solid rgba(182, 160, 236, 0.5); border-radius: 999px; padding: 9px 12px; font-size: 13px; color: #efe5ff; background: rgba(72, 57, 112, 0.28); }
      .mental-advice-card { position: relative; overflow: hidden; border-radius: 18px; padding: 20px 20px 18px; background: radial-gradient(circle at 12% 0%, rgba(214, 191, 255, 0.35), transparent 42%), linear-gradient(135deg, rgba(92, 72, 150, 0.55), rgba(45, 182, 164, 0.18)); border: 1px solid rgba(200, 175, 255, 0.45); box-shadow: 0 16px 40px rgba(24, 14, 48, 0.35); }
      .mental-advice-card::after { content: ""; position: absolute; inset: auto -20% -40% auto; width: 200px; height: 200px; background: radial-gradient(circle, rgba(99, 224, 197, 0.25), transparent 65%); pointer-events: none; }
      .mental-advice-label { font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #e8dcff; opacity: 0.9; margin-bottom: 8px; }
      .mental-advice-text { font-size: 18px; line-height: 1.55; color: #fff; font-weight: 500; position: relative; z-index: 1; transition: opacity 0.35s ease; min-height: 3.2em; }
      .mental-checkin-shell { border-radius: 18px; padding: 4px; background: linear-gradient(135deg, rgba(180, 154, 255, 0.45), rgba(63, 224, 197, 0.25)); }
      .mental-checkin-inner { border-radius: 14px; padding: 18px 18px 16px; background: rgba(22, 16, 42, 0.72); border: 1px solid rgba(255,255,255,0.06); }
      .mental-help-column.mental-equal-card .mental-help-hub {
        flex: 1;
        min-height: 0;
        margin-top: 10px;
        display: flex;
        flex-direction: column;
        isolation: isolate;
      }
      .mental-help-column.mental-equal-card .mental-help-inner {
        flex: 1;
        min-height: 0;
        overflow-x: hidden;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .mental-help-column.mental-equal-card .mental-help-disclaimer {
        margin-top: auto;
        flex-shrink: 0;
      }
      .mental-help-hub {
        position: relative;
        margin-top: 10px;
        border-radius: 22px;
        overflow: hidden;
        animation: mentalFadeUp 0.55s cubic-bezier(0.22, 1, 0.36, 1);
        border: 1px solid rgba(200, 175, 255, 0.42);
        background: linear-gradient(148deg, rgba(48, 32, 88, 0.97) 0%, rgba(22, 16, 44, 0.98) 42%, rgba(26, 40, 56, 0.94) 100%);
        box-shadow: 0 24px 56px rgba(6, 2, 18, 0.5), inset 0 1px 0 rgba(255,255,255,0.09);
      }
      .mental-help-hub::before {
        content: "";
        position: absolute;
        z-index: 0;
        top: -45%;
        right: -18%;
        width: 240px;
        height: 240px;
        background: radial-gradient(circle, rgba(124, 92, 255, 0.38) 0%, transparent 68%);
        pointer-events: none;
      }
      .mental-help-hub::after {
        content: "";
        position: absolute;
        z-index: 0;
        bottom: -35%;
        left: -12%;
        width: 200px;
        height: 200px;
        background: radial-gradient(circle, rgba(45, 212, 191, 0.2) 0%, transparent 70%);
        pointer-events: none;
      }
      .mental-help-inner {
        position: relative;
        z-index: 1;
        padding: 24px 22px 22px;
        display: grid;
        gap: 16px;
      }
      .mental-help-kicker,
      .mental-help-title,
      .mental-help-lead,
      .mental-help-list,
      .mental-help-site-row {
        flex-shrink: 0;
      }
      .mental-help-kicker {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #99f6e4;
        background: rgba(45, 212, 191, 0.1);
        border: 1px solid rgba(94, 234, 212, 0.38);
        padding: 7px 14px;
        border-radius: 999px;
        width: fit-content;
      }
      .mental-help-title {
        margin: 0;
        font-size: 23px;
        font-weight: 800;
        letter-spacing: -0.035em;
        line-height: 1.22;
        color: #fff;
        text-shadow: 0 2px 28px rgba(124, 92, 255, 0.4);
      }
      .mental-help-lead {
        margin: 0;
        font-size: 15px;
        line-height: 1.62;
        color: #d4c9f2;
      }
      .mental-help-list {
        display: grid;
        gap: 11px;
        min-height: min-content;
      }
      .mental-help-card {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 14px;
        align-items: start;
        padding: 15px 17px;
        border-radius: 16px;
        text-decoration: none;
        color: inherit;
        cursor: pointer;
        background: rgba(255,255,255,0.055);
        border: 1px solid rgba(255,255,255,0.1);
        transition: transform 0.38s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.28s ease, background 0.28s ease, box-shadow 0.38s ease;
      }
      .mental-help-card:hover {
        transform: translateY(-3px);
        border-color: rgba(200, 175, 255, 0.55);
        background: rgba(255,255,255,0.1);
        box-shadow: 0 14px 32px rgba(0, 0, 0, 0.22);
      }
      .mental-help-card:active { transform: translateY(-1px) scale(0.995); }
      .mental-help-card:focus-visible {
        outline: 2px solid rgba(153, 246, 228, 0.85);
        outline-offset: 2px;
      }
      .mental-help-icon {
        width: 48px;
        height: 48px;
        margin-top: 2px;
        border-radius: 15px;
        display: grid;
        place-items: center;
        font-size: 23px;
        line-height: 1;
        background: linear-gradient(145deg, rgba(124, 92, 255, 0.5), rgba(58, 184, 154, 0.3));
        border: 1px solid rgba(255,255,255,0.14);
        box-shadow: 0 6px 16px rgba(0,0,0,0.2);
      }
      .mental-help-card-body { min-width: 0; overflow-wrap: anywhere; word-break: break-word; }
      .mental-help-card-title { font-size: 15px; font-weight: 700; color: #f6f0ff; margin: 0 0 5px 0; letter-spacing: -0.02em; line-height: 1.35; }
      .mental-help-card-meta { font-size: 13px; color: #b9a8e4; margin: 0; line-height: 1.5; }
      .mental-help-arrow {
        width: 38px;
        height: 38px;
        margin-top: 2px;
        border-radius: 12px;
        display: grid;
        place-items: center;
        background: rgba(0,0,0,0.22);
        color: #e8dcff;
        font-size: 17px;
        font-weight: 600;
        flex-shrink: 0;
        transition: background 0.25s ease, color 0.25s ease;
      }
      .mental-help-card:hover .mental-help-arrow {
        background: rgba(124, 92, 255, 0.45);
        color: #fff;
      }
      .mental-help-site-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 16px; padding-top: 2px; }
      .mental-help-site {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 600;
        color: #a5f3fc;
        text-decoration: none;
        padding: 8px 12px;
        margin: 0 -12px;
        border-radius: 12px;
        transition: color 0.2s ease, background 0.2s ease;
      }
      .mental-help-site:hover { color: #fff; background: rgba(255,255,255,0.08); }
      .mental-help-site:focus-visible { outline: 2px solid rgba(165, 243, 252, 0.8); outline-offset: 2px; }
      .mental-help-disclaimer {
        margin: 0;
        font-size: 12px;
        line-height: 1.55;
        color: rgba(214, 201, 255, 0.52);
        padding-top: 10px;
        border-top: 1px solid rgba(255,255,255,0.08);
        text-align: left;
        font-style: normal;
      }
      .mental-calendar { margin-top: 10px; border: 1px solid rgba(177, 153, 235, 0.35); border-radius: 12px; padding: 12px; background: rgba(46, 34, 76, 0.35); }
      .mental-calendar-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
      .mental-calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
      .mental-calendar-dayname { text-align: center; color: #cbbbe8; font-size: 13px; font-weight: 600; }
      .mental-calendar-day { min-height: 44px; border-radius: 10px; border: 1px solid rgba(213,193,255,0.15); display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 600; color: #efe7ff; background: rgba(255,255,255,0.03); }
      .mental-calendar-day.muted { opacity: 0.4; }
      .mental-calendar-day.calm { background: rgba(92, 132, 224, 0.55); }
      .mental-calendar-day.anxious { background: rgba(214, 161, 66, 0.62); }
      .mental-calendar-day.irritated { background: rgba(215, 92, 106, 0.62); }
      .mental-calendar-day.happy { background: rgba(96, 186, 119, 0.6); }
      .mental-calendar-legend { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; color: #dacdf1; font-size: 12px; }
      .mental-dot { width: 10px; height: 10px; border-radius: 999px; display: inline-block; margin-right: 6px; vertical-align: middle; }
      .mental-day-details { margin-top: 12px; padding: 10px; border-radius: 10px; background: rgba(71, 56, 118, 0.35); border: 1px solid rgba(182, 160, 236, 0.35); }
      .mental-day-details h4 { margin: 0 0 6px 0; }
      .mental-day-item { color: #e9dcff; font-size: 13px; margin: 2px 0; }
      .mental-calendar-backdrop { position: fixed; inset: 0; background: rgba(10, 8, 18, 0.45); z-index: 1199; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; }
      .mental-calendar-backdrop.active { opacity: 1; pointer-events: auto; }
      .mental-calendar-drawer { position: fixed; top: var(--toolbar-height); right: 0; width: min(420px, 92vw); height: calc(100vh - var(--toolbar-height)); background: rgba(16, 28, 38, 0.97); backdrop-filter: blur(10px); border-left: 1px solid rgba(170, 197, 212, 0.28); z-index: 1200; transform: translateX(100%); transition: transform 0.35s ease; padding: 16px; overflow: auto; }
      .mental-calendar-drawer { background: rgba(34, 23, 61, 0.97); border-left: 1px solid rgba(185, 156, 245, 0.4); }
      .mental-calendar-drawer.active { transform: translateX(0); }
      .mental-calendar-drawer-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
      .mental-breath { display: grid; gap: 10px; margin-top: 10px; }
      .mental-breath-circle { width: 120px; height: 120px; border-radius: 999px; margin: 0 auto; border: 2px solid rgba(209, 184, 255, 0.6); display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; color: #f2e8ff; background: radial-gradient(circle, rgba(146,114,214,0.45), rgba(84,62,145,0.2)); transition: transform 1s ease-in-out; }
      .mental-breath-circle.expand { transform: scale(1.16); }
      .mental-breath-text { text-align: center; color: #e5d8ff; font-size: 14px; }
      .mental-onboard-overlay { position: fixed; inset: 0; z-index: 1400; background: rgba(9, 7, 18, 0.68); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; padding: 16px; }
      .mental-onboard-card { width: min(560px, 96vw); background: linear-gradient(180deg, rgba(92, 72, 150, 0.95), rgba(62, 47, 106, 0.95)); border: 1px solid rgba(193, 169, 245, 0.5); border-radius: 16px; padding: 18px; box-shadow: 0 18px 60px rgba(0, 0, 0, 0.35); }
      .mental-onboard-step { color: #d8cbf3; font-size: 12px; margin-bottom: 10px; }
      .mental-onboard-title { margin: 0 0 8px 0; font-size: 24px; }
      .mental-onboard-text { margin: 0; color: #efe6ff; line-height: 1.55; }
      .mental-onboard-progress { margin-top: 12px; height: 6px; border-radius: 999px; background: rgba(255,255,255,0.14); overflow: hidden; }
      .mental-onboard-progress > div { height: 100%; background: linear-gradient(90deg, #a986f3, #d3b9ff); transition: width 0.3s ease; }
      .mental-onboard-actions { display: flex; justify-content: space-between; gap: 10px; margin-top: 14px; }
      @keyframes mentalFadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      body.light-theme .mental-help-hub {
        background: linear-gradient(148deg, #faf5ff 0%, #f1f5f9 45%, #ecfeff 100%);
        border-color: rgba(99, 102, 241, 0.22);
        box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
      }
      body.light-theme .mental-help-kicker {
        color: #0d9488;
        background: rgba(45, 212, 191, 0.12);
        border-color: rgba(20, 184, 166, 0.35);
      }
      body.light-theme .mental-help-title { color: #0f172a; text-shadow: none; }
      body.light-theme .mental-help-lead { color: #475569; }
      body.light-theme .mental-help-card {
        background: #fff;
        border-color: rgba(60, 81, 114, 0.12);
      }
      body.light-theme .mental-help-card:hover {
        border-color: rgba(99, 102, 241, 0.35);
        box-shadow: 0 12px 28px rgba(15, 23, 42, 0.1);
      }
      body.light-theme .mental-help-card-title { color: #0f172a; }
      body.light-theme .mental-help-card-meta { color: #64748b; }
      body.light-theme .mental-help-arrow { background: #f1f5f9; color: #475569; }
      body.light-theme .mental-help-card:hover .mental-help-arrow { background: #e0e7ff; color: #3730a3; }
      body.light-theme .mental-help-site { color: #0369a1; }
      body.light-theme .mental-help-disclaimer { color: #94a3b8; border-top-color: rgba(60, 81, 114, 0.1); }
      body.light-theme .mental-sleep-step-btn { background: #f1f5f9; color: #0f172a; border-color: rgba(15,23,42,0.18); }
      body.light-theme .mental-sleep-step-btn:hover { background: #e2e8f0; border-color: rgba(15,23,42,0.22); }
      @media (max-width: 900px) {
        .mental-grid { grid-template-columns: 1fr; }
        .mental-kpi-row { grid-template-columns: repeat(2, 1fr); }
        .mental-sleep-top { grid-template-columns: 1fr; }
        .mental-equal-card {
          height: clamp(520px, 58vh, 720px);
          max-height: clamp(520px, 58vh, 720px);
        }
      }
    `;
    document.head.appendChild(style);
  },

  renderActionCard(root) {
    const action = this.buildActionRequired();
    const actionMount = root.querySelector("#mentalActionRequired");
    if (!actionMount) return;

    if (!action.fatigue_alert) {
      actionMount.innerHTML = `
        <div class="mental-note">Мы не видим критичной усталости по чекинам. Можно держать текущий план и мягко отслеживать состояние.</div>
      `;
      return;
    }

    actionMount.innerHTML = `
      <h3>Заметили, что вы устали ⛔️</h3>
      <p class="mental-sub">
        Последние пару дней даются непросто. ${
          action.scheduled_training_type === "hiit" ? "HIIT" : "Силовая"
        } тренировка сегодня может забрать ресурс. Как насчет восстановительной прогулки или легкой растяжки?
      </p>
      <div class="mental-row">
        <button class="mental-btn" id="mentalReplaceWalk">Заменить на прогулку</button>
        <button class="mental-btn" id="mentalKeepStrength">Оставить силовую</button>
      </div>
      <div class="mental-note" id="mentalDecisionNote"></div>
    `;

    const note = actionMount.querySelector("#mentalDecisionNote");
    const replaceBtn = actionMount.querySelector("#mentalReplaceWalk");
    const keepBtn = actionMount.querySelector("#mentalKeepStrength");
    const day = this.todayKey();
    const decidedDay = localStorage.getItem(this.storageKeys.fatigueDecisionDay);
    if (decidedDay === day && note) {
      note.textContent = "Решение на сегодня уже сохранено.";
    }

    if (replaceBtn) {
      replaceBtn.addEventListener("click", () => {
        this.replaceWorkoutWithRecovery();
        localStorage.setItem(this.storageKeys.fatigueDecisionDay, day);
        if (note) {
          note.textContent =
            "Добавили активность «Восстановительная прогулка» в историю тренировок на сегодня.";
        }
      });
    }
    if (keepBtn) {
      keepBtn.addEventListener("click", () => {
        localStorage.setItem(this.storageKeys.fatigueDecisionDay, day);
        if (note) {
          note.textContent =
            "Хорошо, оставляем силовую. Рекомендуем снизить интенсивность и следить за самочувствием.";
        }
      });
    }
  },

  setupCalendarDrawer(root) {
    const open = root.querySelector("#mentalOpenCalendar");
    const close = root.querySelector("#mentalCloseCalendar");
    const drawer = root.querySelector("#mentalCalendarDrawer");
    const backdrop = root.querySelector("#mentalCalendarBackdrop");
    if (!open || !close || !drawer || !backdrop) return;

    const openDrawer = () => {
      drawer.classList.add("active");
      backdrop.classList.add("active");
    };
    const closeDrawer = () => {
      drawer.classList.remove("active");
      backdrop.classList.remove("active");
    };

    open.addEventListener("click", openDrawer);
    close.addEventListener("click", closeDrawer);
    backdrop.addEventListener("click", closeDrawer);

    if (this._onEscCloseDrawer) {
      document.removeEventListener("keydown", this._onEscCloseDrawer);
    }
    this._onEscCloseDrawer = (event) => {
      if (event.key === "Escape") closeDrawer();
    };
    document.addEventListener("keydown", this._onEscCloseDrawer);
  },

  renderWeeklyStats(root) {
    const mount = root.querySelector("#mentalWeeklyStats");
    if (!mount) return;
    const stats = this.getWeeklyStats();
    mount.innerHTML = `
      <div class="mental-kpi-row">
        <div class="mental-kpi"><div class="mental-kpi-value">${stats.total}</div><div class="mental-kpi-label">Чекинов за 7 дней</div></div>
        <div class="mental-kpi"><div class="mental-kpi-value">${stats.moodCount.calm}</div><div class="mental-kpi-label">Спокойствие</div></div>
        <div class="mental-kpi"><div class="mental-kpi-value">${stats.moodCount.anxious + stats.moodCount.irritated}</div><div class="mental-kpi-label">Стрессовые дни</div></div>
        <div class="mental-kpi"><div class="mental-kpi-value">${this.getCheckinStreak()}</div><div class="mental-kpi-label">Серия дней</div></div>
      </div>
    `;
  },

  setupBreathing(root) {
    const startBtn = root.querySelector("#mentalStartBreath");
    const stopBtn = root.querySelector("#mentalStopBreath");
    const circle = root.querySelector("#mentalBreathCircle");
    const text = root.querySelector("#mentalBreathText");
    if (!startBtn || !circle || !text) return;

    startBtn.addEventListener("click", () => {
      if (this.breathTimer) clearInterval(this.breathTimer);
      let step = 0;
      const phases = [
        { label: "Вдох", seconds: 4, expand: true },
        { label: "Задержка", seconds: 4, expand: true },
        { label: "Выдох", seconds: 6, expand: false },
      ];
      let phaseIndex = 0;
      let remain = phases[0].seconds;

      text.textContent = `${phases[0].label}: ${remain}`;
      circle.classList.toggle("expand", phases[0].expand);

      this.breathTimer = setInterval(() => {
        remain -= 1;
        if (remain <= 0) {
          phaseIndex = (phaseIndex + 1) % phases.length;
          remain = phases[phaseIndex].seconds;
          step += 1;
          if (step >= 9) {
            clearInterval(this.breathTimer);
            this.breathTimer = null;
            text.textContent = "Готово. Вы отлично справились.";
            circle.classList.remove("expand");
            return;
          }
        }
        text.textContent = `${phases[phaseIndex].label}: ${remain}`;
        circle.classList.toggle("expand", phases[phaseIndex].expand);
      }, 1000);
    });

    if (stopBtn) {
      stopBtn.addEventListener("click", () => {
        if (this.breathTimer) clearInterval(this.breathTimer);
        this.breathTimer = null;
        text.textContent = "Практика завершена вручную.";
        circle.classList.remove("expand");
      });
    }
  },

  setupOnboarding(root) {
    const done = localStorage.getItem(this.storageKeys.onboardingDone) === "true";
    if (done) return;

    const steps = [
      {
        title: "Добро пожаловать в Ментальный ассистент",
        text: "Этот модуль помогает мягко отслеживать состояние и поддерживать баланс между нагрузкой и восстановлением.",
      },
      {
        title: "Чекин и календарь",
        text: "Каждый день отметьте самочувствие и настроение. По этим отметкам формируется наглядная картина вашего состояния.",
      },
      {
        title: "FAQ и практики",
        text: "Используйте быстрые вопросы к помощнику и дыхательную паузу, когда нужно снизить стресс и вернуть фокус.",
      },
    ];

    let index = 0;
    const render = () => {
      const step = steps[index];
      const progress = ((index + 1) / steps.length) * 100;
      overlay.innerHTML = `
        <div class="mental-onboard-card">
          <div class="mental-onboard-step">Шаг ${index + 1} из ${steps.length}</div>
          <h3 class="mental-onboard-title">${this.escapeHtml(step.title)}</h3>
          <p class="mental-onboard-text">${this.escapeHtml(step.text)}</p>
          <div class="mental-onboard-progress"><div style="width:${progress}%"></div></div>
          <div class="mental-onboard-actions">
            <button class="mental-btn" id="mentalOnboardSkip">Пропустить</button>
            <button class="mental-btn" id="mentalOnboardNext">${
              index === steps.length - 1 ? "Начать" : "Далее"
            }</button>
          </div>
        </div>
      `;
      const skip = overlay.querySelector("#mentalOnboardSkip");
      const next = overlay.querySelector("#mentalOnboardNext");
      if (skip) skip.addEventListener("click", finish);
      if (next) {
        next.addEventListener("click", () => {
          if (index < steps.length - 1) {
            index += 1;
            render();
          } else {
            finish();
          }
        });
      }
    };

    const finish = () => {
      localStorage.setItem(this.storageKeys.onboardingDone, "true");
      overlay.remove();
    };

    const overlay = document.createElement("div");
    overlay.className = "mental-onboard-overlay";
    root.appendChild(overlay);
    render();
  },

  setupCheckin(root) {
    const saveBtn = root.querySelector("#mentalSaveCheckin");
    const done = root.querySelector("#mentalCheckinDone");
    const physicalButtons = Array.from(
      root.querySelectorAll('[data-group="physical"]')
    );
    const emotionalButtons = Array.from(
      root.querySelectorAll('[data-group="emotional"]')
    );
    const noteInput = root.querySelector("#mentalDailyNote");
    const sleepInput = root.querySelector("#mentalSleepHours");
    const sleepScoreText = root.querySelector("#mentalSleepScoreText");
    const sleepStepBtns = Array.from(root.querySelectorAll("[data-sleep-step]"));
    const sleepSetBtns = Array.from(root.querySelectorAll("[data-sleep-set]"));

    const state = { physical: "", emotional: "" };
    const calcSleepScore = (hours) => {
      if (!hours || hours <= 0) return 0;
      if (hours >= 7 && hours <= 9) return 10;
      if (hours >= 6 && hours < 7) return 8;
      if (hours > 9 && hours <= 10) return 7;
      if (hours >= 5 && hours < 6) return 6;
      return 4;
    };
    const bindGroup = (buttons, groupName) => {
      buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
          buttons.forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          state[groupName] = btn.getAttribute("data-value") || "";
        });
      });
    };
    bindGroup(physicalButtons, "physical");
    bindGroup(emotionalButtons, "emotional");

    if (sleepInput && sleepScoreText) {
      const clampSleep = (v) => {
        const min = Number(sleepInput.getAttribute("min") || 0);
        const max = Number(sleepInput.getAttribute("max") || 16);
        const step = Number(sleepInput.getAttribute("step") || 0.5) || 0.5;
        const snapped = Math.round(v / step) * step;
        const clamped = Math.min(max, Math.max(min, snapped));
        return +clamped.toFixed(2);
      };
      const setSleep = (v) => {
        const next = clampSleep(v);
        sleepInput.value = String(next % 1 === 0 ? Math.round(next) : next);
        sleepInput.dispatchEvent(new Event("input", { bubbles: true }));
      };
      const updateSleepLabel = () => {
        const hours = parseFloat(sleepInput.value) || 0;
        const score = calcSleepScore(hours);
        sleepScoreText.textContent = score
          ? `Оценка сна: ${score}/10`
          : "Оценка сна: —";
      };
      sleepInput.addEventListener("input", updateSleepLabel);
      updateSleepLabel();

      sleepStepBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          const step = parseFloat(btn.getAttribute("data-sleep-step") || "0") || 0;
          const cur = parseFloat(sleepInput.value || "0") || 0;
          setSleep(cur + step);
        });
      });
      sleepSetBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          const v = parseFloat(btn.getAttribute("data-sleep-set") || "0") || 0;
          setSleep(v);
        });
      });
    }

    if (!saveBtn || !done) return;
    saveBtn.addEventListener("click", () => {
      if (!state.physical || !state.emotional) {
        done.textContent = "Отметьте оба ответа, чтобы сохранить чекин.";
        return;
      }
      this.saveCheckin(state.physical, state.emotional, noteInput?.value || "");
      const checkins = this.loadCheckins();
      const today = this.todayKey();
      const todayRecord = checkins.find((item) => item.dateKey === today);
      if (todayRecord) {
        const hours = parseFloat(sleepInput?.value || "0") || 0;
        todayRecord.sleep_hours = hours;
        todayRecord.sleep_score = calcSleepScore(hours);
        this.saveCheckins(checkins);
      }
      done.textContent =
        "Чекин сохранен. Спасибо, что отметили состояние. Это поможет настроить нагрузку мягче.";
      this.renderActionCard(root);
      this.renderCheckinCalendar(root);
      this.renderWeeklyStats(root);
    });
  },

  async setupAdvice(root) {
    const adviceMount = root.querySelector("#mentalAdviceText");
    if (!adviceMount) return;
    this.advicePool = await this.loadAdvicePool();
    const advice = await this.resolveAdviceForToday();
    adviceMount.textContent = advice.text;
    if (this.adviceTimer) clearInterval(this.adviceTimer);
    this.adviceTimer = setInterval(() => this.rotateAdvice(root), 60000);
  },

  renderCheckinCalendar(root) {
    const mount = root.querySelector("#mentalCheckinCalendar");
    if (!mount) return;
    if (!this.calendarCursor) this.calendarCursor = new Date();
    const current = new Date(this.calendarCursor);
    const year = current.getFullYear();
    const month = current.getMonth();
    const checkins = this.loadCheckins();
    const checkinMap = {};
    const checkinDataMap = {};
    checkins.forEach((item) => {
      checkinMap[item.dateKey] = item.emotional_state;
      checkinDataMap[item.dateKey] = item;
    });

    const monthNames = [
      "Январь","Февраль","Март","Апрель","Май","Июнь",
      "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь",
    ];
    const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
    const firstDay = new Date(year, month, 1);
    let firstDayOfWeek = firstDay.getDay();
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    let gridHtml = weekDays
      .map((name) => `<div class="mental-calendar-dayname">${name}</div>`)
      .join("");

    for (let i = 0; i < firstDayOfWeek; i += 1) {
      gridHtml += `<div class="mental-calendar-day muted">${prevMonthDays - firstDayOfWeek + i + 1}</div>`;
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;
      const emotional = checkinMap[dateKey];
      const stateClass = emotional ? ` ${emotional}` : "";
      gridHtml += `<div class="mental-calendar-day${stateClass}" data-date="${dateKey}" title="${this.escapeHtml(
        emotional || "Нет чекина"
      )}">${day}</div>`;
    }

    mount.innerHTML = `
      <div class="mental-calendar">
        <div class="mental-calendar-head">
          <button class="mental-btn" id="mentalCalPrev">‹</button>
          <strong>${monthNames[month]} ${year}</strong>
          <button class="mental-btn" id="mentalCalNext">›</button>
        </div>
        <div class="mental-calendar-grid">${gridHtml}</div>
        <div class="mental-calendar-legend">
          <span><i class="mental-dot" style="background: rgba(92, 132, 224, 0.95)"></i>Спокойствие</span>
          <span><i class="mental-dot" style="background: rgba(214, 161, 66, 0.95)"></i>Тревога</span>
          <span><i class="mental-dot" style="background: rgba(215, 92, 106, 0.95)"></i>Раздражение</span>
          <span><i class="mental-dot" style="background: rgba(96, 186, 119, 0.95)"></i>Все отлично</span>
        </div>
        <div class="mental-day-details" id="mentalDayDetails">
          <h4>Детали дня</h4>
          <div class="mental-day-item">Выберите дату в календаре</div>
        </div>
      </div>
    `;

    const prev = mount.querySelector("#mentalCalPrev");
    const next = mount.querySelector("#mentalCalNext");
    if (prev) {
      prev.addEventListener("click", () => {
        this.calendarCursor = new Date(year, month - 1, 1);
        this.renderCheckinCalendar(root);
      });
    }
    if (next) {
      next.addEventListener("click", () => {
        this.calendarCursor = new Date(year, month + 1, 1);
        this.renderCheckinCalendar(root);
      });
    }
    const details = mount.querySelector("#mentalDayDetails");
    mount.querySelectorAll(".mental-calendar-day[data-date]").forEach((el) => {
      el.addEventListener("click", () => {
        const date = el.getAttribute("data-date");
        if (!date || !details) return;
        const rec = checkinDataMap[date];
        if (!rec) {
          details.innerHTML = `
            <h4>Детали дня</h4>
            <div class="mental-day-item"><strong>Дата:</strong> ${date}</div>
            <div class="mental-day-item">Чекин не заполнялся</div>
          `;
          return;
        }
        const moodMap = {
          calm: "Спокойствие",
          anxious: "Тревога",
          irritated: "Раздражение",
          happy: "Все отлично",
        };
        const physMap = {
          energetic: "Полон сил",
          normal: "Нормально",
          tired: "Уставший",
          exhausted: "Выжатый как лимон",
        };
        details.innerHTML = `
          <h4>Детали дня</h4>
          <div class="mental-day-item"><strong>Дата:</strong> ${date}</div>
          <div class="mental-day-item"><strong>Самочувствие:</strong> ${physMap[rec.physical_state] || rec.physical_state}</div>
          <div class="mental-day-item"><strong>Настроение:</strong> ${moodMap[rec.emotional_state] || rec.emotional_state}</div>
          <div class="mental-day-item"><strong>Сон:</strong> ${
            rec.sleep_hours ? rec.sleep_hours + " ч" : "—"
          } · ${rec.sleep_score ? rec.sleep_score + "/10" : "без оценки"}</div>
          <div class="mental-day-item"><strong>Заметка:</strong> ${this.escapeHtml(rec.note || "—")}</div>
        `;
      });
    });
  },

  render(mountId) {
    const root = document.getElementById(mountId);
    if (!root) return;
    this.ensureStyles();

    root.innerHTML = `
      <div class="mental-wrap">
        <section class="mental-card">
          <div class="mental-top-actions">
            <div>
              <h1 class="mental-title">Ментальный ассистент</h1>
              <p class="mental-sub">
                Мягкий помощник, который помогает держать баланс между нагрузкой и отдыхом простым и дружелюбным языком.
              </p>
            </div>
            <span class="mental-badge">Серия: ${this.getCheckinStreak()} дн.</span>
          </div>
        </section>

        <section class="mental-card mental-advice-card">
          <div class="mental-advice-label">Совет дня</div>
          <p class="mental-advice-text mental-sub" id="mentalAdviceText">Загружаем карточку дня...</p>
          <div class="mental-row" style="margin-top:14px;position:relative;z-index:1">
            <button class="mental-btn" id="mentalOpenCalendar">Календарь настроения</button>
          </div>
          <div id="mentalWeeklyStats"></div>
        </section>

        <section class="mental-card">
          <h3>1-минутная дыхательная пауза</h3>
          <p class="mental-sub">Короткая практика для снижения напряжения прямо в приложении.</p>
          <div class="mental-breath">
            <div class="mental-breath-circle" id="mentalBreathCircle">🫧</div>
            <div class="mental-breath-text" id="mentalBreathText">Нажмите старт, чтобы начать цикл дыхания</div>
            <div class="mental-row" style="justify-content:center">
              <button class="mental-btn" id="mentalStartBreath">Старт</button>
              <button class="mental-btn" id="mentalStopBreath">Завершить</button>
            </div>
          </div>
        </section>

        <div class="mental-grid">
          <section class="mental-card mental-equal-card">
            <h3>Ежедневный чекин</h3>
            <p class="mental-sub" style="margin-bottom:10px">Отметьте состояние — ассистент и аватар подстроят подсказки.</p>
            <div class="mental-checkin-shell">
              <div class="mental-checkin-inner">
                <div class="mental-checkin-scroll">
                  <div class="mental-checkin-group">
                    <p class="mental-checkin-q">Тело и ресурс</p>
                    <div class="mental-row">
                      <button type="button" class="mental-chip" data-group="physical" data-value="energetic">😊 Полон сил</button>
                      <button type="button" class="mental-chip" data-group="physical" data-value="normal">😐 Нормально</button>
                      <button type="button" class="mental-chip" data-group="physical" data-value="tired">😞 Усталость</button>
                      <button type="button" class="mental-chip" data-group="physical" data-value="exhausted">😫 Сильное истощение</button>
                    </div>
                  </div>
                  <div class="mental-checkin-group">
                    <p class="mental-checkin-q">Настроение</p>
                    <div class="mental-row">
                      <button type="button" class="mental-chip" data-group="emotional" data-value="calm">Спокойно</button>
                      <button type="button" class="mental-chip" data-group="emotional" data-value="anxious">Тревожно</button>
                      <button type="button" class="mental-chip" data-group="emotional" data-value="irritated">Раздражение</button>
                      <button type="button" class="mental-chip" data-group="emotional" data-value="happy">Хорошо</button>
                    </div>
                  </div>
                  <div class="mental-checkin-group">
                    <p class="mental-checkin-q">Сон (часы)</p>
                    <div class="mental-sleep-row">
                      <div class="mental-sleep-top">
                        <div class="mental-sleep-stepper" aria-label="Сон в часах">
                          <button type="button" class="mental-sleep-step-btn" data-sleep-step="-0.5" aria-label="Минус полчаса">−</button>
                          <input id="mentalSleepHours" type="number" min="0" max="16" step="0.5" class="mental-mini-input" placeholder="Например 7.5" />
                          <button type="button" class="mental-sleep-step-btn" data-sleep-step="0.5" aria-label="Плюс полчаса">+</button>
                        </div>
                        <span class="mental-sleep-pill" id="mentalSleepScoreText">Оценка сна: —</span>
                      </div>
                      <div class="mental-sleep-quick" aria-label="Быстрый выбор часов сна">
                        <button type="button" class="mental-chip mental-sleep-chip" data-sleep-set="6">6</button>
                        <button type="button" class="mental-chip mental-sleep-chip" data-sleep-set="7">7</button>
                        <button type="button" class="mental-chip mental-sleep-chip" data-sleep-set="8">8</button>
                        <button type="button" class="mental-chip mental-sleep-chip" data-sleep-set="9">9</button>
                      </div>
                    </div>
                  </div>
                  <textarea id="mentalDailyNote" class="mental-mini-input" maxlength="240" placeholder="Заметка дня: что поддержало, что забрало энергию"></textarea>
                </div>
                <div class="mental-row" style="margin-top:12px">
                  <button type="button" class="mental-btn" id="mentalSaveCheckin">Сохранить чекин</button>
                </div>
                <div class="mental-note" id="mentalCheckinDone"></div>
              </div>
            </div>
          </section>

          <section class="mental-card mental-equal-card mental-help-column">
            <h3 style="margin:0 0 6px 0;">Психологическая помощь</h3>
            <p class="mental-sub" style="margin:0 0 10px 0">
              Когда тяжело справиться одному — обратитесь к профессионалам. Ниже — бесплатные федеральные линии и ссылка на официальный ресурс Минздрава России.
            </p>
            <div class="mental-help-hub" role="region" aria-label="Контакты психологической помощи">
              <div class="mental-help-inner">
                <span class="mental-help-kicker">Поддержка 24/7</span>
                <h4 class="mental-help-title">Вы не обязаны справляться в одиночку</h4>
                <p class="mental-help-lead">
                  Звонки по России бесплатны. В остром кризисе или при угрозе жизни и здоровью звоните <strong>112</strong>.
                </p>
                <div class="mental-help-list">
                  <a class="mental-help-card" href="tel:+78002000122" rel="noopener noreferrer">
                    <span class="mental-help-icon" aria-hidden="true">☎</span>
                    <div class="mental-help-card-body">
                      <p class="mental-help-card-title">Детский телефон доверия</p>
                      <p class="mental-help-card-meta">8&nbsp;800&nbsp;2000&nbsp;122 · для детей, подростков и родителей</p>
                    </div>
                    <span class="mental-help-arrow" aria-hidden="true">→</span>
                  </a>
                  <a class="mental-help-card" href="tel:+78003334434" rel="noopener noreferrer">
                    <span class="mental-help-icon" aria-hidden="true">💬</span>
                    <div class="mental-help-card-body">
                      <p class="mental-help-card-title">Телефон доверия</p>
                      <p class="mental-help-card-meta">8&nbsp;800&nbsp;333&nbsp;44&nbsp;34 · психологическая помощь и поддержка</p>
                    </div>
                    <span class="mental-help-arrow" aria-hidden="true">→</span>
                  </a>
                  <a class="mental-help-card" href="tel:+78006003114" rel="noopener noreferrer">
                    <span class="mental-help-icon" aria-hidden="true">🛡</span>
                    <div class="mental-help-card-body">
                      <p class="mental-help-card-title">НМИЦ им. Сербского (Минздрав России)</p>
                      <p class="mental-help-card-meta">8&nbsp;800&nbsp;600&nbsp;31&nbsp;14 · консультации по психическому здоровью</p>
                    </div>
                    <span class="mental-help-arrow" aria-hidden="true">→</span>
                  </a>
                </div>
                <div class="mental-help-site-row">
                  <a
                    class="mental-help-site"
                    href="https://minzdrav.gov.ru/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >Сайт Минздрава России — разделы о помощи населению ↗</a>
                </div>
                <p class="mental-help-disclaimer">
                  Номера приведены для ориентира; актуальные контакты и региональные службы уточняйте на официальных сайтах ведомств. Этот раздел приложения не заменяет очный приём врача или психотерапевта.
                </p>
              </div>
            </div>
          </section>
        </div>

        <section class="mental-card" id="mentalActionRequired"></section>

        <div class="mental-calendar-backdrop" id="mentalCalendarBackdrop"></div>
        <aside class="mental-calendar-drawer" id="mentalCalendarDrawer">
          <div class="mental-calendar-drawer-head">
            <h3>Календарь настроения</h3>
            <button class="mental-btn" id="mentalCloseCalendar">Закрыть</button>
          </div>
          <p class="mental-sub">Отслеживайте динамику состояния по датам.</p>
          <div id="mentalCheckinCalendar"></div>
        </aside>
      </div>
    `;

    this.setupAdvice(root);
    if (!this.hasCheckinToday()) {
      const info = root.querySelector("#mentalCheckinDone");
      if (info) {
        info.textContent =
          "Это первый вход сегодня. Отметьте состояние, чтобы ассистент подстроил рекомендации.";
      }
    } else {
      const info = root.querySelector("#mentalCheckinDone");
      if (info) {
        info.textContent =
          "Чекин за сегодня уже есть. Можно обновить его, если состояние изменилось.";
      }
    }
    this.setupCheckin(root);
    this.setupCalendarDrawer(root);
    this.setupBreathing(root);
    this.setupOnboarding(root);
    this.renderActionCard(root);
    this.renderCheckinCalendar(root);
    this.renderWeeklyStats(root);
  },
};
