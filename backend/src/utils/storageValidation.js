const ALLOWED_STORAGE_KEYS = new Set([
  "trainingPlans_v3",
  "trainingWorkouts_v4",
  "trainingLastSetByExercise_v1",
  "plansCollapsed",
  "uiTheme_v1",
  "nutritionEntries_v1",
  "nutritionCustomProducts_v1",
  "nutritionSelectedDay_v1",
  "nutritionMonthCursor_v1",
  "nutritionCustomMeals_v1",
  "nutritionMealFold_v1",
  "mentalAssistant_checkins_v1",
  "mentalAssistant_advice_day_v1",
  "mentalAssistant_advice_id_v1",
]);

function validateStorageKey(key) {
  const value = String(key || "").trim();
  if (!value || !ALLOWED_STORAGE_KEYS.has(value)) {
    return { ok: false, error: "Ключ хранилища не разрешен" };
  }
  return { ok: true, key: value };
}

module.exports = {
  ALLOWED_STORAGE_KEYS,
  validateStorageKey,
};
