const test = require("node:test");
const assert = require("node:assert/strict");
const { validateStorageKey } = require("../utils/storageValidation");

test("storage key whitelist accepts allowed keys", () => {
  const ok = validateStorageKey("trainingPlans_v3");
  assert.equal(ok.ok, true);
});

test("storage key whitelist accepts avatarProgress_v1", () => {
  const ok = validateStorageKey("avatarProgress_v1");
  assert.equal(ok.ok, true);
});

test("storage key whitelist rejects unknown keys", () => {
  const bad = validateStorageKey("someRandomKey");
  assert.equal(bad.ok, false);
  assert.equal(typeof bad.error, "string");
});

test("storage key accepts known app namespaces by prefix", () => {
  for (const key of [
    "trainingCurrentPlanId_v2",
    "socialFollowEdges_v1",
    "profileVisualByUser_v1",
    "digitalAvatar_v1",
    "mentalAssistant_onboarding_done_v1",
  ]) {
    assert.equal(validateStorageKey(key).ok, true, `key ${key} should be allowed`);
  }
});

test("storage key rejects invalid characters", () => {
  assert.equal(validateStorageKey("training; DROP TABLE").ok, false);
  assert.equal(validateStorageKey("../etc/passwd").ok, false);
});

test("storage key rejects overly long keys", () => {
  assert.equal(validateStorageKey("training" + "x".repeat(200)).ok, false);
});
