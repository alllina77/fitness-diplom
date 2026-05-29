const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { asyncHandler } = require("../middleware/asyncHandler");
const { authMiddleware } = require("../middleware/auth");
const { get, run, withTransaction } = require("../db");
const { isStrongPassword, sanitizeUsername } = require("../utils/authValidation");
const { buildProfilePayload, toClientProfile } = require("../utils/profile");

function createToken(user) {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || "12h";
  return jwt.sign({ userId: user.id, username: user.username }, secret, { expiresIn });
}

function createAuthRouter({ authLimiter }) {
  const router = express.Router();

  router.post(
    "/register",
    authLimiter,
    asyncHandler(async (req, res) => {
      const username = sanitizeUsername(req.body?.username);
      const password = String(req.body?.password || "");
      const profile = buildProfilePayload(req.body);

      if (username.length < 3 || !isStrongPassword(password)) {
        return res.status(400).json({
          error: "Логин минимум 3 символа. Пароль: минимум 8 символов, буква и цифра",
        });
      }

      if (!profile.first_name || !profile.last_name || !profile.birth_date || !profile.gender) {
        return res.status(400).json({
          error: "Для регистрации заполните: имя, фамилию, дату рождения и пол",
        });
      }
      if (!["male", "female"].includes(profile.gender)) {
        return res.status(400).json({ error: "Пол должен быть: male или female" });
      }

      const exists = await get("SELECT id FROM users WHERE username = $1", [username]);
      if (exists) {
        return res.status(409).json({ error: "Пользователь уже существует" });
      }

      const now = new Date().toISOString();
      const passwordHash = await bcrypt.hash(password, 10);

      const user = await withTransaction(async (client) => {
        const created = await run(
          "INSERT INTO users (username, password_hash, created_at) VALUES ($1, $2, $3) RETURNING id, username",
          [username, passwordHash, now],
          client
        );
        const userId = created.rows[0].id;
        await run(
          `
          INSERT INTO user_profiles (
            user_id, first_name, last_name, middle_name, birth_date, gender,
            height_cm, weight_kg, target_weight_kg, activity_level, fitness_goal,
            city, phone, emergency_contact, medical_notes, avatar_url, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          `,
          [
            userId,
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
          ],
          client
        );
        return { id: userId, username };
      });

      const token = createToken(user);
      return res.status(201).json({ token, user });
    })
  );

  router.post(
    "/login",
    authLimiter,
    asyncHandler(async (req, res) => {
      const username = sanitizeUsername(req.body?.username);
      const password = String(req.body?.password || "");

      const user = await get(
        "SELECT id, username, password_hash FROM users WHERE username = $1",
        [username]
      );

      if (!user) {
        return res.status(401).json({ error: "Неверный логин или пароль" });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: "Неверный логин или пароль" });
      }

      const token = createToken(user);
      return res.json({ token, user: { id: user.id, username: user.username } });
    })
  );

  router.get(
    "/me",
    authMiddleware,
    asyncHandler(async (req, res) => {
      const user = await get("SELECT id, username, created_at FROM users WHERE id = $1", [
        req.user.userId,
      ]);
      if (!user) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }

      const profileRow = await get(
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

      return res.json({ user, profile: toClientProfile(profileRow) });
    })
  );

  return router;
}

module.exports = { createAuthRouter };
