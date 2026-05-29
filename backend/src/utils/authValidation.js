function isStrongPassword(password) {
  const value = String(password || "");
  return /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(value);
}

function sanitizeUsername(username) {
  return String(username || "").trim();
}

module.exports = {
  isStrongPassword,
  sanitizeUsername,
};
