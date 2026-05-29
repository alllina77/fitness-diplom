require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const db = require("../src/db");

async function step(name, fn) {
  const started = Date.now();
  try {
    await fn();
    console.log(`OK ${name} (${Date.now() - started}ms)`);
  } catch (error) {
    console.error(`FAIL ${name} (${Date.now() - started}ms):`, error.message);
    throw error;
  }
}

async function main() {
  await step("ensureMigrationsTable", async () => {
    await db.run(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  });

  await step("bootstrap users check", async () => {
    await db.get(
      `SELECT 1 AS ok FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'users'`
    );
  });

  await step("migration 001 check", async () => {
    await db.get("SELECT id FROM schema_migrations WHERE id = $1", ["001_init.sql"]);
  });

  await step("migration 002 check", async () => {
    await db.get("SELECT id FROM schema_migrations WHERE id = $1", [
      "002_upgrade_training_and_profile.sql",
    ]);
  });

  console.log("All steps passed");
}

main().catch(() => process.exit(1));
