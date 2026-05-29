const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");

test("server entry loads dotenv before requiring db", () => {
  const envPath = path.join(__dirname, "..", "..", ".env");
  const exists = fs.existsSync(envPath);
  assert.equal(exists, true, ".env file should exist in backend folder");

  delete process.env.DATABASE_URL;
  delete process.env.JWT_SECRET;

  require("dotenv").config({ path: envPath });

  assert.ok(process.env.DATABASE_URL, "DATABASE_URL should be loaded from .env");
  assert.ok(process.env.JWT_SECRET, "JWT_SECRET should be loaded from .env");
});
