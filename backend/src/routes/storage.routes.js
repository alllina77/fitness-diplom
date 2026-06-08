const express = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const { authMiddleware } = require("../middleware/auth");
const { all, get, run } = require("../db");
const { validateStorageKey } = require("../utils/storageValidation");

// Колонка value_json имеет тип TEXT и хранит строку из localStorage как есть.
// Старые записи были закодированы по нескольку раз подряд (каждое сохранение
// добавляло новый слой JSON-строки). Разворачиваем слои, пока значение
// остаётся "строкой внутри строки", и возвращаем исходную строку.
function healStoredValue(raw) {
  if (typeof raw !== "string") return raw;
  let current = raw;
  for (let i = 0; i < 40; i += 1) {
    let parsed;
    try {
      parsed = JSON.parse(current);
    } catch (_e) {
      break; // не JSON — это финальная строка (например "dark")
    }
    if (typeof parsed === "string") {
      current = parsed; // ещё один лишний слой кодирования — продолжаем
      continue;
    }
    break; // дошли до настоящей структуры (массив/объект/число) — current валиден
  }
  return current;
}

function createStorageRouter() {
  const router = express.Router();

  router.get(
    "/",
    authMiddleware,
    asyncHandler(async (req, res) => {
      const rows = await all(
        "SELECT key, value_json, updated_at, version FROM user_storage WHERE user_id = $1",
        [req.user.userId]
      );
      const items = {};
      rows.forEach((row) => {
        items[row.key] = {
          value: healStoredValue(row.value_json),
          updatedAt: row.updated_at,
          version: row.version,
        };
      });
      return res.json({ items });
    })
  );

  router.put(
    "/:key",
    authMiddleware,
    asyncHandler(async (req, res) => {
      const validated = validateStorageKey(req.params.key);
      if (!validated.ok) {
        return res.status(400).json({ error: validated.error });
      }

      const value = req.body?.value;
      if (value === undefined) {
        return res.status(400).json({ error: "Поле value обязательно" });
      }

      const key = validated.key;
      const existing = await get(
        "SELECT version FROM user_storage WHERE user_id = $1 AND key = $2",
        [req.user.userId, key]
      );

      const expectedVersionHeader = req.headers["if-match"];
      if (expectedVersionHeader && existing) {
        const expectedVersion = Number(expectedVersionHeader);
        if (!Number.isFinite(expectedVersion) || expectedVersion !== Number(existing.version)) {
          return res.status(409).json({
            error: "Конфликт версии данных. Обновите данные и повторите сохранение",
          });
        }
      }

      const nextVersion = existing ? Number(existing.version) + 1 : 1;
      // value_json — TEXT. Храним строку из localStorage как есть, без ::jsonb,
      // чтобы при чтении получить ровно то же значение (без двойного кодирования).
      await run(
        `
        INSERT INTO user_storage (user_id, key, value_json, version, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT(user_id, key)
        DO UPDATE SET
          value_json = EXCLUDED.value_json,
          version = EXCLUDED.version,
          updated_at = EXCLUDED.updated_at
        `,
        [req.user.userId, key, String(value), nextVersion]
      );

      return res.json({ ok: true, version: nextVersion });
    })
  );

  router.delete(
    "/:key",
    authMiddleware,
    asyncHandler(async (req, res) => {
      const validated = validateStorageKey(req.params.key);
      if (!validated.ok) {
        return res.status(400).json({ error: validated.error });
      }
      await run("DELETE FROM user_storage WHERE user_id = $1 AND key = $2", [
        req.user.userId,
        validated.key,
      ]);
      return res.json({ ok: true });
    })
  );

  return router;
}

module.exports = { createStorageRouter, healStoredValue };
