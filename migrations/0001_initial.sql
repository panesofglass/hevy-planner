CREATE TABLE users (
  id TEXT PRIMARY KEY,
  hevy_api_key_encrypted TEXT,
  active_program TEXT NOT NULL,
  template_id TEXT NOT NULL,
  start_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE queue_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  session_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_date TEXT,
  hevy_routine_id TEXT,
  hevy_workout_id TEXT,
  UNIQUE(user_id, position)
);

CREATE TABLE skill_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  skill_id TEXT NOT NULL,
  milestone_index INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, skill_id)
);

CREATE TABLE exercise_mappings (
  user_id TEXT NOT NULL REFERENCES users(id),
  program_exercise_name TEXT NOT NULL,
  hevy_exercise_id TEXT NOT NULL,
  confirmed_by_user INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, program_exercise_name)
);
