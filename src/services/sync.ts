import { loadProgram, getQueueItems, batchMarkQueueItemsCompleted, updateDailyCompleted, updateLastSyncAt } from "../storage/queries";
import { matchCompletions } from "../domain/hevy-sync";
import { HevyClient } from "../hevy/client";
import { todayString, toLocalDate } from "../utils/date";

/**
 * Core sync logic — fetch recent Hevy workouts, match to pending queue items,
 * mark completions, update daily CARs. Reused by both manual pull and webhook.
 * Updates last_sync_at on successful completion.
 */
export async function performSync(db: D1Database, userId: string, apiKey: string, tz?: string): Promise<void> {
  const { program, programId } = await loadProgram(db, userId);
  const routineMap = new Map(program.routines.map((r) => [r.id, r]));
  const client = new HevyClient(apiKey);

  const [workouts, items] = await Promise.all([
    client.getRecentWorkouts(),
    getQueueItems(db, userId, programId),
  ]);

  // Skip workouts already matched to a completed queue item
  const usedWorkoutIds = new Set(
    items.filter((i) => i.hevy_workout_id).map((i) => i.hevy_workout_id)
  );
  const newWorkouts = workouts.filter((w) => !usedWorkoutIds.has(w.id));

  const pendingItems = items.filter((i) => i.status === "pending" && i.hevy_routine_id);

  const nameToRoutineId = new Map<string, string>();
  for (const item of pendingItems) {
    const routine = routineMap.get(item.routine_id);
    if (routine && item.hevy_routine_id) {
      nameToRoutineId.set(routine.title, item.hevy_routine_id);
    }
  }

  const matches = matchCompletions(
    pendingItems,
    newWorkouts,
    (w) => nameToRoutineId.get(w.title) ?? null
  );

  // Build workout ID → { date, exercisesJson } map for accurate completion dates
  const workoutInfo = new Map<string, { date: string; exercisesJson: string }>();
  for (const w of newWorkouts) {
    workoutInfo.set(w.id, {
      date: toLocalDate(w.start_time, tz),
      exercisesJson: JSON.stringify(w.exercises),
    });
  }

  // Batch-mark completions
  await batchMarkQueueItemsCompleted(
    db,
    matches.map((match) => {
      const info = workoutInfo.get(match.workoutId);
      return {
        itemId: match.queueItemId,
        completedDate: info?.date ?? todayString(tz),
        workoutId: match.workoutId,
        workoutData: info?.exercisesJson,
      };
    })
  );

  // Check for daily routine completion (use workout date, not sync date)
  const dailyRoutine = program.routines.find((r) => r.isDaily);
  if (dailyRoutine) {
    const dailyWorkout = workouts.find((w) => w.title === dailyRoutine.title);
    if (dailyWorkout) {
      await updateDailyCompleted(db, userId, toLocalDate(dailyWorkout.start_time, tz));
    }
  }

  await updateLastSyncAt(db, userId, new Date().toISOString());
}
