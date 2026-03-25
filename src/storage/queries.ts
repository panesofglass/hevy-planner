import type { UserRow, QueueItemRow, ExerciseTemplateMappingRow, RoutineMappingRow, ProgramRow } from "../types";

export async function getUser(db: D1Database, userId: string): Promise<UserRow | null> {
  return db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first<UserRow>();
}

export async function upsertUser(
  db: D1Database,
  user: { id: string; active_program: string; template_id: string; start_date: string; hevy_api_key?: string }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO users (id, active_program, template_id, start_date, hevy_api_key)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         active_program = excluded.active_program,
         template_id = excluded.template_id,
         start_date = excluded.start_date,
         hevy_api_key = COALESCE(excluded.hevy_api_key, users.hevy_api_key)`
    )
    .bind(user.id, user.active_program, user.template_id, user.start_date, user.hevy_api_key ?? null)
    .run();
}

export async function getQueueItems(db: D1Database, userId: string): Promise<QueueItemRow[]> {
  const result = await db
    .prepare("SELECT * FROM queue_items WHERE user_id = ? ORDER BY position")
    .bind(userId)
    .all<QueueItemRow>();
  return result.results;
}

export async function insertQueueItems(
  db: D1Database,
  userId: string,
  items: Array<{ routine_id: string; position: number }>
): Promise<void> {
  const stmt = db.prepare(
    "INSERT INTO queue_items (user_id, routine_id, position) VALUES (?, ?, ?)"
  );
  const batch = items.map((item) => stmt.bind(userId, item.routine_id, item.position));
  await db.batch(batch);
}

export async function markQueueItemCompleted(
  db: D1Database,
  itemId: number,
  completedDate: string,
  hevyWorkoutId?: string,
  workoutData?: string
): Promise<void> {
  await db
    .prepare(
      "UPDATE queue_items SET status = 'completed', completed_date = ?, hevy_workout_id = ?, hevy_workout_data = ? WHERE id = ?"
    )
    .bind(completedDate, hevyWorkoutId ?? null, workoutData ?? null, itemId)
    .run();
}

export async function markQueueItemCompletedForUser(
  db: D1Database,
  itemId: number,
  userId: string,
  completedDate: string,
  hevyWorkoutId?: string
): Promise<void> {
  await db
    .prepare(
      "UPDATE queue_items SET status = 'completed', completed_date = ?, hevy_workout_id = ? WHERE id = ? AND user_id = ?"
    )
    .bind(completedDate, hevyWorkoutId ?? null, itemId, userId)
    .run();
}

export async function updateQueueItemHevyRoutineId(
  db: D1Database,
  itemId: number,
  routineId: string
): Promise<void> {
  await db
    .prepare("UPDATE queue_items SET hevy_routine_id = ? WHERE id = ?")
    .bind(routineId, itemId)
    .run();
}

export async function getExerciseTemplateMappings(
  db: D1Database,
  userId: string
): Promise<ExerciseTemplateMappingRow[]> {
  const result = await db
    .prepare("SELECT * FROM exercise_template_mappings WHERE user_id = ?")
    .bind(userId)
    .all<ExerciseTemplateMappingRow>();
  return result.results;
}

export async function upsertExerciseTemplateMapping(
  db: D1Database,
  mapping: ExerciseTemplateMappingRow
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO exercise_template_mappings (user_id, program_template_id, hevy_template_id, is_custom)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, program_template_id) DO UPDATE SET
         hevy_template_id = excluded.hevy_template_id,
         is_custom = excluded.is_custom`
    )
    .bind(mapping.user_id, mapping.program_template_id, mapping.hevy_template_id, mapping.is_custom)
    .run();
}

export async function getRoutineMappings(
  db: D1Database,
  userId: string
): Promise<RoutineMappingRow[]> {
  const result = await db
    .prepare("SELECT * FROM routine_mappings WHERE user_id = ?")
    .bind(userId)
    .all<RoutineMappingRow>();
  return result.results;
}

