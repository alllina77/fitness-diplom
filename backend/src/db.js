const { Pool } = require("pg");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required in environment variables");
}

const useSsl =
  process.env.PG_SSL === "true" ||
  process.env.NODE_ENV === "production" ||
  databaseUrl.includes("sslmode=require");

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

async function run(sql, params = []) {
  const result = await pool.query(sql, params);
  return {
    rowCount: result.rowCount,
    rows: result.rows,
    lastID: result.rows?.[0]?.id,
  };
}

async function get(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows[0];
}

async function all(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS user_storage (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      value_json TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      UNIQUE(user_id, key)
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      first_name TEXT NOT NULL DEFAULT '',
      last_name TEXT NOT NULL DEFAULT '',
      middle_name TEXT NOT NULL DEFAULT '',
      birth_date TEXT NOT NULL DEFAULT '',
      gender TEXT NOT NULL DEFAULT '',
      height_cm DOUBLE PRECISION NOT NULL DEFAULT 0,
      weight_kg DOUBLE PRECISION NOT NULL DEFAULT 0,
      target_weight_kg DOUBLE PRECISION NOT NULL DEFAULT 0,
      activity_level TEXT NOT NULL DEFAULT '',
      fitness_goal TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      emergency_contact TEXT NOT NULL DEFAULT '',
      medical_notes TEXT NOT NULL DEFAULT '',
      avatar_photo TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL
    )
  `);

  // Social feed (shared across all users/devices)
  await run(`
    CREATE TABLE IF NOT EXISTS social_posts (
      id TEXT PRIMARY KEY,
      author TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      pinned BOOLEAN NOT NULL DEFAULT FALSE
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS social_comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
      author TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at BIGINT NOT NULL
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS social_likes (
      post_id TEXT NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
      username TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      PRIMARY KEY (post_id, username)
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS social_reactions (
      post_id TEXT NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
      emoji TEXT NOT NULL,
      username TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      PRIMARY KEY (post_id, emoji, username)
    )
  `);
}

module.exports = {
  run,
  get,
  all,
  initDb,
};
