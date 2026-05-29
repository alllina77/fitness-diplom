const test = require("node:test");
const assert = require("node:assert/strict");
const { validateStorageKey } = require("../utils/storageValidation");

test("storage key whitelist accepts allowed keys", () => {
  const ok = validateStorageKey("trainingPlans_v3");
  assert.equal(ok.ok, true);
});

test("storage key whitelist rejects unknown keys", () => {
  const bad = validateStorageKey("someRandomKey");
  assert.equal(bad.ok, false);
  assert.equal(typeof bad.error, "string");
});
