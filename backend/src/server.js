const path = require("path");

// Важно: загрузить .env ДО любых модулей, которые читают process.env (в т.ч. db.js)
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { initDb } = require("./db");
const { createApp } = require("./app");

const PORT = Number(process.env.PORT || 4000);

async function startServer() {
  if (!process.env.DATABASE_URL) {
    console.error("\nОшибка: не задана переменная DATABASE_URL.\n");
    console.error("Сделайте так:");
    console.error("  1) Убедитесь, что файл backend/.env существует (скопируйте из .env.example)");
    console.error("  2) В .env должна быть строка DATABASE_URL=postgresql://...");
    console.error("  3) Для Supabase: Project Settings -> Database -> Connection string -> URI\n");
    process.exit(1);
  }

  if (!process.env.JWT_SECRET) {
    console.error("\nОшибка: не задан JWT_SECRET в backend/.env\n");
    process.exit(1);
  }

  console.log("Подключение к PostgreSQL и применение миграций...");
  await initDb();
  console.log("База данных готова.");
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Server started: http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

startServer().catch((error) => {
  console.error("Server startup error:", error.message);
  if (/Connection terminated|ECONNRESET/i.test(error.message || "")) {
    console.error("\nПодсказка (Supabase):");
    console.error("  1) Проверьте, что проект в Dashboard не на паузе (Resume project).");
    console.error("  2) В пароле DATABASE_URL закодируйте ! как %21.");
    console.error("  3) Добавьте прямое подключение для миграций в .env:");
    console.error("     DATABASE_MIGRATION_URL=...db.<ref>.supabase.co:5432/postgres");
    console.error("     (Settings -> Database -> Connection string -> URI, порт 5432)");
  }
  if (error.message && error.message.includes("password authentication")) {
    console.error("\nПодсказка: проверьте пароль в DATABASE_URL. Спецсимволы в пароле нужно URL-кодировать (например ! -> %21).");
  }
  process.exit(1);
});
