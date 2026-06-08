require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { all } = require("../src/db");

all(
  "SELECT u.username, s.key, LEFT(s.value_json, 120) AS preview, s.version FROM user_storage s JOIN users u ON u.id = s.user_id ORDER BY u.username, s.key"
)
  .then((rows) => {
    rows.forEach((r) =>
      console.log(`${r.username} | ${r.key} | v${r.version} | ${r.preview}`)
    );
    console.log("\nTotal rows:", rows.length);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
