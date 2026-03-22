import type { UserRow, QueueItemRow, ExerciseMappingRow } from "../types";

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
  items: Array<{ session_id: string; position: number }>
): Promise<void> {
  const stmt = db.prepare(
    "INSERT INTO queue_items (user_id, session_id, position) VALUES (?, ?, ?)"
  );
  const batch = items.map((item) => stmt.bind(userId, item.session_id, item.position));
  await db.batch(batch);
}

export async function markQueueItemCompleted(
  db: D1Database,
  itemId: number,
  completedDate: string,
  hevyWorkoutId?: string
): Promise<void> {
  await db
    .prepare(
      "UPDATE queue_items SET status = 'completed', completed_date = ?, hevy_workout_id = ? WHERE id = ?"
    )
    .bind(completedDate, hevyWorkoutId ?? null, itemId)
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

export async function getExerciseMappings(
  db: D1Database,
  userId: string
): Promise<ExerciseMappingRow[]> {
  const result = await db
    .prepare("SELECT * FROM exercise_mappings WHERE user_id = ?")
    .bind(userId)
    .all<ExerciseMappingRow>();
  return result.results;
}

export async function upsertExerciseMapping(
  db: D1Database,
  mapping: ExerciseMappingRow
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO exercise_mappings (user_id, program_exercise_name, hevy_exercise_id, confirmed_by_user)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, program_exercise_name) DO UPDATE SET
         hevy_exercise_id = excluded.hevy_exercise_id,
         confirmed_by_user = excluded.confirmed_by_user`
    )
    .bind(mapping.user_id, mapping.program_exercise_name, mapping.hevy_exercise_id, mapping.confirmed_by_user)
    .run();
}
