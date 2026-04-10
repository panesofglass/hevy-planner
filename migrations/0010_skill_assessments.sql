CREATE TABLE skill_assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  program_id INTEGER NOT NULL REFERENCES programs(id),
  skill_id TEXT NOT NULL,
  current_state TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, program_id, skill_id)
);

CREATE INDEX idx_skill_assessments_user_program
  ON skill_assessments (user_id, program_id);
