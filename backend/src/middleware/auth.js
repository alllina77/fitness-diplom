const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const authHeader = String(req.headers.authorization || "");
  const [, token] = authHeader.split(" ");
  if (!token) {
    return res.status(401).json({ error: "Требуется авторизация" });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (_error) {
    return res.status(401).json({ error: "Токен недействителен" });
  }
}

module.exports = { authMiddleware };
