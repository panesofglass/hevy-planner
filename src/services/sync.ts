import { loadProgram, getQueueItems, batchMarkQueueItemsCompleted, batchMarkQueueItemsSkipped, updateDailyCompleted, updateLastSyncAt } from "../storage/queries";
import { matchCompletions } from "../domain/hevy-sync";
import { computeSkippedItemIds } from "../domain/queue";
import { HevyClient, HEVY_MAX_PAGE_SIZE, type HevyWorkout } from "../hevy/client";
import { todayString, toLocalDate } from "../utils/date";

const SYNC_MAX_PAGES = 20;
const SYNC_PAGE_SIZE = HEVY_MAX_PAGE_SIZE;

/**
 * Fetch recent workouts, paging back until every title we're looking for has
 * been found (or the page cap is hit). A single page-of-5 fetch isn't deep
 * enough once several daily-routine workouts pile up between a session and
 * the next sync — the session's workout falls off the window and never
 * matches. Bounded to SYNC_MAX_PAGES so a stuck lookup can't page forever.
 */
export async function fetchWorkoutsCoveringTitles(
  client: Pick<HevyClient, "getRecentWorkouts">,
  titlesToFind: Set<string>,
  usedWorkoutIds: Set<string>
): Promise<HevyWorkout[]> {
  const all: HevyWorkout[] = [];
  const remaining = new Set(titlesToFind);

  for (let page = 1; page <= SYNC_MAX_PAGES && remaining.size > 0; page++) {
    const batch = await client.getRecentWorkouts(page, SYNC_PAGE_SIZE);
    if (batch.length === 0) break;
    all.push(...batch);
    for (const w of batch) {
      if (!usedWorkoutIds.has(w.id)) remaining.delete(w.title);
    }
    if (batch.length < SYNC_PAGE_SIZE) break;
  }

  return all;
}

/**
 * Core sync logic — fetch recent Hevy workouts, match to pending queue items,
 * mark completions, update daily CARs. Reused by both manual pull and webhook.
 * Updates last_sync_at on successful completion.
 */
export async function performSync(db: D1Database, userId: string, apiKey: string, tz?: string): Promise<void> {
  const { program, programId } = await loadProgram(db, userId);
  const routineMap = new Map(program.routines.map((r) => [r.id, r]));
  const client = new HevyClient(apiKey);

  const items = await getQueueItems(db, userId, programId);

  // Skip workouts already matched to a completed queue item
  const usedWorkoutIds = new Set<string>(
    items.filter((i): i is typeof i & { hevy_workout_id: string } => i.hevy_workout_id != null).map((i) => i.hevy_workout_id)
  );

  // Matchable items include "skipped" ones too, so a late-arriving workout
  // can still retroactively complete an item the user actually did.
  const matchableItems = items.filter(
    (i) => (i.status === "pending" || i.status === "skipped") && i.hevy_routine_id
  );

  const nameToRoutineId = new Map<string, string>();
  for (const item of matchableItems) {
    const routine = routineMap.get(item.routine_id);
    if (routine && item.hevy_routine_id) {
      nameToRoutineId.set(routine.title, item.hevy_routine_id);
    }
  }

  const dailyRoutine = program.routines.find((r) => r.isDaily);
  const titlesToFind = new Set(nameToRoutineId.keys());
  if (dailyRoutine) titlesToFind.add(dailyRoutine.title);

  const workouts = await fetchWorkoutsCoveringTitles(client, titlesToFind, usedWorkoutIds);
  const newWorkouts = workouts.filter((w) => !usedWorkoutIds.has(w.id));

  const matches = matchCompletions(
    matchableItems,
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

  // A completion further down the queue means the user moved past whatever
  // was still pending ahead of it — mark those skipped so "Next" advances.
  const skippedIds = computeSkippedItemIds(items, matches.map((m) => m.queueItemId));
  await batchMarkQueueItemsSkipped(db, skippedIds);

  // Check for daily routine completion (use workout date, not sync date)
  if (dailyRoutine) {
    const dailyWorkout = workouts.find((w) => w.title === dailyRoutine.title);
    if (dailyWorkout) {
      await updateDailyCompleted(db, userId, toLocalDate(dailyWorkout.start_time, tz));
    }
  }

  await updateLastSyncAt(db, userId, new Date().toISOString());
}
