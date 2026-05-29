const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret";
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres";

const { createApp } = require("../app");
const app = createApp();

test("health endpoint responds with ok", async () => {
  const res = await request(app).get("/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
});

test("protected endpoint requires auth", async () => {
  const res = await request(app).get("/api/profile");
  assert.equal(res.status, 401);
  assert.equal(typeof res.body.error, "string");
});
