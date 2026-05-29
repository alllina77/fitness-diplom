const express = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const { authMiddleware } = require("../middleware/auth");
const { all, get, run } = require("../db");
const {
  uid,
  validatePlanPayload,
  validateWorkoutPayload,
  buildAnalytics,
} = require("../services/training.service");

function createTrainingRouter() {
  const router = express.Router();

  router.get(
    "/plans",
    authMiddleware,
    asyncHandler(async (req, res) => {
      const plans = await all(
        `
        SELECT id, name, days, created_at AS "createdAt", updated_at AS "updatedAt"
        FROM training_plans
        WHERE user_id = $1
        ORDER BY created_at ASC
        `,
        [req.user.userId]
      );
      return res.json({ plans });
    })
  );

  router.post(
    "/plans",
    authMiddleware,
    asyncHandler(async (req, res) => {
      const validated = validatePlanPayload(req.body);
      if (!validated.ok) {
        return res.status(400).json({ error: validated.error });
      }

      const id = String(req.body?.id || uid("plan"));
      const now = new Date().toISOString();

      await run(
        `
        INSERT INTO training_plans (id, user_id, name, days, created_at, updated_at)
        VALUES ($1, $2, $3, $4::jsonb, $5, $6)
        ON CONFLICT(id) DO UPDATE SET
          name = EXCLUDED.name,
          days = EXCLUDED.days,
          updated_at = EXCLUDED.updated_at
        `,
        [id, req.user.userId, validated.value.name, JSON.stringify(validated.value.days), now, now]
      );

      return res.status(201).json({ ok: true, id });
    })
  );

  router.delete(
    "/plans/:id",
    authMiddleware,
    asyncHandler(async (req, res) => {
      const id = String(req.params.id || "").trim();
      if (!id) return res.status(400).json({ error: "Некорректный идентификатор плана" });

      await run("DELETE FROM training_plans WHERE id = $1 AND user_id = $2", [id, req.user.userId]);
      return res.json({ ok: true });
    })
  );

  router.get(
    "/workouts",
    authMiddleware,
    asyncHandler(async (req, res) => {
      const from = String(req.query.from || "").trim();
      const to = String(req.query.to || "").trim();

      let sql = `
        SELECT id, plan_id AS "planId", workout_date AS "date", ex_id AS "exId",
               ex_name AS "exName", muscle, sets, created_at AS "createdAt"
        FROM training_workouts
        WHERE user_id = $1
      `;
      const params = [req.user.userId];

      if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
        params.push(from);
        sql += ` AND workout_date >= $${params.length}`;
      }
      if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
        params.push(to);
        sql += ` AND workout_date <= $${params.length}`;
      }

      sql += " ORDER BY workout_date ASC, created_at ASC";
      const workouts = await all(sql, params);
      return res.json({ workouts });
    })
  );

  router.post(
    "/workouts",
    authMiddleware,
    asyncHandler(async (req, res) => {
      const validated = validateWorkoutPayload(req.body);
      if (!validated.ok) return res.status(400).json({ error: validated.error });

      const value = validated.value;
      await run(
        `
        INSERT INTO training_workouts (
          id, user_id, plan_id, workout_date, ex_id, ex_name, muscle, sets, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW())
        ON CONFLICT(id) DO UPDATE SET
          plan_id = EXCLUDED.plan_id,
          workout_date = EXCLUDED.workout_date,
          ex_id = EXCLUDED.ex_id,
          ex_name = EXCLUDED.ex_name,
          muscle = EXCLUDED.muscle,
          sets = EXCLUDED.sets
        `,
        [
          value.id,
          req.user.userId,
          value.planId || null,
          value.date,
          value.exId,
          value.exName,
          value.muscle,
          JSON.stringify(value.sets),
        ]
      );

      return res.status(201).json({ ok: true, id: value.id });
    })
  );

  router.get(
    "/analytics",
    authMiddleware,
    asyncHandler(async (req, res) => {
      const workouts = await all(
        `
        SELECT workout_date, ex_id, ex_name, muscle, sets
        FROM training_workouts
        WHERE user_id = $1
        ORDER BY workout_date ASC
        `,
        [req.user.userId]
      );

      const analytics = buildAnalytics(workouts);
      return res.json({ analytics });
    })
  );

  router.get(
    "/stats",
    authMiddleware,
    asyncHandler(async (req, res) => {
      const totals = await get(
        `
        SELECT
          COUNT(*)::int AS workouts_count,
          COALESCE(SUM(jsonb_array_length(sets)), 0)::int AS sets_count,
          COALESCE(SUM(
            (
              SELECT SUM((COALESCE((item->>'w')::numeric,0) * COALESCE((item->>'r')::numeric,0)))
              FROM jsonb_array_elements(sets) item
            )
          ), 0)::numeric AS total_volume
        FROM training_workouts
        WHERE user_id = $1
        `,
        [req.user.userId]
      );

      return res.json({
        stats: {
          workoutsCount: Number(totals?.workouts_count || 0),
          setsCount: Number(totals?.sets_count || 0),
          totalVolume: Number(totals?.total_volume || 0),
        },
      });
    })
  );

  return router;
}

module.exports = { createTrainingRouter };
