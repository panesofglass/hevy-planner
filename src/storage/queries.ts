import type { UserRow, QueueItemRow, ExerciseTemplateMappingRow, RoutineMappingRow, ProgramRow, Program, BenchmarkResultRow } from "../types";
import { sha256Hex, encryptAesGcm } from "../utils/crypto";

export async function getUser(db: D1Database, userId: string): Promise<UserRow | null> {
  return db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first<UserRow>();
}

export async function upsertUser(
  db: D1Database,
  user: { id: string; active_program: string; template_id: string; start_date: string; hevy_api_key?: string; timezone?: string }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO users (id, active_program, template_id, start_date, hevy_api_key, timezone)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         active_program = excluded.active_program,
         template_id = excluded.template_id,
         start_date = excluded.start_date,
         hevy_api_key = COALESCE(excluded.hevy_api_key, users.hevy_api_key),
         timezone = COALESCE(excluded.timezone, users.timezone)`
    )
    .bind(user.id, user.active_program, user.template_id, user.start_date, user.hevy_api_key ?? null, user.timezone ?? null)
    .run();
}

/** Update program fields and return the existing API key in one roundtrip */
export async function updateUserProgram(
  db: D1Database,
  userId: string,
  activeProgram: string,
  templateId: string,
  startDate: string
): Promise<string | null> {
  await db
    .prepare("UPDATE users SET active_program = ?, template_id = ?, start_date = ? WHERE id = ?")
    .bind(activeProgram, templateId, startDate, userId)
    .run();
  const row = await db.prepare("SELECT hevy_api_key FROM users WHERE id = ?").bind(userId).first<{ hevy_api_key: string | null }>();
  return row?.hevy_api_key ?? null;
}

export async function getQueueItems(db: D1Database, userId: string, programId?: number): Promise<QueueItemRow[]> {
  const result = programId != null
    ? await db
        .prepare("SELECT * FROM queue_items WHERE user_id = ? AND program_id = ? ORDER BY position")
        .bind(userId, programId)
        .all<QueueItemRow>()
    : await db
        .prepare("SELECT * FROM queue_items WHERE user_id = ? ORDER BY position")
        .bind(userId)
        .all<QueueItemRow>();
  return result.results;
}

export async function insertQueueItems(
  db: D1Database,
  userId: string,
  items: Array<{ routine_id: string; position: number }>,
  programId?: number
): Promise<void> {
  const stmt = db.prepare(
    "INSERT INTO queue_items (user_id, routine_id, position, program_id) VALUES (?, ?, ?, ?)"
  );
  const batch = items.map((item) => stmt.bind(userId, item.routine_id, item.position, programId ?? null));
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

/** Batch-mark multiple queue items as completed in a single D1 roundtrip */
export async function batchMarkQueueItemsCompleted(
  db: D1Database,
  items: Array<{ itemId: number; completedDate: string; workoutId: string; workoutData?: string }>
): Promise<void> {
  if (items.length === 0) return;
  await db.batch(
    items.map((item) =>
      db
        .prepare(
          "UPDATE queue_items SET status = 'completed', completed_date = ?, hevy_workout_id = ?, hevy_workout_data = ? WHERE id = ?"
        )
        .bind(item.completedDate, item.workoutId, item.workoutData ?? null, item.itemId)
    )
  );
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
  userId: string,
  programId?: number
): Promise<ExerciseTemplateMappingRow[]> {
  const result = programId != null
    ? await db
        .prepare("SELECT * FROM exercise_template_mappings WHERE user_id = ? AND program_id = ?")
        .bind(userId, programId)
        .all<ExerciseTemplateMappingRow>()
    : await db
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
      `INSERT INTO exercise_template_mappings (user_id, program_template_id, hevy_template_id, is_custom, program_id)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, program_template_id) DO UPDATE SET
         hevy_template_id = excluded.hevy_template_id,
         is_custom = excluded.is_custom,
         program_id = excluded.program_id`
    )
    .bind(mapping.user_id, mapping.program_template_id, mapping.hevy_template_id, mapping.is_custom, mapping.program_id ?? null)
    .run();
}

export async function getRoutineMappings(
  db: D1Database,
  userId: string,
  programId?: number
): Promise<RoutineMappingRow[]> {
  const result = programId != null
    ? await db
        .prepare("SELECT * FROM routine_mappings WHERE user_id = ? AND program_id = ?")
        .bind(userId, programId)
        .all<RoutineMappingRow>()
    : await db
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
      `INSERT INTO routine_mappings (user_id, program_routine_id, hevy_routine_id, program_id)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, program_routine_id) DO UPDATE SET
         hevy_routine_id = excluded.hevy_routine_id,
         program_id = excluded.program_id`
    )
    .bind(mapping.user_id, mapping.program_routine_id, mapping.hevy_routine_id, mapping.program_id ?? null)
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
): Promise<Pick<ProgramRow, "id" | "json_data" | "current_phase_id"> | null> {
  return db
    .prepare(
      `SELECT id, json_data, current_phase_id FROM programs
       WHERE user_id = ? AND is_active = 1
       ORDER BY created_at DESC LIMIT 1`
    )
    .bind(userId)
    .first<Pick<ProgramRow, "id" | "json_data" | "current_phase_id">>();
}

export async function updateWebhookState(
  db: D1Database,
  userId: string,
  callbackUrl: string,
  bearerToken: string,
  encryptionKey: string
): Promise<void> {
  const hashed = await sha256Hex(bearerToken);
  const encrypted = await encryptAesGcm(bearerToken, encryptionKey);
  await db
    .prepare("UPDATE users SET webhook_id = ?, webhook_bearer_token = ?, webhook_auth_token = ? WHERE id = ?")
    .bind(callbackUrl, encrypted, hashed, userId)
    .run();
}

export async function clearWebhookState(
  db: D1Database,
  userId: string
): Promise<void> {
  await db
    .prepare("UPDATE users SET webhook_id = NULL, webhook_bearer_token = NULL, webhook_auth_token = NULL WHERE id = ?")
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
  const hashed = await sha256Hex(authToken);
  return db
    .prepare("SELECT * FROM users WHERE webhook_auth_token = ?")
    .bind(hashed)
    .first<UserRow>();
}

/** Clear pending queue items and all mappings in a single batch (preserve completed history).
 * When programId is provided, only clears data for that program. */
export async function clearPendingStateForUser(db: D1Database, userId: string, programId?: number): Promise<void> {
  if (programId != null) {
    await db.batch([
      db.prepare("DELETE FROM queue_items WHERE user_id = ? AND program_id = ? AND status = 'pending'").bind(userId, programId),
      db.prepare("DELETE FROM exercise_template_mappings WHERE user_id = ? AND program_id = ?").bind(userId, programId),
      db.prepare("DELETE FROM routine_mappings WHERE user_id = ? AND program_id = ?").bind(userId, programId),
    ]);
  } else {
    await db.batch([
      db.prepare("DELETE FROM queue_items WHERE user_id = ? AND status = 'pending'").bind(userId),
      db.prepare("DELETE FROM exercise_template_mappings WHERE user_id = ?").bind(userId),
      db.prepare("DELETE FROM routine_mappings WHERE user_id = ?").bind(userId),
    ]);
  }
}

/** Return all programs for a user, ordered by creation date descending. */
export async function getPrograms(db: D1Database, userId: string): Promise<ProgramRow[]> {
  const result = await db
    .prepare("SELECT * FROM programs WHERE user_id = ? ORDER BY created_at DESC")
    .bind(userId)
    .all<ProgramRow>();
  return result.results;
}

/** Deactivate all programs for user, then activate the specified one. */
export async function setActiveProgram(db: D1Database, userId: string, programId: number): Promise<void> {
  await db.batch([
    db.prepare("UPDATE programs SET is_active = 0 WHERE user_id = ?").bind(userId),
    db.prepare("UPDATE programs SET is_active = 1 WHERE id = ? AND user_id = ?").bind(programId, userId),
  ]);
}

/** Load the active program from D1 for a given user. Returns the program, its D1 row ID, and current phase ID. */
export async function loadProgram(db: D1Database, userId: string): Promise<{ program: Program; programId: number; currentPhaseId: string | null }> {
  const row = await getActiveProgram(db, userId);
  if (!row) throw new Error("No active program found");
  return { program: JSON.parse(row.json_data) as Program, programId: row.id, currentPhaseId: row.current_phase_id };
}

/** Atomically advance the current phase for a program. */
export async function advancePhase(
  db: D1Database,
  programId: number,
  newPhaseId: string
): Promise<void> {
  await db.batch([
    db.prepare("UPDATE programs SET current_phase_id = ? WHERE id = ?").bind(newPhaseId, programId),
  ]);
}

/** Delete a program and its associated queue items and mappings. */
export async function deleteProgram(db: D1Database, userId: string, programId: number): Promise<void> {
  await db.batch([
    db.prepare("DELETE FROM queue_items WHERE user_id = ? AND program_id = ?").bind(userId, programId),
    db.prepare("DELETE FROM exercise_template_mappings WHERE user_id = ? AND program_id = ?").bind(userId, programId),
    db.prepare("DELETE FROM routine_mappings WHERE user_id = ? AND program_id = ?").bind(userId, programId),
    db.prepare("DELETE FROM skill_assessments WHERE user_id = ? AND program_id = ?").bind(userId, programId),
    db.prepare("DELETE FROM programs WHERE id = ? AND user_id = ?").bind(programId, userId),
  ]);
}

/** Load all skill assessments for a user's active program as a Map<skillId, currentState>. */
export async function getUserSkillAssessments(
  db: D1Database,
  userId: string,
  programId: number
): Promise<Map<string, string>> {
  const result = await db
    .prepare("SELECT skill_id, current_state FROM skill_assessments WHERE user_id = ? AND program_id = ?")
    .bind(userId, programId)
    .all<{ skill_id: string; current_state: string }>();
  return new Map(result.results.map((r) => [r.skill_id, r.current_state]));
}

/** Insert or update a user's skill assessment text. */
export async function upsertSkillAssessment(
  db: D1Database,
  userId: string,
  programId: number,
  skillId: string,
  currentState: string
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO skill_assessments (user_id, program_id, skill_id, current_state)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, program_id, skill_id) DO UPDATE SET
         current_state = excluded.current_state,
         updated_at = datetime('now')`
    )
    .bind(userId, programId, skillId, currentState)
    .run();
}

/** Insert a single benchmark result. */
export async function insertBenchmarkResult(
  db: D1Database,
  result: {
    userId: string;
    programId: number;
    benchmarkId: string;
    value: string;
    passed: boolean;
    side: string | null;
    notes: string | null;
    testedAt: string;
  }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO benchmark_results (user_id, program_id, benchmark_id, value, passed, side, notes, tested_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      result.userId,
      result.programId,
      result.benchmarkId,
      result.value,
      result.passed ? 1 : 0,
      result.side,
      result.notes,
      result.testedAt
    )
    .run();
}

/** Load all benchmark results for a user+program, ordered by benchmark then newest first. */
export async function getBenchmarkResults(
  db: D1Database,
  userId: string,
  programId: number
): Promise<BenchmarkResultRow[]> {
  const result = await db
    .prepare(
      `SELECT * FROM benchmark_results
       WHERE user_id = ? AND program_id = ?
       ORDER BY benchmark_id, tested_at DESC`
    )
    .bind(userId, programId)
    .all<BenchmarkResultRow>();
  return result.results;
}
