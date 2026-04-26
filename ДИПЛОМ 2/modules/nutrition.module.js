window.AppModules = window.AppModules || {};

window.AppModules.nutrition = {
  storage: {
    entries: "nutritionEntries_v1",
    products: "nutritionCustomProducts_v1",
    day: "nutritionSelectedDay_v1",
    monthCursor: "nutritionMonthCursor_v1",
    customMeals: "nutritionCustomMeals_v1",
    mealFold: "nutritionMealFold_v1",
  },
  chart: null,
  ui: {
    openMeal: null,
  },

  ensureStyles() {
    document.getElementById("nutrition-module-styles")?.remove();
    document.getElementById("nutrition-module-styles-v2")?.remove();
    document.getElementById("nutrition-module-styles-v3")?.remove();
    if (document.getElementById("nutrition-module-styles-v4")) return;
    const style = document.createElement("style");
    style.id = "nutrition-module-styles-v4";
    style.textContent = `
      .nutrition-shell { max-width: 980px; margin: 0 auto; padding: 0 4px; display: grid; gap: 16px; }
      /* Смягчаем глобальный button:hover (scale 1.03 + градиент) из styles.css */
      .nutrition-shell button {
        transition:
          background 0.32s cubic-bezier(0.22, 1, 0.36, 1),
          border-color 0.28s ease,
          color 0.22s ease,
          box-shadow 0.38s cubic-bezier(0.22, 1, 0.36, 1),
          transform 0.38s cubic-bezier(0.22, 1, 0.36, 1),
          filter 0.26s ease,
          opacity 0.2s ease;
      }
      .nutrition-shell button:hover {
        transform: translateY(-1px) scale(1.01);
        box-shadow: 0 5px 18px rgba(0, 0, 0, 0.14);
        filter: brightness(1.035);
      }
      .nutrition-shell button:active {
        transform: translateY(0) scale(0.992);
        transition-duration: 0.12s;
      }
      .nutrition-page-head { margin-bottom: 0; }
      .nutrition-page-head h1 { margin: 0 0 8px 0; font-size: 26px; font-weight: 700; color: #f8f4ff; letter-spacing: -0.02em; }
      .nutrition-page-head p { margin: 0; font-size: 15px; line-height: 1.5; color: #d4c4f2; }
      .nutrition-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(300px, 34%); gap: 16px; align-items: start; }
      .nutrition-col-main { min-width: 0; }
      .nutrition-col-side { display: grid; gap: 16px; min-width: 0; }
      .nutrition-card {
        background: linear-gradient(160deg, rgba(147,126,214,0.16), rgba(84,73,150,0.1));
        border: 1px solid rgba(171,148,230,0.35);
        border-radius: 16px;
        padding: 18px 18px 16px;
        box-shadow: 0 12px 32px rgba(18, 12, 34, 0.22);
      }
      .nutrition-diary-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
      .nutrition-diary-actions { display:flex; gap:10px; align-items:center; flex-wrap: wrap; }
      .nutrition-add-meal-slot {
        border-radius: 12px;
        border: 1px dashed rgba(194,168,250,0.55);
        background: rgba(124, 92, 255, 0.12);
        color: #efe8ff;
        font-size: 14px;
        font-weight: 700;
        padding: 10px 14px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        transition: border-color 0.2s ease, background 0.2s ease, transform 0.15s ease;
      }
      .nutrition-add-meal-slot:hover {
        border-color: rgba(220,200,255,0.85);
        background: rgba(124, 92, 255, 0.22);
        transform: translateY(-0.5px) scale(1.004);
        box-shadow: none;
        filter: brightness(1.03);
      }
      .nutrition-meal-slot { margin-top: 12px; border-radius: 14px; border: 1px solid rgba(180, 160, 235, 0.22); background: rgba(22, 16, 42, 0.35); overflow: hidden; }
      .nutrition-meal-slot:first-of-type { margin-top: 0; }
      .nutrition-meal-slot-head { display: flex; align-items: stretch; gap: 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
      .nutrition-meal-slot-head .nutrition-meal-bar { flex: 1; border-bottom: none; }
      .nutrition-meal-bar {
        width: 100%;
        border: none;
        background: rgba(255,255,255,0.04);
        padding: 12px 14px;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        color: #f4ecff;
        text-align: left;
        border-radius: 0;
        font-weight: 700;
        box-shadow: none;
      }
      .nutrition-shell button.nutrition-meal-bar:hover {
        transform: none;
        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.09);
        filter: none;
      }
      .nutrition-shell button.nutrition-meal-bar:active {
        transform: scale(0.998);
        box-shadow: inset 0 1px 3px rgba(0,0,0,0.12);
      }
      .nutrition-meal-bar-chev {
        width: 22px;
        height: 22px;
        font-size: 11px;
        line-height: 1;
        color: #cbb8f0;
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        background: rgba(0,0,0,0.14);
        transition: transform 0.42s cubic-bezier(0.32, 0.72, 0, 1), color 0.2s ease, background 0.2s ease;
      }
      .nutrition-meal-slot.is-meal-collapsed .nutrition-meal-bar-chev { transform: rotate(-90deg); color: #a894d4; }
      .nutrition-meal-bar-title { flex: 1; font-size: 16px; font-weight: 700; letter-spacing: -0.01em; }
      .nutrition-meal-bar-kcal { font-size: 13px; font-weight: 600; color: #9cf5e0; white-space: nowrap; }
      .nutrition-meal-bar-del {
        border: none;
        border-left: 1px solid rgba(255,255,255,0.08);
        background: rgba(0,0,0,0.12);
        color: #c4a8e8;
        font-size: 20px;
        line-height: 1;
        cursor: pointer;
        padding: 0 14px;
        flex-shrink: 0;
        align-self: stretch;
      }
      .nutrition-shell button.nutrition-meal-bar-del:hover {
        color: #ffb4c0;
        background: rgba(255,80,100,0.12);
        transform: none;
        box-shadow: none;
        filter: brightness(1.04);
      }
      .nutrition-shell button.nutrition-meal-bar-del:active {
        transform: scale(0.97);
      }
      .nutrition-meal-body {
        display: grid;
        grid-template-rows: 1fr;
        border-top: 1px solid rgba(255,255,255,0.06);
        overflow: hidden;
        transition: grid-template-rows 0.45s cubic-bezier(0.32, 0.72, 0, 1), border-color 0.32s ease;
      }
      .nutrition-meal-body.is-collapsed {
        grid-template-rows: 0fr;
        border-top-color: transparent;
      }
      .nutrition-meal-body-inner {
        min-height: 0;
        overflow: hidden;
        padding: 12px 14px 14px;
        opacity: 1;
        transform: translateY(0);
        transition: opacity 0.28s ease 0.04s, transform 0.42s cubic-bezier(0.32, 0.72, 0, 1);
      }
      .nutrition-meal-body.is-collapsed .nutrition-meal-body-inner {
        opacity: 0;
        transform: translateY(-6px);
        pointer-events: none;
        transition: opacity 0.22s ease, transform 0.36s cubic-bezier(0.32, 0.72, 0, 1);
      }
      .nutrition-diary-head h2 { margin: 0; font-size: 18px; font-weight: 600; color: #f4ecff; }
      .nutrition-diary-date { font-size: 14px; color: #d8cbf6; margin: 0; }
      .nutrition-add-bar { display: grid; grid-template-columns: 1fr 88px 140px auto auto; gap: 10px; align-items: stretch; margin-bottom: 16px; }
      .nutrition-add-bar input, .nutrition-add-bar select {
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(12, 8, 28, 0.42);
        color: #f4ecff;
        padding: 11px 12px;
        font-size: 15px;
        width: 100%;
        box-sizing: border-box;
      }
      .nutrition-add-bar select { cursor: pointer; }
      .nutrition-btn-primary {
        border-radius: 12px;
        border: none;
        padding: 0 18px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        background: linear-gradient(135deg, #7c5cff, #3ab89a);
        color: #fff;
        white-space: nowrap;
        box-shadow: 0 6px 18px rgba(60, 40, 120, 0.38);
      }
      .nutrition-btn-primary:hover { filter: brightness(1.05); }
      .nutrition-btn-ghost {
        border-radius: 12px;
        border: 1px solid rgba(194,168,250,0.45);
        padding: 0 14px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        background: rgba(255,255,255,0.06);
        color: #efe8ff;
        white-space: nowrap;
      }
      .nutrition-btn-ghost:hover { border-color: rgba(220,200,255,0.6); background: rgba(255,255,255,0.1); }
      .nutrition-meal-block { margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08); }
      .nutrition-meal-block:first-of-type { margin-top: 0; padding-top: 0; border-top: none; }
      .nutrition-meal-toggle {
        width: 100%;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.04);
        border-radius: 12px;
        padding: 10px 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        cursor: pointer;
        color: #f0e8ff;
        text-align: left;
        transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
      }
      .nutrition-meal-toggle:hover { background: rgba(255,255,255,0.07); border-color: rgba(220,200,255,0.25); }
      .nutrition-meal-toggle:active { transform: scale(0.995); }
      .nutrition-meal-title { margin: 0; font-size: 13px; font-weight: 700; color: #d4c4f8; text-transform: uppercase; letter-spacing: 0.06em; }
      .nutrition-meal-hint { font-size: 12px; color: #bfaee6; font-weight: 600; }
      .nutrition-meal-chevron { width: 26px; height: 26px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.18); display:grid; place-items:center; flex-shrink:0; }
      .nutrition-meal-block.is-open .nutrition-meal-chevron { background: rgba(124, 92, 255, 0.18); border-color: rgba(200, 175, 255, 0.25); }
      .nutrition-meal-form {
        display: none;
        margin-top: 10px;
        padding: 12px;
        border-radius: 12px;
        background: rgba(12, 8, 28, 0.35);
        border: 1px solid rgba(180, 160, 235, 0.16);
      }
      .nutrition-meal-block.is-open .nutrition-meal-form { display: block; }
      .nutrition-form-switch { display:flex; gap:8px; flex-wrap: wrap; margin-bottom: 10px; }
      .nutrition-pill {
        border-radius: 999px;
        border: 1px solid rgba(194,168,250,0.5);
        background: rgba(255,255,255,0.06);
        color: #efe8ff;
        padding: 8px 12px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 700;
        transition: border-color 0.15s ease, background 0.15s ease, transform 0.1s ease;
        user-select: none;
      }
      .nutrition-pill:hover { border-color: rgba(220,200,255,0.75); background: rgba(255,255,255,0.1); }
      .nutrition-pill:active { transform: scale(0.99); }
      .nutrition-pill.is-active { border-color: rgba(208, 183, 255, 0.95); background: rgba(124, 92, 255, 0.16); }
      .nutrition-form-grid { display: grid; grid-template-columns: 1fr 120px; gap: 10px; align-items: start; }
      .nutrition-form-grid .full { grid-column: 1 / -1; }
      .nutrition-form-grid label { font-size: 12px; color: #cbbbe8; display: grid; gap: 6px; }
      .nutrition-form-grid input {
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(0,0,0,0.16);
        color: #f4ecff;
        padding: 10px 12px;
        font-size: 14px;
        width: 100%;
        box-sizing: border-box;
      }
      .nutrition-form-macros { display:grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 10px; }
      .nutrition-db-row { display:grid; grid-template-columns: 1fr 120px; gap: 10px; align-items: end; }
      .nutrition-db-row .full { grid-column: 1 / -1; }
      .nutrition-db-row select, .nutrition-db-row input {
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(0,0,0,0.16);
        color: #f4ecff;
        padding: 10px 12px;
        font-size: 14px;
        width: 100%;
        box-sizing: border-box;
      }
      .nutrition-db-row select { cursor: pointer; }
      .nutrition-mini-help { font-size: 12px; color: #bfaee6; margin-top: 8px; line-height: 1.45; }
      .nutrition-form-actions { display:flex; gap:10px; justify-content: flex-end; margin-top: 12px; }
      .nutrition-btn-mini { border-radius: 12px; border: 1px solid rgba(194,168,250,0.5); background: rgba(255,255,255,0.06); color: #efe8ff; padding: 10px 14px; cursor:pointer; font-size: 14px; font-weight: 700; }
      .nutrition-btn-mini:hover { border-color: rgba(220,200,255,0.7); background: rgba(255,255,255,0.1); }
      .nutrition-btn-mini.primary { border: none; background: linear-gradient(135deg, #7c5cff, #3ab89a); color:#fff; box-shadow: 0 6px 18px rgba(60, 40, 120, 0.32); }
      .nutrition-btn-mini.primary:hover { filter: brightness(1.05); }
      .nutrition-list { display: flex; flex-direction: column; gap: 8px; }
      .nutrition-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px 14px;
        border-radius: 12px;
        background: rgba(74, 58, 126, 0.22);
        border: 1px solid rgba(180, 160, 235, 0.22);
        font-size: 15px;
      }
      .nutrition-item strong { font-weight: 600; color: #fff; display: block; font-size: 15px; }
      .nutrition-item-meta { font-size: 13px; color: #c9b8ec; margin-top: 4px; }
      .nutrition-item-del { flex-shrink: 0; border: none; background: transparent; color: #d4b8f0; font-size: 14px; cursor: pointer; padding: 6px 8px; border-radius: 8px; }
      .nutrition-item-del:hover { color: #ffb4c0; background: rgba(255,80,100,0.1); }
      .nutrition-empty { font-size: 15px; color: #b8a8dc; line-height: 1.55; margin-top: 6px; }
      .nutrition-side-summary h3 { margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #e8dcff; text-transform: uppercase; letter-spacing: 0.05em; }
      .nutrition-macro-chart-wrap {
        width: 100%;
        max-width: 304px;
        margin: 4px auto 12px;
        min-height: 300px;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .nutrition-macro-chart-wrap canvas { display: block; max-width: 100%; height: auto !important; }
      .nutrition-macro-fallback {
        width: 100%;
        max-width: 260px;
        aspect-ratio: 1 / 1;
        display: grid;
        place-items: center;
        margin: 0 auto;
      }
      .nutrition-macro-fallback svg { width: 100%; height: 100%; display: block; }
      .nutrition-kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
      .nutrition-kpi {
        border-radius: 12px;
        padding: 12px 14px;
        background: rgba(0,0,0,0.2);
        border: 1px solid rgba(255,255,255,0.08);
        font-size: 13px;
        color: #d8cbf6;
      }
      .nutrition-kpi-value { font-size: 20px; font-weight: 700; color: #fff; margin-top: 4px; }
      .nutrition-cal-wrap { padding: 0; overflow: hidden; }
      .nutrition-cal-surface { padding: 16px 16px 14px; }
      .nutrition-cal-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
      .nutrition-cal-head strong { font-size: 17px; font-weight: 600; color: #fdf8ff; letter-spacing: -0.01em; }
      .nutrition-cal-nav { display: flex; gap: 6px; }
      .nutrition-cal-nav button {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.08);
        color: #f0e8ff;
        font-size: 18px;
        line-height: 1;
        cursor: pointer;
        display: grid;
        place-items: center;
        padding: 0;
        transition: background 0.15s ease, border-color 0.15s ease;
      }
      .nutrition-cal-nav button:hover { background: rgba(255,255,255,0.14); border-color: rgba(220,200,255,0.4); }
      .nutrition-cal-today-link { font-size: 13px; font-weight: 600; color: #9cf5e0; background: none; border: none; cursor: pointer; padding: 6px 8px; border-radius: 8px; }
      .nutrition-cal-today-link:hover { text-decoration: underline; background: rgba(255,255,255,0.06); }
      .nutrition-cal-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 6px; }
      .nutrition-cal-weekdays span { text-align: center; font-size: 12px; font-weight: 600; color: #a898d4; text-transform: uppercase; letter-spacing: 0.04em; }
      .nutrition-calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; }
      .nutrition-cal-pad { min-height: 40px; }
      .nutrition-day {
        min-height: 44px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.05);
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 5px 3px;
        transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
      }
      .nutrition-day:hover { background: rgba(255,255,255,0.1); border-color: rgba(220,203,255,0.25); }
      .nutrition-day:focus { outline: none; }
      .nutrition-day:focus-visible {
        box-shadow: 0 0 0 2px rgba(156, 245, 224, 0.45);
        border-color: rgba(156, 245, 224, 0.55);
      }
      .nutrition-day-num { font-size: 15px; font-weight: 700; color: #fff; line-height: 1.1; }
      .nutrition-day-kcal { font-size: 12px; color: #b8a8dc; line-height: 1.15; margin-top: 2px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .nutrition-day.is-selected {
        background: linear-gradient(145deg, rgba(124, 92, 255, 0.55), rgba(58, 184, 154, 0.38));
        border-color: rgba(255,255,255,0.32);
        box-shadow: 0 4px 16px rgba(40, 24, 80, 0.35);
      }
      .nutrition-day.is-selected .nutrition-day-num { color: #fff; }
      .nutrition-day.is-selected .nutrition-day-kcal { color: #e8faf6; }
      .nutrition-day.has-data:not(.is-selected) .nutrition-day-kcal { color: #9cdbcf; }
      .nutrition-modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 6000;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: rgba(8, 6, 18, 0.72);
        backdrop-filter: blur(8px);
      }
      .nutrition-modal-overlay.is-on { display: flex; }
      .nutrition-modal {
        width: min(440px, 100%);
        max-height: min(90vh, 640px);
        overflow: auto;
        border-radius: 18px;
        padding: 22px 22px 20px;
        border: 1px solid rgba(200, 175, 255, 0.45);
        background: linear-gradient(165deg, rgba(42, 30, 78, 0.98), rgba(18, 14, 36, 0.98));
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
      }
      .nutrition-modal h3 {
        margin: 0 0 8px 0;
        font-size: 20px;
        font-weight: 800;
        color: #f4ecff;
        letter-spacing: -0.02em;
      }
      .nutrition-modal-hint {
        margin: 0 0 16px 0;
        font-size: 14px;
        line-height: 1.5;
        color: #c9b8ec;
      }
      .nutrition-modal-field {
        display: grid;
        gap: 8px;
        margin-bottom: 14px;
      }
      .nutrition-modal-field span {
        font-size: 12px;
        font-weight: 700;
        color: #cbb8e8;
        letter-spacing: 0.03em;
        text-transform: uppercase;
      }
      .nutrition-modal-field input,
      .nutrition-modal-grid input {
        border-radius: 12px;
        border: 1px solid rgba(194, 168, 250, 0.4);
        background: rgba(12, 8, 28, 0.55);
        color: #f4ecff;
        padding: 12px 14px;
        font-size: 15px;
        width: 100%;
        box-sizing: border-box;
      }
      .nutrition-modal-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 8px;
      }
      .nutrition-modal-grid label {
        display: grid;
        gap: 6px;
        font-size: 12px;
        font-weight: 600;
        color: #cbb8e8;
      }
      .nutrition-modal-grid .full { grid-column: 1 / -1; }
      .nutrition-modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 18px;
      }
      .nutrition-modal-btn {
        border-radius: 12px;
        padding: 11px 18px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        border: 1px solid rgba(194, 168, 250, 0.45);
        background: rgba(255, 255, 255, 0.08);
        color: #efe8ff;
      }
      .nutrition-modal-btn.ghost:hover {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(220, 200, 255, 0.55);
      }
      .nutrition-modal-btn.primary {
        border: none;
        color: #0f172a;
        background: linear-gradient(135deg, #c4b5fd, #5eead4);
        box-shadow: 0 8px 22px rgba(40, 24, 80, 0.4);
      }
      .nutrition-shell .nutrition-modal-btn.primary:hover {
        transform: translateY(-1px) scale(1.02);
        filter: brightness(1.05);
      }
      .nutrition-shell .nutrition-modal-btn.ghost:hover {
        transform: translateY(-1px) scale(1.01);
        filter: none;
      }
      .nutrition-shell .nutrition-modal-btn:active {
        transform: translateY(0) scale(0.99);
      }
      @media (max-width: 900px) {
        .nutrition-layout { grid-template-columns: 1fr; }
        .nutrition-add-bar { grid-template-columns: 1fr 1fr; }
        .nutrition-add-bar #nutritionProduct { grid-column: 1 / -1; }
        .nutrition-form-grid { grid-template-columns: 1fr; }
        .nutrition-form-macros { grid-template-columns: 1fr 1fr; }
        .nutrition-modal-grid { grid-template-columns: 1fr; }
      }
      body.light-theme .nutrition-card {
        background: linear-gradient(180deg, #ffffff, #f5f9ff);
        border-color: rgba(52, 72, 100, 0.14);
        box-shadow: 0 8px 28px rgba(15, 23, 42, 0.08);
      }
      body.light-theme .nutrition-page-head h1 { color: #1e293b; }
      body.light-theme .nutrition-page-head p { color: #64748b; }
      body.light-theme .nutrition-diary-head h2 { color: #1e293b; }
      body.light-theme .nutrition-diary-date { color: #64748b; }
      body.light-theme .nutrition-add-bar input, body.light-theme .nutrition-add-bar select { background: #f8fafc; color: #1e293b; border-color: rgba(60, 81, 114, 0.18); }
      body.light-theme .nutrition-item { background: #f1f5f9; border-color: rgba(60, 81, 114, 0.12); }
      body.light-theme .nutrition-item strong { color: #0f172a; }
      body.light-theme .nutrition-item-meta { color: #64748b; }
      body.light-theme .nutrition-meal-toggle { background: #f8fafc; border-color: rgba(60, 81, 114, 0.12); color: #0f172a; }
      body.light-theme .nutrition-meal-title { color: #4f46e5; }
      body.light-theme .nutrition-meal-hint { color: #64748b; }
      body.light-theme .nutrition-meal-chevron { background: #fff; border-color: rgba(60, 81, 114, 0.14); }
      body.light-theme .nutrition-meal-form { background: #f8fafc; border-color: rgba(60, 81, 114, 0.14); }
      body.light-theme .nutrition-form-grid input { background: #fff; border-color: rgba(60, 81, 114, 0.16); color: #0f172a; }
      body.light-theme .nutrition-pill { background: #fff; color: #0f172a; border-color: rgba(60, 81, 114, 0.18); }
      body.light-theme .nutrition-pill.is-active { background: rgba(99, 102, 241, 0.12); border-color: rgba(99, 102, 241, 0.35); }
      body.light-theme .nutrition-db-row select, body.light-theme .nutrition-db-row input { background: #fff; color: #0f172a; border-color: rgba(60, 81, 114, 0.16); }
      body.light-theme .nutrition-btn-mini { background: #fff; color: #0f172a; border-color: rgba(60, 81, 114, 0.18); }
      body.light-theme .nutrition-btn-mini.primary { color: #fff; }
      body.light-theme .nutrition-cal-head strong { color: #0f172a; }
      body.light-theme .nutrition-day-num { color: #0f172a; }
      body.light-theme .nutrition-day { background: rgba(248, 250, 252, 0.95); border-color: rgba(60, 81, 114, 0.1); }
      body.light-theme .nutrition-day-kcal { color: #64748b; }
      body.light-theme .nutrition-meal-slot { background: #f8fafc; border-color: rgba(60, 81, 114, 0.12); }
      body.light-theme .nutrition-meal-bar { color: #0f172a; background: #fff; }
      body.light-theme .nutrition-shell button.nutrition-meal-bar:hover {
        background: #f8fafc;
        box-shadow: inset 0 0 0 1px rgba(60, 81, 114, 0.12);
      }
      body.light-theme .nutrition-meal-bar-kcal { color: #059669; }
      body.light-theme .nutrition-meal-bar-chev { background: #eef2ff; color: #475569; }
      body.light-theme .nutrition-meal-slot.is-meal-collapsed .nutrition-meal-bar-chev { color: #64748b; }
      body.light-theme .nutrition-meal-body { border-top-color: rgba(60, 81, 114, 0.1); }
      body.light-theme .nutrition-add-meal-slot { background: rgba(99, 102, 241, 0.1); color: #334155; border-color: rgba(99, 102, 241, 0.35); }
      body.light-theme .nutrition-modal {
        background: linear-gradient(180deg, #ffffff, #f3f6ff);
        border-color: rgba(60, 81, 114, 0.16);
        box-shadow: 0 20px 50px rgba(15, 23, 42, 0.15);
      }
      body.light-theme .nutrition-modal h3 { color: #0f172a; }
      body.light-theme .nutrition-modal-hint { color: #64748b; }
      body.light-theme .nutrition-modal-field span,
      body.light-theme .nutrition-modal-grid label { color: #475569; }
      body.light-theme .nutrition-modal-field input,
      body.light-theme .nutrition-modal-grid input {
        background: #fff;
        color: #0f172a;
        border-color: rgba(60, 81, 114, 0.18);
      }
      body.light-theme .nutrition-modal-btn.ghost {
        background: #f1f5f9;
        color: #334155;
        border-color: rgba(60, 81, 114, 0.18);
      }
      body.light-theme .nutrition-modal-overlay { background: rgba(15, 23, 42, 0.42); }
    `;
    document.head.appendChild(style);
  },

  readJson(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key));
      return parsed ?? fallback;
    } catch (_e) {
      return fallback;
    }
  },

  saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  notify(message) {
    const text = String(message || "").trim();
    if (!text) return;
    try {
      window.AppModules?.avatar?.showXpToast?.(text, 0);
    } catch (_e) {
      /* no-op */
    }
  },

  getCustomMeals() {
    const list = this.readJson(this.storage.customMeals, []);
    return Array.isArray(list) ? list : [];
  },

  setCustomMeals(list) {
    this.saveJson(this.storage.customMeals, list);
  },

  getMealOrderList() {
    const custom = this.getCustomMeals();
    return [
      { id: "breakfast", label: "Завтрак", fixed: true },
      { id: "lunch", label: "Обед", fixed: true },
      { id: "dinner", label: "Ужин", fixed: true },
      ...custom.map((m) => ({
        id: m.id,
        label: String(m.label || "Приём пищи"),
        fixed: false,
      })),
      { id: "extra_misc", label: "Перекусы и другое", fixed: true },
    ];
  },

  isMealCollapsed(mealId) {
    const m = this.readJson(this.storage.mealFold, {});
    if (m[mealId] === undefined) return mealId === "extra_misc";
    return Boolean(m[mealId]);
  },

  toggleMealFold(mealId) {
    const m = this.readJson(this.storage.mealFold, {});
    m[mealId] = !this.isMealCollapsed(mealId);
    this.saveJson(this.storage.mealFold, m);
  },

  addCustomMealSlot(label) {
    const id = `meal_${Math.random().toString(36).slice(2, 9)}`;
    const list = this.getCustomMeals();
    list.push({ id, label: String(label || "Приём пищи").trim() || "Приём пищи" });
    this.setCustomMeals(list);
    const fold = this.readJson(this.storage.mealFold, {});
    fold[id] = false;
    this.saveJson(this.storage.mealFold, fold);
    this.ui.openMeal = id;
    this.notify(`Приём "${String(label || "Приём пищи").trim() || "Приём пищи"}" добавлен`);
  },

  removeCustomMealSlot(mealId, dateKey) {
    const entries = this.getEntries().filter(
      (e) => !(e.dateKey === dateKey && e.meal === mealId)
    );
    this.saveJson(this.storage.entries, entries);
    this.setCustomMeals(this.getCustomMeals().filter((m) => m.id !== mealId));
    if (this.ui.openMeal === mealId) this.ui.openMeal = null;
    this.notify("Приём пищи удалён");
  },

  todayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  },

  formatMonthTitleRu(year, monthIndex) {
    const months = [
      "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
      "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
    ];
    return `${months[monthIndex]} ${year} г.`;
  },

  getSelectedDate() {
    return localStorage.getItem(this.storage.day) || this.todayKey();
  },

  setSelectedDate(dateKey) {
    localStorage.setItem(this.storage.day, dateKey);
    const d = new Date(dateKey + "T12:00:00");
    if (!Number.isNaN(d.getTime())) {
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      localStorage.setItem(this.storage.monthCursor, ym);
    }
  },

  getMonthCursor() {
    const raw = localStorage.getItem(this.storage.monthCursor);
    if (raw && /^\d{4}-\d{2}$/.test(raw)) return raw;
    const d = new Date(this.getSelectedDate() + "T12:00:00");
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  },

  setMonthCursor(ym) {
    localStorage.setItem(this.storage.monthCursor, ym);
  },

  formatDateRu(dateKey) {
    try {
      const [y, m, d] = dateKey.split("-").map(Number);
      return new Date(y, m - 1, d).toLocaleDateString("ru-RU", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch (_e) {
      return dateKey;
    }
  },

  dayKcalTotal(dateKey) {
    return Math.round(this.calcTotals(this.getEntries().filter((e) => e.dateKey === dateKey)).kcal);
  },

  getBaseProducts() {
    return [
      { name: "Куриная грудка", p: 23, f: 1.8, c: 0.4, kcal: 113 },
      { name: "Индейка филе", p: 21.6, f: 12, c: 0.5, kcal: 189 },
      { name: "Рис отварной", p: 2.5, f: 0.3, c: 28, kcal: 130 },
      { name: "Гречка вареная", p: 3.6, f: 1.4, c: 19.9, kcal: 110 },
      { name: "Булгур варёный", p: 3.1, f: 0.2, c: 18.6, kcal: 90 },
      { name: "Киноа варёная", p: 4.4, f: 1.9, c: 18.5, kcal: 120 },
      { name: "Овсянка на воде", p: 3, f: 1.7, c: 14.2, kcal: 88 },
      { name: "Овсянка на молоке", p: 4.6, f: 3.2, c: 14.2, kcal: 102 },
      { name: "Яйцо куриное", p: 12.7, f: 11.5, c: 0.7, kcal: 157 },
      { name: "Творог 5%", p: 17, f: 5, c: 2, kcal: 121 },
      { name: "Творог 2%", p: 16.5, f: 2, c: 3.3, kcal: 101 },
      { name: "Сыр твёрдый", p: 25, f: 30, c: 2.1, kcal: 363 },
      { name: "Скир / густой йогурт", p: 10, f: 0.2, c: 3.6, kcal: 59 },
      { name: "Йогурт натуральный", p: 4.3, f: 2, c: 6.2, kcal: 63 },
      { name: "Молоко 2.5%", p: 2.8, f: 2.5, c: 4.7, kcal: 52 },
      { name: "Кефир 1%", p: 2.8, f: 1, c: 4, kcal: 40 },
      { name: "Лосось", p: 20, f: 13, c: 0, kcal: 208 },
      { name: "Треска / минтай", p: 17.5, f: 0.6, c: 0, kcal: 78 },
      { name: "Тунец консервированный", p: 23, f: 1, c: 0, kcal: 101 },
      { name: "Креветки", p: 18, f: 0.8, c: 0, kcal: 84 },
      { name: "Говядина постная", p: 26, f: 8, c: 0, kcal: 187 },
      { name: "Свинина постная", p: 22, f: 9, c: 0, kcal: 175 },
      { name: "Куриные бедра (без кожи)", p: 18, f: 8, c: 0, kcal: 150 },
      { name: "Курица запечённая (средняя)", p: 27, f: 14, c: 0, kcal: 239 },
      { name: "Филе трески запечённое", p: 18, f: 1, c: 0, kcal: 82 },
      { name: "Скумбрия", p: 19, f: 13.9, c: 0, kcal: 205 },
      { name: "Хек", p: 16.6, f: 2.2, c: 0, kcal: 90 },
      { name: "Печень куриная", p: 17.9, f: 5.6, c: 0.7, kcal: 119 },
      { name: "Колбаса варёная (оценка)", p: 12, f: 22, c: 2, kcal: 250 },
      { name: "Ветчина", p: 16, f: 12, c: 1.5, kcal: 180 },
      { name: "Тунец (стейк)", p: 23, f: 1, c: 0, kcal: 109 },
      { name: "Мидии", p: 11, f: 2, c: 3, kcal: 77 },
      { name: "Фасоль консервированная", p: 6.7, f: 0.4, c: 13.5, kcal: 99 },
      { name: "Чечевица варёная", p: 7.8, f: 0.5, c: 19.5, kcal: 116 },
      { name: "Нут консервированный", p: 8.3, f: 2.4, c: 15, kcal: 120 },
      { name: "Тофу", p: 8.1, f: 4.8, c: 0.6, kcal: 76 },
      { name: "Йогурт греческий 2%", p: 9.6, f: 2, c: 3.6, kcal: 73 },
      { name: "Сметана 15%", p: 2.6, f: 15, c: 3.6, kcal: 162 },
      { name: "Масло сливочное", p: 0.5, f: 82, c: 0.8, kcal: 748 },
      { name: "Оливковое масло", p: 0, f: 100, c: 0, kcal: 900 },
      { name: "Майонез (оценка)", p: 1, f: 67, c: 3, kcal: 627 },
      { name: "Брокколи варёная", p: 2.8, f: 0.4, c: 6.9, kcal: 35 },
      { name: "Шпинат свежий", p: 2.9, f: 0.3, c: 2, kcal: 22 },
      { name: "Огурец", p: 0.8, f: 0.1, c: 2.8, kcal: 15 },
      { name: "Помидор", p: 0.9, f: 0.2, c: 3.9, kcal: 20 },
      { name: "Морковь", p: 1.3, f: 0.1, c: 6.9, kcal: 35 },
      { name: "Картофель отварной", p: 2, f: 0.4, c: 16.7, kcal: 82 },
      { name: "Картофельное пюре (оценка)", p: 2.2, f: 3.6, c: 13.6, kcal: 94 },
      { name: "Макароны варёные", p: 5.8, f: 0.9, c: 30.9, kcal: 158 },
      { name: "Хлеб белый", p: 7.7, f: 2.4, c: 53.4, kcal: 266 },
      { name: "Хлеб ржаной", p: 6.6, f: 1.2, c: 40.7, kcal: 210 },
      { name: "Лаваш тонкий", p: 8, f: 1.2, c: 56, kcal: 274 },
      { name: "Блины (1 шт, оценка)", p: 4.5, f: 6, c: 18, kcal: 150 },
      { name: "Пельмени (оценка)", p: 10, f: 12, c: 20, kcal: 240 },
      { name: "Суп (тарелка, оценка)", p: 5, f: 4, c: 10, kcal: 100 },
      { name: "Салат овощной без масла", p: 1.2, f: 0.3, c: 4.5, kcal: 30 },
      { name: "Салат с маслом (оценка)", p: 1.2, f: 7, c: 4.5, kcal: 85 },
      { name: "Банан", p: 1.5, f: 0.2, c: 21, kcal: 96 },
      { name: "Яблоко", p: 0.4, f: 0.4, c: 11.3, kcal: 52 },
      { name: "Апельсин", p: 0.9, f: 0.2, c: 11.7, kcal: 43 },
      { name: "Авокадо", p: 2, f: 15, c: 9, kcal: 160 },
      { name: "Орехи грецкие", p: 15.2, f: 65.2, c: 7, kcal: 654 },
      { name: "Миндаль", p: 18.6, f: 57.7, c: 13.6, kcal: 609 },
      { name: "Арахисовая паста", p: 25, f: 50, c: 20, kcal: 588 },
      { name: "Шоколад (плитка, оценка)", p: 6, f: 35, c: 52, kcal: 540 },
      { name: "Печенье (оценка)", p: 6, f: 18, c: 68, kcal: 480 },
      { name: "Мёд", p: 0.3, f: 0, c: 82, kcal: 304 },
      { name: "Сахар", p: 0, f: 0, c: 99.8, kcal: 398 },
      { name: "Кола/лимонад (250мл, оценка)", p: 0, f: 0, c: 26, kcal: 105 },
      { name: "Сок (200мл, оценка)", p: 0.7, f: 0.2, c: 23, kcal: 95 },
      { name: "Кофе с молоком (оценка)", p: 2, f: 2, c: 3, kcal: 40 },
      { name: "Протеиновый коктейль (оценка)", p: 20, f: 2, c: 5, kcal: 110 },
      { name: "Протеиновый батончик", p: 22, f: 7, c: 18, kcal: 230 },
      { name: "Пицца (кусок, оценка)", p: 12, f: 10, c: 36, kcal: 285 },
      { name: "Бургер (оценка)", p: 15, f: 14, c: 28, kcal: 295 },
    ];
  },

  searchProducts(query) {
    const q = String(query || "").trim().toLowerCase();
    const list = this.getProducts();
    if (!q) return list.slice(0, 120);
    return list
      .filter((p) => String(p.name || "").toLowerCase().includes(q))
      .slice(0, 120);
  },

  getProducts() {
    const custom = this.readJson(this.storage.products, []);
    return [...this.getBaseProducts(), ...(Array.isArray(custom) ? custom : [])];
  },

  getEntries() {
    const list = this.readJson(this.storage.entries, []);
    return Array.isArray(list) ? list : [];
  },

  clearAllEntries() {
    this.saveJson(this.storage.entries, []);
  },

  addEntry(entry) {
    const entries = this.getEntries();
    entries.push(entry);
    this.saveJson(this.storage.entries, entries);
    try {
      window.AppModules?.avatar?.grantXp?.("meal", 2, { unitsAdded: 1 });
    } catch (_e) { /* no-op */ }
    this.notify("Блюдо сохранено");
  },

  removeEntry(id) {
    const entries = this.getEntries().filter((item) => item.id !== id);
    this.saveJson(this.storage.entries, entries);
    this.notify("Запись удалена");
  },

  removeMealEntries(dateKey, meal) {
    const entries = this.getEntries().filter(
      (item) => !(item.dateKey === dateKey && item.meal === meal)
    );
    this.saveJson(this.storage.entries, entries);
    this.notify("Приём очищен");
  },

  getDayEntries(dateKey) {
    const list = this.getEntries().filter((item) => item.dateKey === dateKey);
    return list.sort((a, b) =>
      String(a.time || "").localeCompare(String(b.time || ""))
    );
  },

  calcTotals(entries) {
    return entries.reduce(
      (acc, item) => {
        acc.p += Number(item.p) || 0;
        acc.f += Number(item.f) || 0;
        acc.c += Number(item.c) || 0;
        acc.kcal += Number(item.kcal) || 0;
        return acc;
      },
      { p: 0, f: 0, c: 0, kcal: 0 }
    );
  },

  escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },

  renderCalendar(root, selectedDate) {
    const mount = root.querySelector("#nutritionCalendar");
    if (!mount) return;
    const today = this.todayKey();
    const ym = this.getMonthCursor();
    const [ys, ms] = ym.split("-").map(Number);
    const year = ys;
    const month = ms - 1;
    const monthLabel = this.formatMonthTitleRu(year, month);
    const first = new Date(year, month, 1);
    const days = new Date(year, month + 1, 0).getDate();
    let start = first.getDay();
    start = start === 0 ? 6 : start - 1;
    const datesWithData = new Set(this.getEntries().map((item) => item.dateKey));
    const wd = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
    let cells = "";
    for (let i = 0; i < start; i += 1) cells += `<div class="nutrition-cal-pad" aria-hidden="true"></div>`;
    for (let day = 1; day <= days; day += 1) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const kcal = this.dayKcalTotal(key);
      const isSelected = key === selectedDate;
      const cls = [
        "nutrition-day",
        isSelected ? "is-selected" : "",
        datesWithData.has(key) ? "has-data" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const kcalShort = kcal > 0 ? `${kcal}` : "—";
      cells += `<button type="button" class="${cls}" data-date="${key}"${isSelected ? ' aria-current="date"' : ""} aria-label="${key}, ${kcal} ккал">
        <span class="nutrition-day-num">${day}</span>
        <span class="nutrition-day-kcal">${kcalShort}</span>
      </button>`;
    }
    mount.innerHTML = `
      <div class="nutrition-cal-surface">
        <div class="nutrition-cal-head">
          <strong>${monthLabel}</strong>
          <div style="display:flex;align-items:center;gap:6px;">
            <button type="button" class="nutrition-cal-today-link" id="nutritionGoToday" title="Сегодня">Сегодня</button>
            <div class="nutrition-cal-nav">
              <button type="button" id="nutritionCalPrev" aria-label="Предыдущий месяц">‹</button>
              <button type="button" id="nutritionCalNext" aria-label="Следующий месяц">›</button>
            </div>
          </div>
        </div>
        <div class="nutrition-cal-weekdays">${wd.map((d) => `<span>${d}</span>`).join("")}</div>
        <div class="nutrition-calendar-grid">${cells}</div>
      </div>
    `;
    const goToday = mount.querySelector("#nutritionGoToday");
    if (goToday) {
      goToday.addEventListener("click", () => {
        this.setSelectedDate(today);
        this.setMonthCursor(today.slice(0, 7));
        this.render(root.id);
      });
    }
    const prev = mount.querySelector("#nutritionCalPrev");
    const next = mount.querySelector("#nutritionCalNext");
    if (prev) {
      prev.addEventListener("click", () => {
        const d = new Date(year, month - 1, 1);
        this.setMonthCursor(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        );
        this.render(root.id);
      });
    }
    if (next) {
      next.addEventListener("click", () => {
        const d = new Date(year, month + 1, 1);
        this.setMonthCursor(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        );
        this.render(root.id);
      });
    }
    mount.querySelectorAll(".nutrition-calendar-grid [data-date]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.setSelectedDate(btn.getAttribute("data-date"));
        this.render(root.id);
      });
    });
  },

  renderChart(root, totals) {
    const wrap = root.querySelector(".nutrition-macro-chart-wrap");
    const canvas = root.querySelector("#nutritionMacroChart");
    if (!wrap || !canvas) return;
    const oldFallback = wrap.querySelector(".nutrition-macro-fallback");
    if (oldFallback) oldFallback.remove();

    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    const drawFallbackDonut = () => {
      canvas.style.display = "none";
      const p = Math.max(0, Number(totals.p) || 0);
      const f = Math.max(0, Number(totals.f) || 0);
      const c = Math.max(0, Number(totals.c) || 0);
      const sum = Math.max(1, p + f + c);
      const palette = ["#6ec8ff", "#f9a8c4", "#86efac"];
      const textColor = document.body.classList.contains("light-theme")
        ? "#334155"
        : "#efe8ff";

      const cx = 100;
      const cy = 100;
      const r = 78;
      const stroke = 36;
      let offset = 0;
      const segments = [p, f, c]
        .map((value, idx) => {
          const len = (value / sum) * (Math.PI * 2 * r);
          const dash = `${Math.max(2, len)} ${Math.max(1, Math.PI * 2 * r - len)}`;
          const part = `
            <circle cx="${cx}" cy="${cy}" r="${r}"
              fill="none"
              stroke="${palette[idx]}"
              stroke-width="${stroke}"
              stroke-linecap="butt"
              transform="rotate(-90 ${cx} ${cy})"
              stroke-dasharray="${dash}"
              stroke-dashoffset="${-offset}" />
          `;
          offset += len;
          return part;
        })
        .join("");

      const fallback = document.createElement("div");
      fallback.className = "nutrition-macro-fallback";
      fallback.innerHTML = `
        <svg viewBox="0 0 200 200" role="img" aria-label="Диаграмма БЖУ">
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="${stroke}" />
          ${segments}
          <circle cx="${cx}" cy="${cy}" r="48" fill="${document.body.classList.contains("light-theme") ? "#f8fafc" : "#1b1433"}"></circle>
          <text x="${cx}" y="96" text-anchor="middle" fill="${textColor}" font-size="14" font-weight="700">БЖУ</text>
          <text x="${cx}" y="118" text-anchor="middle" fill="${textColor}" font-size="13">${Math.round(sum)} г</text>
        </svg>
      `;
      wrap.appendChild(fallback);
    };

    if (!window.Chart) {
      drawFallbackDonut();
      return;
    }

    const ctx = canvas.getContext("2d");
    const textColor = document.body.classList.contains("light-theme")
      ? "#334155"
      : "#e9dcff";
    try {
      canvas.style.display = "block";
      this.chart = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: ["Белки", "Жиры", "Углеводы"],
          datasets: [
            {
              data: [Math.max(0.1, totals.p), Math.max(0.1, totals.f), Math.max(0.1, totals.c)],
              backgroundColor: ["#6ec8ff", "#f9a8c4", "#86efac"],
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          aspectRatio: 1.12,
          cutout: "62%",
          layout: { padding: { top: 6, bottom: 6, left: 4, right: 4 } },
          plugins: {
            legend: {
              position: "bottom",
              align: "center",
              labels: {
                color: textColor,
                boxWidth: 14,
                boxHeight: 14,
                padding: 14,
                font: { size: 13, weight: "500" },
                usePointStyle: true,
                pointStyle: "circle",
              },
            },
          },
        },
      });
    } catch (_e) {
      this.chart = null;
      drawFallbackDonut();
    }
  },

  closeNutritionModals(root) {
    if (!root) return;
    root.querySelectorAll(".nutrition-modal-overlay").forEach((el) => {
      el.classList.remove("is-on");
      el.setAttribute("aria-hidden", "true");
    });
  },

  openMealSlotModal(root) {
    this.closeNutritionModals(root);
    const ov = root.querySelector("#nutritionModalMealSlot");
    const input = root.querySelector("#nutritionModalMealName");
    if (!ov || !input) return;
    input.value = "Перекус";
    ov.classList.add("is-on");
    ov.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  },

  openCustomProductModal(root) {
    this.closeNutritionModals(root);
    const ov = root.querySelector("#nutritionModalCustomProduct");
    if (!ov) return;
    const n = root.querySelector("#nutritionModalProdName");
    const p = root.querySelector("#nutritionModalProdP");
    const f = root.querySelector("#nutritionModalProdF");
    const c = root.querySelector("#nutritionModalProdC");
    const k = root.querySelector("#nutritionModalProdKcal");
    if (n) n.value = "";
    if (p) p.value = "10";
    if (f) f.value = "5";
    if (c) c.value = "20";
    if (k) k.value = "150";
    ov.classList.add("is-on");
    ov.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => n?.focus());
  },

  bindEvents(root, _selectedDate) {
    if (root.__nutritionBound) return;
    root.__nutritionBound = true;

    if (!root._nutritionEscListener) {
      root._nutritionEscListener = (e) => {
        if (e.key !== "Escape") return;
        if (!root.querySelector(".nutrition-modal-overlay.is-on")) return;
        this.closeNutritionModals(root);
      };
      document.addEventListener("keydown", root._nutritionEscListener);
    }

    root.addEventListener("click", (event) => {
      const foldBtn = event.target.closest("[data-meal-fold-toggle]");
      if (foldBtn) {
        const meal = foldBtn.getAttribute("data-meal-fold-toggle") || "";
        if (!meal) return;
        const wasCollapsed = this.isMealCollapsed(meal);
        this.toggleMealFold(meal);
        const collapsed = this.isMealCollapsed(meal);
        if (wasCollapsed) this.ui.openMeal = meal;
        else if (this.ui.openMeal === meal) this.ui.openMeal = null;
        const slotEl = Array.from(root.querySelectorAll(".nutrition-meal-slot")).find(
          (el) => el.getAttribute("data-meal") === meal
        );
        if (slotEl) {
          const body = slotEl.querySelector(".nutrition-meal-body");
          slotEl.classList.toggle("is-meal-collapsed", collapsed);
          if (body) body.classList.toggle("is-collapsed", collapsed);
          foldBtn.setAttribute("aria-expanded", collapsed ? "false" : "true");
        } else {
          this.render(root.id);
        }
        return;
      }

      const mealOv = event.target.closest("#nutritionModalMealSlot");
      if (mealOv && event.target === mealOv) {
        this.closeNutritionModals(root);
        return;
      }
      if (event.target.closest("#nutritionModalMealCancel")) {
        this.closeNutritionModals(root);
        return;
      }
      if (event.target.closest("#nutritionModalMealConfirm")) {
        const label = String(root.querySelector("#nutritionModalMealName")?.value || "").trim();
        if (!label) return;
        this.closeNutritionModals(root);
        this.addCustomMealSlot(label);
        this.render(root.id);
        return;
      }

      const prodOv = event.target.closest("#nutritionModalCustomProduct");
      if (prodOv && event.target === prodOv) {
        this.closeNutritionModals(root);
        return;
      }
      if (event.target.closest("#nutritionModalProdCancel")) {
        this.closeNutritionModals(root);
        return;
      }
      if (event.target.closest("#nutritionModalProdConfirm")) {
        const name = String(root.querySelector("#nutritionModalProdName")?.value || "").trim();
        if (!name) return;
        const p = parseFloat(String(root.querySelector("#nutritionModalProdP")?.value || "0")) || 0;
        const f = parseFloat(String(root.querySelector("#nutritionModalProdF")?.value || "0")) || 0;
        const c = parseFloat(String(root.querySelector("#nutritionModalProdC")?.value || "0")) || 0;
        const kcal = parseFloat(String(root.querySelector("#nutritionModalProdKcal")?.value || "0")) || 0;
        const custom = this.readJson(this.storage.products, []);
        custom.push({ name, p, f, c, kcal });
        this.saveJson(this.storage.products, custom);
        this.notify(`Продукт "${name}" добавлен`);
        this.closeNutritionModals(root);
        this.render(root.id);
        return;
      }

      const addSlot = event.target.closest("#nutritionAddMealSlot");
      if (addSlot) {
        this.openMealSlotModal(root);
        return;
      }

      const rmSlot = event.target.closest("[data-remove-meal-slot]");
      if (rmSlot) {
        const mid = rmSlot.getAttribute("data-remove-meal-slot") || "";
        if (!mid) return;
        if (!confirm("Удалить этот приём и все записи за выбранный день в нём?")) return;
        this.removeCustomMealSlot(mid, this.getSelectedDate());
        this.render(root.id);
        return;
      }

      const clearMeal = event.target.closest("[data-meal-clear]");
      if (clearMeal) {
        const meal = clearMeal.getAttribute("data-meal-clear") || "";
        if (!meal) return;
        this.removeMealEntries(this.getSelectedDate(), meal);
        this.ui.openMeal = meal;
        this.render(root.id);
        return;
      }

      const mode = event.target.closest("[data-meal-mode]");
      if (mode) {
        const meal = mode.getAttribute("data-meal");
        const next = mode.getAttribute("data-meal-mode");
        if (meal) {
          this.ui.openMeal = meal;
          this.ui["mode_" + meal] = next;
          this.render(root.id);
        }
        return;
      }

      const addCustom = event.target.closest("#nutritionAddCustomProduct");
      if (addCustom) {
        this.openCustomProductModal(root);
        return;
      }

      const del = event.target.closest("[data-del-id]");
      if (!del) return;
      this.removeEntry(del.getAttribute("data-del-id"));
      this.render(root.id);
    });

    root.addEventListener("submit", (event) => {
      const form = event.target.closest("form[data-meal-form]");
      if (!form) return;
      event.preventDefault();
      const meal = form.getAttribute("data-meal-form") || "other";
      const mode = this.ui["mode_" + meal] || "db";
      const time = String(form.querySelector('input[name="time"]')?.value || "").trim();
      let title = "";
      let p = 0;
      let f = 0;
      let c = 0;
      let kcal = 0;

      if (mode === "db") {
        const selected = String(form.querySelector('select[name="product"]')?.value || "");
        const grams = parseFloat(String(form.querySelector('input[name="grams"]')?.value || "0")) || 0;
        if (!selected || grams <= 0) return;
        const product = this.getProducts().find((x) => x.name === selected);
        if (!product) return;
        const ratio = grams / 100;
        title = `${product.name} (${Math.round(grams)} г)`;
        p = +(Number(product.p || 0) * ratio).toFixed(1);
        f = +(Number(product.f || 0) * ratio).toFixed(1);
        c = +(Number(product.c || 0) * ratio).toFixed(1);
        kcal = Math.round(Number(product.kcal || 0) * ratio);
      } else {
        title = String(form.querySelector('input[name="title"]')?.value || "").trim();
        p = parseFloat(form.querySelector('input[name="p"]')?.value || "0") || 0;
        f = parseFloat(form.querySelector('input[name="f"]')?.value || "0") || 0;
        c = parseFloat(form.querySelector('input[name="c"]')?.value || "0") || 0;
        kcal = parseFloat(form.querySelector('input[name="kcal"]')?.value || "0") || 0;
        if (!title) return;
      }

      const now = new Date();
      const timeSafe = /^\d{2}:\d{2}$/.test(time) ? time : now.toTimeString().slice(0, 5);
      this.addEntry({
        id: "n_" + Math.random().toString(36).slice(2, 9),
        dateKey: this.getSelectedDate(),
        meal,
        title,
        time: timeSafe,
        p: +p.toFixed(1),
        f: +f.toFixed(1),
        c: +c.toFixed(1),
        kcal: Math.round(kcal),
      });
      this.ui.openMeal = meal;
      this.render(root.id);
    });
  },

  renderMealSections(entries) {
    const slots = this.getMealOrderList();
    const groups = {};
    slots.forEach((s) => {
      groups[s.id] = [];
    });
    entries.forEach((item) => {
      const k = item.meal;
      if (groups[k]) groups[k].push(item);
      else groups.extra_misc.push(item);
    });

    const now = new Date();
    const defaultTime = now.toTimeString().slice(0, 5);
    const products = this.getProducts().slice(0, 180);

    return slots
      .map((slot) => {
        const key = slot.id;
        const label = slot.label;
        const collapsed = this.isMealCollapsed(key);
        const mode = this.ui["mode_" + key] || "db";
        const list = groups[key] || [];
        const totals = this.calcTotals(list);
        const kcalSum = Math.round(totals.kcal);
        const rows = list.length
          ? list
              .map(
                (item) => `
          <div class="nutrition-item">
            <div>
              <strong>${this.escapeHtml(item.title)}</strong>
              <div class="nutrition-item-meta">${item.time ? this.escapeHtml(item.time) + " · " : ""}Б ${item.p} · Ж ${item.f} · У ${item.c} · ${item.kcal} ккал</div>
            </div>
            <button type="button" class="nutrition-item-del" data-del-id="${this.escapeHtml(item.id)}">Удалить</button>
          </div>`
              )
              .join("")
          : `<p class="nutrition-empty" style="margin: 4px 0 0 0;">Нет записей</p>`;

        const delBtn = slot.fixed
          ? ""
          : `<button type="button" class="nutrition-meal-bar-del" data-remove-meal-slot="${this.escapeHtml(
              key
            )}" title="Удалить приём" aria-label="Удалить приём">×</button>`;

        return `
          <div class="nutrition-meal-slot${collapsed ? " is-meal-collapsed" : ""}" data-meal="${this.escapeHtml(key)}">
            <div class="nutrition-meal-slot-head">
            <button type="button" class="nutrition-meal-bar" data-meal-fold-toggle="${this.escapeHtml(key)}" aria-expanded="${collapsed ? "false" : "true"}">
              <span class="nutrition-meal-bar-chev" aria-hidden="true">▾</span>
              <span class="nutrition-meal-bar-title">${this.escapeHtml(label)}</span>
              <span class="nutrition-meal-bar-kcal">${kcalSum} ккал</span>
            </button>
            ${delBtn}
            </div>
            <div class="nutrition-meal-body${collapsed ? " is-collapsed" : ""}">
              <div class="nutrition-meal-body-inner">
              <div class="nutrition-meal-form" style="display:block;margin:0;padding:0;border:none;background:transparent;">
              <form data-meal-form="${this.escapeHtml(key)}">
                <div class="nutrition-form-switch" role="tablist" aria-label="Режим добавления">
                  <button type="button" class="nutrition-pill${mode === "db" ? " is-active" : ""}" data-meal="${this.escapeHtml(
                    key
                  )}" data-meal-mode="db">Из базы</button>
                  <button type="button" class="nutrition-pill${mode === "manual" ? " is-active" : ""}" data-meal="${this.escapeHtml(
                    key
                  )}" data-meal-mode="manual">Вручную</button>
                </div>

                <div class="nutrition-db-row" style="${mode === "db" ? "" : "display:none"}">
                  <label class="full">Продукт
                    <select name="product" aria-label="Выберите продукт">
                      ${products
                        .map((p) => `<option value="${this.escapeHtml(p.name)}">${this.escapeHtml(p.name)}</option>`)
                        .join("")}
                    </select>
                  </label>
                  <label>Граммы
                    <input name="grams" inputmode="numeric" type="number" min="1" step="1" value="100" />
                  </label>
                  <label>Время
                    <input name="time" type="time" value="${this.escapeHtml(defaultTime)}" />
                  </label>
                  <div class="nutrition-mini-help full">Продукт и граммы — БЖУ и ккал посчитаем автоматически.</div>
                </div>

                <div style="${mode === "manual" ? "" : "display:none"}">
                  <div class="nutrition-form-grid">
                    <label class="full">Название блюда
                      <input name="title" type="text" maxlength="64" placeholder="Например: омлет с сыром" />
                    </label>
                    <label>Время
                      <input name="time" type="time" value="${this.escapeHtml(defaultTime)}" />
                    </label>
                  </div>
                  <div class="nutrition-form-macros">
                    <label>Белки (г)
                      <input name="p" inputmode="decimal" type="number" min="0" step="0.1" value="0" />
                    </label>
                    <label>Жиры (г)
                      <input name="f" inputmode="decimal" type="number" min="0" step="0.1" value="0" />
                    </label>
                    <label>Углеводы (г)
                      <input name="c" inputmode="decimal" type="number" min="0" step="0.1" value="0" />
                    </label>
                    <label>Ккал
                      <input name="kcal" inputmode="numeric" type="number" min="0" step="1" value="0" />
                    </label>
                  </div>
                </div>
                <div class="nutrition-form-actions">
                  <button type="submit" class="nutrition-btn-mini primary">Добавить</button>
                  <button type="button" class="nutrition-btn-mini" data-meal-clear="${this.escapeHtml(
                    key
                  )}" title="Очистить записи этого приёма за день">Очистить приём</button>
                </div>
              </form>
              </div>
              <div class="nutrition-list" style="margin-top:10px">${rows}</div>
              </div>
            </div>
          </div>`;
      })
      .join("");
  },

  render(mountId) {
    const root = document.getElementById(mountId);
    if (!root) return;
    this.ensureStyles();

    const username = String(window.AppAuth?.user?.username || "").trim().toLowerCase();
    if (username === "бантос") {
      const flagKey = "nutritionClearedOnce_bantos_v1";
      if (!localStorage.getItem(flagKey)) {
        this.clearAllEntries();
        localStorage.setItem(flagKey, "1");
      }
    }

    const selectedDate = this.getSelectedDate();
    const entries = this.getDayEntries(selectedDate);
    const totals = this.calcTotals(entries);
    const diaryBody = this.renderMealSections(entries);

    root.innerHTML = `
      <div class="nutrition-shell">
        <header class="nutrition-page-head">
          <h1>Дневник питания</h1>
          <p>Календарь, приёмы пищи и БЖУ за день в одном экране.</p>
        </header>
        <div class="nutrition-layout">
          <div class="nutrition-col-main">
            <section class="nutrition-card">
              <div class="nutrition-diary-head">
                <div>
                  <h2>Еда за день</h2>
                  <p class="nutrition-diary-date">${this.escapeHtml(this.formatDateRu(selectedDate))} · ${Math.round(totals.kcal)} ккал</p>
                </div>
                <div class="nutrition-diary-actions">
                  <button type="button" class="nutrition-add-meal-slot" id="nutritionAddMealSlot" title="Добавить приём пищи">＋ Приём пищи</button>
                  <button type="button" class="nutrition-btn-ghost" id="nutritionAddCustomProduct" title="Добавить продукт в список (на 100г)">Свой продукт</button>
                </div>
              </div>
              ${diaryBody}
            </section>
          </div>
          <aside class="nutrition-col-side">
            <div class="nutrition-card nutrition-cal-wrap">
              <div id="nutritionCalendar"></div>
            </div>
            <section class="nutrition-card nutrition-side-summary">
              <h3>Баланс за день</h3>
              <div class="nutrition-macro-chart-wrap"><canvas id="nutritionMacroChart" width="280" height="252"></canvas></div>
              <div class="nutrition-kpis">
                <div class="nutrition-kpi">Белки<div class="nutrition-kpi-value">${totals.p.toFixed(0)} г</div></div>
                <div class="nutrition-kpi">Жиры<div class="nutrition-kpi-value">${totals.f.toFixed(0)} г</div></div>
                <div class="nutrition-kpi">Углеводы<div class="nutrition-kpi-value">${totals.c.toFixed(0)} г</div></div>
                <div class="nutrition-kpi">Ккал<div class="nutrition-kpi-value">${Math.round(totals.kcal)}</div></div>
              </div>
            </section>
          </aside>
        </div>
        <div class="nutrition-modal-overlay" id="nutritionModalMealSlot" role="dialog" aria-modal="true" aria-labelledby="nutritionModalMealTitle" aria-hidden="true">
          <div class="nutrition-modal">
            <h3 id="nutritionModalMealTitle">Новый приём пищи</h3>
            <p class="nutrition-modal-hint">Как назвать приём (например: полдник, кофе-брейк).</p>
            <div class="nutrition-modal-field">
              <span>Название</span>
              <input type="text" id="nutritionModalMealName" maxlength="48" autocomplete="off" placeholder="Перекус" />
            </div>
            <div class="nutrition-modal-actions">
              <button type="button" class="nutrition-modal-btn ghost" id="nutritionModalMealCancel">Отмена</button>
              <button type="button" class="nutrition-modal-btn primary" id="nutritionModalMealConfirm">Добавить</button>
            </div>
          </div>
        </div>
        <div class="nutrition-modal-overlay" id="nutritionModalCustomProduct" role="dialog" aria-modal="true" aria-labelledby="nutritionModalProdTitle" aria-hidden="true">
          <div class="nutrition-modal">
            <h3 id="nutritionModalProdTitle">Свой продукт</h3>
            <p class="nutrition-modal-hint">Значения указываются на 100 г — как в базе продуктов.</p>
            <div class="nutrition-modal-field">
              <span>Название</span>
              <input type="text" id="nutritionModalProdName" maxlength="80" autocomplete="off" placeholder="Например: протеиновый батончик" />
            </div>
            <div class="nutrition-modal-grid">
              <label>Белки (г / 100 г)<input id="nutritionModalProdP" inputmode="decimal" type="number" min="0" step="0.1" value="10" /></label>
              <label>Жиры (г / 100 г)<input id="nutritionModalProdF" inputmode="decimal" type="number" min="0" step="0.1" value="5" /></label>
              <label>Углеводы (г / 100 г)<input id="nutritionModalProdC" inputmode="decimal" type="number" min="0" step="0.1" value="20" /></label>
              <label>Ккал / 100 г<input id="nutritionModalProdKcal" inputmode="numeric" type="number" min="0" step="1" value="150" /></label>
            </div>
            <div class="nutrition-modal-actions">
              <button type="button" class="nutrition-modal-btn ghost" id="nutritionModalProdCancel">Отмена</button>
              <button type="button" class="nutrition-modal-btn primary" id="nutritionModalProdConfirm">Добавить</button>
            </div>
          </div>
        </div>
      </div>
    `;
    this.renderCalendar(root, selectedDate);
    this.renderChart(root, totals);
    this.bindEvents(root, selectedDate);
  },
};
