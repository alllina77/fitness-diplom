const express = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const { authMiddleware } = require("../middleware/auth");
const { get, run } = require("../db");
const { buildProfilePayload, toClientProfile } = require("../utils/profile");

function createProfileRouter() {
  const router = express.Router();

  router.get(
    "/",
    authMiddleware,
    asyncHandler(async (req, res) => {
      const profile = await get(
        `
        SELECT first_name, last_name, middle_name, birth_date, gender,
               height_cm, weight_kg, target_weight_kg, activity_level,
               fitness_goal, city, phone, emergency_contact, medical_notes,
               avatar_url
        FROM user_profiles
        WHERE user_id = $1
        `,
        [req.user.userId]
      );
      return res.json({ profile: toClientProfile(profile) });
    })
  );

  router.put(
    "/",
    authMiddleware,
    asyncHandler(async (req, res) => {
      const profile = buildProfilePayload(req.body);
      const now = new Date().toISOString();

      await run(
        `
        INSERT INTO user_profiles (
          user_id, first_name, last_name, middle_name, birth_date, gender,
          height_cm, weight_kg, target_weight_kg, activity_level, fitness_goal,
          city, phone, emergency_contact, medical_notes, avatar_url, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT(user_id) DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          middle_name = EXCLUDED.middle_name,
          birth_date = EXCLUDED.birth_date,
          gender = EXCLUDED.gender,
          height_cm = EXCLUDED.height_cm,
          weight_kg = EXCLUDED.weight_kg,
          target_weight_kg = EXCLUDED.target_weight_kg,
          activity_level = EXCLUDED.activity_level,
          fitness_goal = EXCLUDED.fitness_goal,
          city = EXCLUDED.city,
          phone = EXCLUDED.phone,
          emergency_contact = EXCLUDED.emergency_contact,
          medical_notes = EXCLUDED.medical_notes,
          avatar_url = EXCLUDED.avatar_url,
          updated_at = EXCLUDED.updated_at
        `,
        [
          req.user.userId,
          profile.first_name,
          profile.last_name,
          profile.middle_name,
          profile.birth_date,
          profile.gender,
          profile.height_cm,
          profile.weight_kg,
          profile.target_weight_kg,
          profile.activity_level,
          profile.fitness_goal,
          profile.city,
          profile.phone,
          profile.emergency_contact,
          profile.medical_notes,
          profile.avatar_url,
          now,
        ]
      );

      return res.json({ ok: true });
    })
  );

  router.post(
    "/avatar",
    authMiddleware,
    asyncHandler(async (req, res) => {
      const avatarUrl = String(req.body?.avatarUrl || "").trim();
      if (!avatarUrl) {
        return res.status(400).json({ error: "Укажите ссылку на аватар" });
      }
      if (avatarUrl.length > 2048) {
        return res.status(400).json({ error: "Ссылка на аватар слишком длинная" });
      }

      await run(
        `
        UPDATE user_profiles
        SET avatar_url = $1, updated_at = NOW()
        WHERE user_id = $2
        `,
        [avatarUrl, req.user.userId]
      );

      return res.json({ ok: true, avatarUrl });
    })
  );

  return router;
}

module.exports = { createProfileRouter };
