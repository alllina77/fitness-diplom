require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { all, run } = require("../src/db");
const { healStoredValue } = require("../src/routes/storage.routes");

async function main() {
  const rows = await all(
    "SELECT id, user_id, key, value_json FROM user_storage ORDER BY id"
  );
  let fixed = 0;
  for (const row of rows) {
    const healed = healStoredValue(row.value_json);
    if (healed !== row.value_json) {
      await run("UPDATE user_storage SET value_json = $1 WHERE id = $2", [
        healed,
        row.id,
      ]);
      fixed += 1;
      console.log(`fixed row id=${row.id} key=${row.key}`);
    }
  }
  console.log(`\nDone. Rows checked: ${rows.length}, fixed: ${fixed}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("FAIL:", e.message);
    process.exit(1);
  });
