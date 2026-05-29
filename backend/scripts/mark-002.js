require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { run } = require("../src/db");

run(
  "INSERT INTO schema_migrations (id, applied_at) VALUES ($1, NOW()) ON CONFLICT (id) DO NOTHING",
  ["002_upgrade_training_and_profile.sql"]
)
  .then(() => console.log("002 marked as applied"))
  .catch((e) => console.error(e.message));
