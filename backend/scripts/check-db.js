require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { all, initDb } = require("../src/db");

async function main() {
  const tables = await all(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );
  console.log("Tables:", tables.map((t) => t.table_name).join(", ") || "(none)");

  const migrations = await all("SELECT id FROM schema_migrations ORDER BY id").catch(() => []);
  console.log("Applied migrations:", migrations.map((m) => m.id).join(", ") || "(none)");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
