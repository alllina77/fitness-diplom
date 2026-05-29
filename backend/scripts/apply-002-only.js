require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { run, get } = require("../src/db");

const statements = [
  `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE user_profiles DROP COLUMN IF EXISTS avatar_photo`,
  `ALTER TABLE user_storage ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1`,
  `CREATE TABLE IF NOT EXISTS training_plans (
    id TEXT PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    days JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS training_workouts (
    id TEXT PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id TEXT,
    workout_date DATE NOT NULL,
    ex_id TEXT NOT NULL,
    ex_name TEXT NOT NULL,
    muscle TEXT NOT NULL DEFAULT 'другое',
    sets JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
  )`,
];

async function main() {
  for (let i = 0; i < statements.length; i++) {
    const label = `statement ${i + 1}/${statements.length}`;
    try {
      console.log(`Running ${label}...`);
      await run(statements[i]);
      console.log(`OK ${label}`);
    } catch (error) {
      console.error(`FAIL ${label}:`, error.message);
    }
  }

  await run(
    "INSERT INTO schema_migrations (id, applied_at) VALUES ($1, NOW()) ON CONFLICT (id) DO NOTHING",
    ["002_upgrade_training_and_profile.sql"]
  );
  console.log("Marked 002 as applied.");
}

main();
