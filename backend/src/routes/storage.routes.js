const express = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const { authMiddleware } = require("../middleware/auth");
const { all, get, run } = require("../db");
const { validateStorageKey } = require("../utils/storageValidation");

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
          value: row.value_json,
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
      await run(
        `
        INSERT INTO user_storage (user_id, key, value_json, version, updated_at)
        VALUES ($1, $2, $3::jsonb, $4, NOW())
        ON CONFLICT(user_id, key)
        DO UPDATE SET
          value_json = EXCLUDED.value_json,
          version = EXCLUDED.version,
          updated_at = EXCLUDED.updated_at
        `,
        [req.user.userId, key, JSON.stringify(value), nextVersion]
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

module.exports = { createStorageRouter };
