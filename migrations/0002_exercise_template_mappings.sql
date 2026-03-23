-- Migration 0002: exercise template + routine mappings, queue_items rename
-- Idempotent: 0001 may already include the final schema on fresh installs.

DROP TABLE IF EXISTS exercise_mappings;

CREATE TABLE IF NOT EXISTS exercise_template_mappings (
  user_id TEXT NOT NULL REFERENCES users(id),
  program_template_id TEXT NOT NULL,
  hevy_template_id TEXT NOT NULL,
  is_custom INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, program_template_id)
);

CREATE TABLE IF NOT EXISTS routine_mappings (
  user_id TEXT NOT NULL REFERENCES users(id),
  program_routine_id TEXT NOT NULL,
  hevy_routine_id TEXT NOT NULL,
  PRIMARY KEY (user_id, program_routine_id)
);
