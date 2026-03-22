-- Drop old table
DROP TABLE IF EXISTS exercise_mappings;

-- New exercise template mappings
CREATE TABLE exercise_template_mappings (
  user_id TEXT NOT NULL REFERENCES users(id),
  program_template_id TEXT NOT NULL,
  hevy_template_id TEXT NOT NULL,
  is_custom INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, program_template_id)
);

-- Routine mappings
CREATE TABLE routine_mappings (
  user_id TEXT NOT NULL REFERENCES users(id),
  program_routine_id TEXT NOT NULL,
  hevy_routine_id TEXT NOT NULL,
  PRIMARY KEY (user_id, program_routine_id)
);

-- Rename session_id column in queue_items to routine_id
-- SQLite doesn't support ALTER COLUMN RENAME, so recreate the table
CREATE TABLE queue_items_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  routine_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_date TEXT,
  hevy_routine_id TEXT,
  hevy_workout_id TEXT
);

INSERT INTO queue_items_new (id, user_id, routine_id, position, status, completed_date, hevy_routine_id, hevy_workout_id)
SELECT id, user_id, session_id, position, status, completed_date, hevy_routine_id, hevy_workout_id
FROM queue_items;

DROP TABLE queue_items;
ALTER TABLE queue_items_new RENAME TO queue_items;
