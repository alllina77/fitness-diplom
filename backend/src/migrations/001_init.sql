CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  middle_name TEXT NOT NULL DEFAULT '',
  birth_date TEXT NOT NULL DEFAULT '',
  gender TEXT NOT NULL DEFAULT '',
  height_cm DOUBLE PRECISION NOT NULL DEFAULT 0,
  weight_kg DOUBLE PRECISION NOT NULL DEFAULT 0,
  target_weight_kg DOUBLE PRECISION NOT NULL DEFAULT 0,
  activity_level TEXT NOT NULL DEFAULT '',
  fitness_goal TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  emergency_contact TEXT NOT NULL DEFAULT '',
  medical_notes TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS user_storage (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value_json JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE(user_id, key)
);

CREATE TABLE IF NOT EXISTS social_posts (
  id TEXT PRIMARY KEY,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS social_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS social_likes (
  post_id TEXT NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (post_id, username)
);

CREATE TABLE IF NOT EXISTS social_reactions (
  post_id TEXT NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  username TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (post_id, emoji, username)
);

CREATE TABLE IF NOT EXISTS training_plans (
  id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  days JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_training_plans_user ON training_plans(user_id);

CREATE TABLE IF NOT EXISTS training_workouts (
  id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id TEXT,
  workout_date DATE NOT NULL,
  ex_id TEXT NOT NULL,
  ex_name TEXT NOT NULL,
  muscle TEXT NOT NULL DEFAULT 'другое',
  sets JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_training_workouts_user_date ON training_workouts(user_id, workout_date);
