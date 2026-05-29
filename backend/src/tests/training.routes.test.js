const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validatePlanPayload,
  validateWorkoutPayload,
  buildAnalytics,
} = require("../services/training.service");

test("plan validator rejects empty name", () => {
  const result = validatePlanPayload({ name: "  ", days: [] });
  assert.equal(result.ok, false);
});

test("plan validator rejects invalid exercise structure", () => {
  const result = validatePlanPayload({
    name: "План",
    days: [{ name: "День 1" }],
  });
  assert.equal(result.ok, false);
});

test("workout validator accepts valid payload", () => {
  const result = validateWorkoutPayload({
    date: "2026-05-10",
    exId: "bench-1",
    exName: "Жим лёжа",
    muscle: "грудь",
    sets: [{ w: 60, r: 8 }, { w: 62.5, r: 6 }],
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.sets.length, 2);
});

test("analytics calculates max weight and volume per date", () => {
  const analytics = buildAnalytics([
    {
      workout_date: "2026-05-01",
      ex_id: "sq",
      ex_name: "Присед",
      muscle: "ноги",
      sets: [{ w: 100, r: 5 }, { w: 100, r: 5 }],
    },
    {
      workout_date: "2026-05-03",
      ex_id: "sq",
      ex_name: "Присед",
      muscle: "ноги",
      sets: [{ w: 110, r: 4 }],
    },
  ]);
  assert.equal(analytics.exercises[0].points[1].maxWeight, 110);
  assert.equal(analytics.exercises[0].points[1].volume, 440);
  assert.equal(analytics.muscleLoad.ноги, 3);
});
