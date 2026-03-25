-- Add program_id to scope queue and mappings per program
ALTER TABLE queue_items ADD COLUMN program_id INTEGER REFERENCES programs(id);
ALTER TABLE exercise_template_mappings ADD COLUMN program_id INTEGER REFERENCES programs(id);
ALTER TABLE routine_mappings ADD COLUMN program_id INTEGER REFERENCES programs(id);

-- Backfill existing data with the active program
UPDATE queue_items SET program_id = (
  SELECT p.id FROM programs p
  WHERE p.user_id = queue_items.user_id AND p.is_active = 1
  ORDER BY p.created_at DESC LIMIT 1
);
UPDATE exercise_template_mappings SET program_id = (
  SELECT p.id FROM programs p
  WHERE p.user_id = exercise_template_mappings.user_id AND p.is_active = 1
  ORDER BY p.created_at DESC LIMIT 1
);
UPDATE routine_mappings SET program_id = (
  SELECT p.id FROM programs p
  WHERE p.user_id = routine_mappings.user_id AND p.is_active = 1
  ORDER BY p.created_at DESC LIMIT 1
);
