// Явный список ключей, которые точно используются приложением.
const ALLOWED_STORAGE_KEYS = new Set([
  "trainingPlans_v3",
  "trainingWorkouts_v4",
  "trainingLastSetByExercise_v1",
  "trainingCurrentPlanId_v2",
  "trainingCurrentDayIdx_v2",
  "avatarProgress_v1",
  "digitalAvatar_v1",
  "profileVisualByUser_v1",
  "socialFollows_v1",
  "socialFollowEdges_v1",
  "plansCollapsed",
  "uiTheme_v1",
  "nutritionEntries_v1",
  "nutritionCustomProducts_v1",
  "nutritionSelectedDay_v1",
  "nutritionMonthCursor_v1",
  "nutritionCustomMeals_v1",
  "nutritionMealFold_v1",
  "nutritionClearedOnce_bantos_v1",
  "mentalAssistant_checkins_v1",
  "mentalAssistant_advice_day_v1",
  "mentalAssistant_advice_id_v1",
  "mentalAssistant_fatigue_decision_day_v1",
  "mentalAssistant_onboarding_done_v1",
  "mentalAssistant_checkinXpDay_v1",
]);

// Разрешённые префиксы для ключей приложения. Это сохраняет валидацию
// (мусорные/произвольные ключи всё равно отклоняются), но позволяет всем
// модулям (тренировки, питание, аватар, соцсети, психология) сохранять данные.
const ALLOWED_KEY_PREFIXES = [
  "training",
  "nutrition",
  "mentalAssistant_",
  "social",
  "profile",
  "avatar",
  "digitalAvatar",
  "ui",
  "plans",
];

const MAX_KEY_LENGTH = 128;

function validateStorageKey(key) {
  const value = String(key || "").trim();

  if (!value || value.length > MAX_KEY_LENGTH) {
    return { ok: false, error: "Ключ хранилища не разрешен" };
  }

  // Только латиница, цифры и подчёркивание — защита от инъекций/мусора.
  if (!/^[A-Za-z0-9_]+$/.test(value)) {
    return { ok: false, error: "Недопустимый ключ хранилища" };
  }

  if (ALLOWED_STORAGE_KEYS.has(value)) {
    return { ok: true, key: value };
  }

  if (ALLOWED_KEY_PREFIXES.some((prefix) => value.startsWith(prefix))) {
    return { ok: true, key: value };
  }

  return { ok: false, error: "Ключ хранилища не разрешен" };
}

module.exports = {
  ALLOWED_STORAGE_KEYS,
  ALLOWED_KEY_PREFIXES,
  validateStorageKey,
};
