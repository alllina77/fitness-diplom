function sanitizeAvatarUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (value.startsWith("data:")) return "";
  return value.length > 2048 ? value.slice(0, 2048) : value;
}

function buildProfilePayload(body = {}) {
  const avatarUrl = sanitizeAvatarUrl(
    body.avatarUrl || body.avatarPhoto || body.avatar_url || body.avatar_photo || ""
  );

  return {
    first_name: String(body.firstName || "").trim(),
    last_name: String(body.lastName || "").trim(),
    middle_name: String(body.middleName || "").trim(),
    birth_date: String(body.birthDate || "").trim(),
    gender: String(body.gender || "").trim(),
    height_cm: Number(body.heightCm || 0) || 0,
    weight_kg: Number(body.weightKg || 0) || 0,
    target_weight_kg: Number(body.targetWeightKg || 0) || 0,
    activity_level: String(body.activityLevel || "").trim(),
    fitness_goal: String(body.fitnessGoal || "").trim(),
    city: String(body.city || "").trim(),
    phone: String(body.phone || "").trim(),
    emergency_contact: String(body.emergencyContact || "").trim(),
    medical_notes: String(body.medicalNotes || "").trim(),
    avatar_url: avatarUrl,
  };
}

function toClientProfile(row) {
  if (!row) return null;
  const avatarUrl = row.avatar_url || "";
  return {
    firstName: row.first_name,
    lastName: row.last_name,
    middleName: row.middle_name,
    birthDate: row.birth_date,
    gender: row.gender,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    targetWeightKg: row.target_weight_kg,
    activityLevel: row.activity_level,
    fitnessGoal: row.fitness_goal,
    city: row.city,
    phone: row.phone,
    emergencyContact: row.emergency_contact,
    medicalNotes: row.medical_notes,
    avatarUrl,
    avatarPhoto: avatarUrl,
    avatar_photo: avatarUrl,
  };
}

module.exports = {
  buildProfilePayload,
  toClientProfile,
  sanitizeAvatarUrl,
};
