const fs = require("fs/promises");
const path = require("path");
const { Pool } = require("pg");

const RETRIABLE_DB_ERRORS =
  /Connection terminated|ECONNRESET|ETIMEDOUT|timeout expired|server closed the connection/i;

function getDatabaseUrl() {
  const databaseUrl =
    process.env.DATABASE_MIGRATION_URL ||
    process.env.DATABASE_URL;
  if (!databaseUrl || !String(databaseUrl).trim()) {
    throw new Error(
      "DATABASE_URL is required. Create backend/.env from .env.example and set your PostgreSQL connection string."
    );
  }
  return normalizeDatabaseUrl(databaseUrl.trim());
}

function normalizeDatabaseUrl(url) {
  let normalized = url;
  if (normalized.includes(":6543") && !/pgbouncer=true/i.test(normalized)) {
    normalized += normalized.includes("?") ? "&" : "?";
    normalized += "pgbouncer=true";
  }
  return normalized;
}

const databaseUrlForSsl = () =>
  process.env.DATABASE_MIGRATION_URL ||
  process.env.DATABASE_URL ||
  "";

const useSsl =
  process.env.PG_SSL === "true" ||
  process.env.NODE_ENV === "production" ||
  databaseUrlForSsl().includes("sslmode=require");

const rejectUnauthorized = process.env.PG_SSL_REJECT_UNAUTHORIZED === "true";

let pool;

function resetPool() {
  if (pool) {
    pool.end().catch(() => {});
    pool = null;
  }
}

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: getDatabaseUrl(),
      ssl: useSsl ? { rejectUnauthorized } : false,
      max: Number(process.env.PG_POOL_MAX || 3),
      connectionTimeoutMillis: 20000,
      idleTimeoutMillis: 30000,
      keepAlive: true,
    });
    pool.on("error", (error) => {
      console.warn("PostgreSQL pool error:", error.message);
      resetPool();
    });
  }
  return pool;
}

async function withRetry(label, fn, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const retriable = RETRIABLE_DB_ERRORS.test(error.message || "");
      if (!retriable || attempt === attempts) throw error;
      resetPool();
      const delayMs = 400 * attempt;
      console.warn(
        `Повтор подключения к БД (${attempt}/${attempts - 1}) после «${label}»: ${error.message}`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

async function query(sql, params = [], client) {
  return withRetry("query", async () => {
    const db = client || getPool();
    return db.query(sql, params);
  });
}

async function run(sql, params = [], client) {
  const result = await query(sql, params, client);
  return {
    rowCount: result.rowCount,
    rows: result.rows,
    lastID: result.rows?.[0]?.id,
  };
}

async function get(sql, params = [], client) {
  const result = await query(sql, params, client);
  return result.rows[0] || null;
}

async function all(sql, params = [], client) {
  const result = await query(sql, params, client);
  return result.rows;
}

async function withTransaction(work) {
  return withRetry("transaction", async () => {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  });
}

async function listMigrationFiles() {
  const migrationsDir = path.join(__dirname, "migrations");
  return (await fs.readdir(migrationsDir))
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

async function ensureMigrationsTable() {
  await run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

function splitSqlStatements(sql) {
  return sql
    .split(/;\s*[\r\n]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !part.startsWith("--"));
}

async function bootstrapLegacyDatabase() {
  const usersTable = await get(
    `SELECT 1 AS ok FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'users'`
  );
  if (!usersTable) return;

  const migration001 = await get(
    "SELECT id FROM schema_migrations WHERE id = $1",
    ["001_init.sql"]
  );
  if (!migration001) {
    await run(
      "INSERT INTO schema_migrations (id, applied_at) VALUES ($1, NOW()) ON CONFLICT (id) DO NOTHING",
      ["001_init.sql"]
    );
    console.log(
      "База уже содержит таблицы users — миграция 001_init.sql отмечена как выполненная."
    );
  }
}

async function migrationsAreUpToDate(files) {
  if (!files.length) return true;
  const rows = await all(
    "SELECT id FROM schema_migrations WHERE id = ANY($1::text[])",
    [files]
  );
  return rows.length === files.length;
}

async function applyMigrations() {
  const files = await listMigrationFiles();
  await ensureMigrationsTable();
  await bootstrapLegacyDatabase();

  if (await migrationsAreUpToDate(files)) {
    console.log(`Миграции актуальны (${files.length} файлов).`);
    return;
  }

  const migrationsDir = path.join(__dirname, "migrations");

  for (const fileName of files) {
    const alreadyApplied = await get(
      "SELECT id FROM schema_migrations WHERE id = $1",
      [fileName]
    );
    if (alreadyApplied) continue;

    const sql = await fs.readFile(path.join(migrationsDir, fileName), "utf-8");
    const statements = splitSqlStatements(sql);
    console.log(`Applying migration: ${fileName} (${statements.length} statements)`);

    for (const statement of statements) {
      await run(`${statement};`);
    }

    await run(
      "INSERT INTO schema_migrations (id, applied_at) VALUES ($1, NOW()) ON CONFLICT (id) DO NOTHING",
      [fileName]
    );
  }
}

async function initDb() {
  await withRetry("initDb", () => applyMigrations());
}

module.exports = {
  getPool,
  resetPool,
  run,
  get,
  all,
  query,
  withTransaction,
  initDb,
};
