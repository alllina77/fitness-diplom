const test = require("node:test");
const assert = require("node:assert/strict");
const { isStrongPassword } = require("../utils/authValidation");

test("password policy requires 8+ chars, letter and digit", () => {
  assert.equal(isStrongPassword("abc123"), false);
  assert.equal(isStrongPassword("abcdefgh"), false);
  assert.equal(isStrongPassword("12345678"), false);
  assert.equal(isStrongPassword("abc12345"), true);
  assert.equal(isStrongPassword("StrongPass9"), true);
});
