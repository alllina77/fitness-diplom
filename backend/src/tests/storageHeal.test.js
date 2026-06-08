const test = require("node:test");
const assert = require("node:assert/strict");
const { healStoredValue } = require("../routes/storage.routes");

test("heal returns clean JSON array string unchanged", () => {
  const clean = '[{"id":"p1","name":"План","days":[]}]';
  assert.equal(healStoredValue(clean), clean);
});

test("heal unwraps legacy double-encoded JSON array", () => {
  const clean = '[{"id":"p1","name":"План","days":[]}]';
  const doubleEncoded = JSON.stringify(clean); // как старые битые записи
  assert.equal(healStoredValue(doubleEncoded), clean);
});

test("heal keeps plain token strings", () => {
  assert.equal(healStoredValue("dark"), "dark");
  assert.equal(healStoredValue("true"), "true");
});

test("heal unwraps legacy double-encoded plain string", () => {
  assert.equal(healStoredValue('"dark"'), "dark");
});

test("heal keeps clean object string unchanged", () => {
  const clean = '{"a":1,"b":2}';
  assert.equal(healStoredValue(clean), clean);
});

test("heal unwraps multiply-encoded value (legacy v39 case)", () => {
  const clean = '{"lunch":true,"dinner":true}';
  let corrupted = clean;
  for (let i = 0; i < 6; i += 1) {
    corrupted = JSON.stringify(corrupted);
  }
  assert.equal(healStoredValue(corrupted), clean);
});

test("heal keeps numeric-like token as string", () => {
  assert.equal(healStoredValue("103"), "103");
  assert.equal(healStoredValue('"103"'), "103");
});
