const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const { createAuthRouter } = require("./routes/auth.routes");
const { createProfileRouter } = require("./routes/profile.routes");
const { createStorageRouter } = require("./routes/storage.routes");
const { createSocialRouter } = require("./routes/social.routes");
const { createTrainingRouter } = require("./routes/training.routes");

function buildCorsConfig() {
  const origin = process.env.CORS_ORIGIN || "*";
  if (origin === "*") {
    return { origin: true };
  }
  const allowed = origin.split(",").map((v) => v.trim()).filter(Boolean);
  return {
    origin: (requestOrigin, cb) => {
      if (!requestOrigin || allowed.includes(requestOrigin)) return cb(null, true);
      return cb(new Error("CORS origin denied"));
    },
  };
}

function createApp() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required in environment variables");
  }

  const app = express();
  const frontendDir = path.join(__dirname, "..", "..", "ДИПЛОМ 2");

  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors(buildCorsConfig()));
  app.use(express.json({ limit: "1mb" }));

  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Слишком много запросов. Попробуйте позже" },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Слишком много попыток входа. Попробуйте позже" },
  });

  app.use(globalLimiter);
  app.use(express.static(frontendDir));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "fitness-backend" });
  });

  app.use("/api/auth", createAuthRouter({ authLimiter }));
  app.use("/api/profile", createProfileRouter());
  app.use("/api/storage", createStorageRouter());
  app.use("/api/social", createSocialRouter());
  app.use("/api/training", createTrainingRouter());

  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendDir, "213223232.html"));
  });

  app.use((err, _req, res, _next) => {
    if (err?.message === "CORS origin denied") {
      return res.status(403).json({ error: "Запрос с этого источника запрещен" });
    }
    console.error(err);
    return res.status(500).json({ error: "Внутренняя ошибка сервера" });
  });

  return app;
}

module.exports = { createApp };