export async function upsertRoutineMapping(
  db: D1Database,
  mapping: RoutineMappingRow
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO routine_mappings (user_id, program_routine_id, hevy_routine_id)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id, program_routine_id) DO UPDATE SET
         hevy_routine_id = excluded.hevy_routine_id`
    )
    .bind(mapping.user_id, mapping.program_routine_id, mapping.hevy_routine_id)
    .run();
}

export async function bulkSetQueueItemRoutineIds(
  db: D1Database,
  userId: string,
  routineIdMap: Map<string, string>
): Promise<void> {
  if (routineIdMap.size === 0) return;
  const stmt = db.prepare(
    "UPDATE queue_items SET hevy_routine_id = ? WHERE user_id = ? AND routine_id = ?"
  );
  const batch = [...routineIdMap.entries()].map(([programRoutineId, hevyRoutineId]) =>
    stmt.bind(hevyRoutineId, userId, programRoutineId)
  );
  await db.batch(batch);
}

export async function insertProgram(
  db: D1Database,
  userId: string,
  jsonData: string
): Promise<number> {
  const deactivate = db
    .prepare("UPDATE programs SET is_active = 0 WHERE user_id = ? AND is_active = 1")
    .bind(userId);
  const insert = db
    .prepare("INSERT INTO programs (user_id, json_data) VALUES (?, ?)")
    .bind(userId, jsonData);
  const [, insertResult] = await db.batch([deactivate, insert]);
  const id = insertResult.meta.last_row_id;
  if (id == null) throw new Error(`Failed to insert program for user ${userId}`);
  return id;
}

export async function updateDailyCompleted(
  db: D1Database,
  userId: string,
  date: string
): Promise<void> {
  await db
    .prepare("UPDATE users SET daily_completed_date = ? WHERE id = ?")
    .bind(date, userId)
    .run();
}

export async function getActiveProgram(
  db: D1Database,
  userId: string
): Promise<Pick<ProgramRow, "id" | "json_data"> | null> {
  return db
    .prepare(
      `SELECT id, json_data FROM programs
       WHERE user_id = ? AND is_active = 1
       ORDER BY created_at DESC LIMIT 1`
    )
    .bind(userId)
    .first<Pick<ProgramRow, "id" | "json_data">>();
}

export async function updateWebhookState(
  db: D1Database,
  userId: string,
  webhookId: string,
  authToken: string
): Promise<void> {
  await db
    .prepare("UPDATE users SET webhook_id = ?, webhook_auth_token = ? WHERE id = ?")
    .bind(webhookId, authToken, userId)
    .run();
}

export async function clearWebhookState(
  db: D1Database,
  userId: string
): Promise<void> {
  await db
    .prepare("UPDATE users SET webhook_id = NULL, webhook_auth_token = NULL WHERE id = ?")
    .bind(userId)
    .run();
}

export async function updateLastSyncAt(
  db: D1Database,
  userId: string,
  timestamp: string
): Promise<void> {
  await db
    .prepare("UPDATE users SET last_sync_at = ? WHERE id = ?")
    .bind(timestamp, userId)
    .run();
}

export async function getUserByWebhookToken(
  db: D1Database,
  authToken: string
): Promise<UserRow | null> {
  return db
    .prepare("SELECT * FROM users WHERE webhook_auth_token = ?")
    .bind(authToken)
    .first<UserRow>();
}

/** Delete only pending queue items for a user (preserve completed for history) */
export async function clearPendingQueueItems(db: D1Database, userId: string): Promise<void> {
  await db.prepare("DELETE FROM queue_items WHERE user_id = ? AND status = 'pending'").bind(userId).run();
}

/** Clear all exercise template and routine mappings for a user */
export async function clearMappings(db: D1Database, userId: string): Promise<void> {
  await db.prepare("DELETE FROM exercise_template_mappings WHERE user_id = ?").bind(userId).run();
  await db.prepare("DELETE FROM routine_mappings WHERE user_id = ?").bind(userId).run();
}
