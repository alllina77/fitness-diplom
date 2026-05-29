const test = require("node:test");
const assert = require("node:assert/strict");
const { buildProfilePayload, sanitizeAvatarUrl, toClientProfile } = require("../utils/profile");

test("sanitizeAvatarUrl rejects base64 data URLs", () => {
  assert.equal(sanitizeAvatarUrl("data:image/png;base64,abc"), "");
  assert.equal(sanitizeAvatarUrl("https://example.com/a.png"), "https://example.com/a.png");
});

test("buildProfilePayload maps avatar fields to avatar_url", () => {
  const payload = buildProfilePayload({
    firstName: "Иван",
    avatarPhoto: "https://cdn.example/avatar.png",
  });
  assert.equal(payload.avatar_url, "https://cdn.example/avatar.png");
});

test("toClientProfile exposes avatar aliases for frontend", () => {
  const row = {
    first_name: "Анна",
    last_name: "Иванова",
    avatar_url: "https://x.test/av.png",
  };
  const client = toClientProfile(row);
  assert.equal(client.avatarUrl, "https://x.test/av.png");
  assert.equal(client.avatarPhoto, "https://x.test/av.png");
});
