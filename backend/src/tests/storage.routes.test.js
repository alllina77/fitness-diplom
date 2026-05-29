const test = require("node:test");
const assert = require("node:assert/strict");
const { validateStorageKey } = require("../utils/storageValidation");

const allowedKeys = [
  "trainingPlans_v3",
  "trainingWorkouts_v4",
  "nutritionEntries_v1",
  "mentalAssistant_checkins_v1",
];

test("each allowed storage key is accepted", () => {
  for (const key of allowedKeys) {
    const result = validateStorageKey(key);
    assert.equal(result.ok, true, `key ${key} should be allowed`);
  }
});

test("random key is rejected", () => {
  const result = validateStorageKey("unknownKey123");
  assert.equal(result.ok, false);
  assert.match(result.error, /не разрешен|whitelist/i);
});
