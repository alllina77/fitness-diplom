const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validatePlanPayload,
  validateWorkoutPayload,
  buildAnalytics,
} = require("../services/training.service");

test("training plan validator accepts valid structure", () => {
  const valid = validatePlanPayload({
    name: "Мой план",
    days: [{ name: "День 1", exercises: [{ name: "Жим лёжа" }] }],
  });
  assert.equal(valid.ok, true);
});

test("training workout validator rejects invalid date", () => {
  const invalid = validateWorkoutPayload({
    date: "12-01-2026",
    exId: "ex1",
    exName: "Жим",
    sets: [{ w: 50, r: 8 }],
  });
  assert.equal(invalid.ok, false);
});

test("analytics groups exercise progression and muscle load", () => {
  const analytics = buildAnalytics([
    {
      workout_date: "2026-05-01",
      ex_id: "bench",
      ex_name: "Жим лёжа",
      muscle: "грудь",
      sets: [{ w: 60, r: 8 }, { w: 65, r: 6 }],
    },
    {
      workout_date: "2026-05-03",
      ex_id: "bench",
      ex_name: "Жим лёжа",
      muscle: "грудь",
      sets: [{ w: 67.5, r: 5 }],
    },
  ]);

  assert.equal(analytics.exercises.length, 1);
  assert.equal(analytics.exercises[0].points.length, 2);
  assert.equal(analytics.muscleLoad["грудь"], 3);
});
