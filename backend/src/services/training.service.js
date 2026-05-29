function uid(prefix = "tr") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function validatePlanPayload(payload) {
  const name = String(payload?.name || "").trim();
  const days = payload?.days;

  if (!name || name.length < 2) {
    return { ok: false, error: "Название плана должно быть не короче 2 символов" };
  }
  if (!Array.isArray(days)) {
    return { ok: false, error: "Поле days должно быть массивом" };
  }

  for (const day of days) {
    if (typeof day !== "object" || day === null) {
      return { ok: false, error: "Некорректная структура дня" };
    }
    if (!Array.isArray(day.exercises)) {
      return { ok: false, error: "Для каждого дня требуется массив exercises" };
    }
    for (const exercise of day.exercises) {
      if (!exercise || typeof exercise !== "object") {
        return { ok: false, error: "Некорректная структура упражнения" };
      }
      const exName = String(exercise.name || "").trim();
      if (!exName) {
        return { ok: false, error: "Название упражнения обязательно" };
      }
    }
  }

  return { ok: true, value: { name, days } };
}

function validateWorkoutPayload(payload) {
  const date = String(payload?.date || "").trim();
  const exId = String(payload?.exId || "").trim();
  const exName = String(payload?.exName || "").trim();
  const muscle = String(payload?.muscle || "другое").trim() || "другое";
  const sets = Array.isArray(payload?.sets) ? payload.sets : [];

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, error: "Дата должна быть в формате YYYY-MM-DD" };
  }
  if (!exId || !exName) {
    return { ok: false, error: "Для тренировки требуются exId и exName" };
  }
  if (!sets.length) {
    return { ok: false, error: "Тренировка должна содержать хотя бы один подход" };
  }

  const normalizedSets = [];
  for (const set of sets) {
    const weight = Number(set?.w || 0);
    const reps = Number(set?.r || 0);
    const comment = String(set?.c || "").trim();
    if (weight < 0 || reps < 0) {
      return { ok: false, error: "Вес и повторения не могут быть отрицательными" };
    }
    if (weight === 0 && reps === 0) {
      continue;
    }
    normalizedSets.push({ w: weight, r: reps, c: comment });
  }

  if (!normalizedSets.length) {
    return { ok: false, error: "Нет валидных подходов для сохранения" };
  }

  return {
    ok: true,
    value: {
      id: String(payload?.id || uid("w")),
      planId: String(payload?.planId || "").trim(),
      date,
      exId,
      exName,
      muscle,
      sets: normalizedSets,
    },
  };
}

function buildAnalytics(workouts = []) {
  const byExercise = {};
  const byMuscle = {};

  for (const workout of workouts) {
    const exKey = String(workout.ex_id || workout.exId || "");
    const exName = String(workout.ex_name || workout.exName || "");
    const date = String(workout.workout_date || workout.date || "");
    const muscle = String(workout.muscle || "другое") || "другое";
    const sets = Array.isArray(workout.sets) ? workout.sets : [];

    let maxWeight = 0;
    let volume = 0;
    for (const set of sets) {
      const w = Number(set?.w || 0);
      const r = Number(set?.r || 0);
      if (w > maxWeight) maxWeight = w;
      volume += w * r;
    }

    if (!byExercise[exKey]) byExercise[exKey] = { exId: exKey, exName, points: [] };
    byExercise[exKey].points.push({ date, maxWeight, volume: Math.round(volume) });

    if (!byMuscle[muscle]) byMuscle[muscle] = 0;
    byMuscle[muscle] += sets.length;
  }

  return {
    exercises: Object.values(byExercise).map((item) => ({
      ...item,
      points: item.points.sort((a, b) => String(a.date).localeCompare(String(b.date))),
    })),
    muscleLoad: byMuscle,
  };
}

module.exports = {
  uid,
  validatePlanPayload,
  validateWorkoutPayload,
  buildAnalytics,
};
