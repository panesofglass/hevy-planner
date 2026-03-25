import type { Env } from "../types";
import { sseResponse, patchElements, mergeFragments } from "../sse/helpers";
import { getUser, loadProgram, getQueueItems, getRoutineMappings } from "../storage/queries";
import { getNextRoutine, getCompletedRoutines } from "../domain/queue";
import { computeUpcoming } from "../domain/reflow";
import { setupPage } from "../fragments/setup";
import { carsCard, heroRoutineCard, completedSection, upcomingSection, syncButton } from "../fragments/today";
import { todayString } from "../utils/date";

/** SSE: Today page — CARs card, hero session, completed, upcoming */
export async function handleTodaySSE(env: Env, userId: string, tz?: string): Promise<Response> {
  const user = await getUser(env.DB, userId);
  if (!user) {
    return sseResponse(
      patchElements(setupPage(), { selector: "#content", mode: "inner" })
    );
  }

  const { program, programId } = await loadProgram(env.DB, userId);
  const routineMap = new Map(program.routines.map((r) => [r.id, r]));
  const dailyRoutine = program.routines.find((r) => r.isDaily);

  const items = await getQueueItems(env.DB, userId, programId);
  const today = todayString(tz);

  // Look up routine mappings for deep links
  const routineMappings = await getRoutineMappings(env.DB, userId, programId);
  const routineToHevyId = new Map(
    routineMappings.map((m) => [m.program_routine_id, m.hevy_routine_id])
  );

  const fragments: string[] = [];

  const dailyDoneToday = dailyRoutine && user.daily_completed_date === today;

  if (dailyRoutine && !dailyDoneToday) {
    fragments.push(patchElements(carsCard(dailyRoutine, routineToHevyId.get(dailyRoutine.id)), { selector: "#content", mode: "inner" }));
  }

  // Hero session card — next pending
  const nextItem = getNextRoutine(items);
  if (nextItem) {
    const routine = routineMap.get(nextItem.routine_id);
    if (routine) {
      const mode = (dailyRoutine && !dailyDoneToday) ? "append" : "inner";
      fragments.push(
        patchElements(heroRoutineCard(routine, nextItem), { selector: "#content", mode })
      );
    }
  }

  // Completed today
  const completed = getCompletedRoutines(items, today);
  const completedData = completed.map((item) => ({
    title: routineMap.get(item.routine_id)?.title ?? item.routine_id,
    hevy_workout_data: item.hevy_workout_data,
  }));
  if (dailyDoneToday) {
    completedData.unshift({ title: dailyRoutine.title, hevy_workout_data: null });
  }
  if (completedData.length > 0) {
    fragments.push(
      patchElements(completedSection(completedData), { selector: "#content", mode: "append" })
    );
  }

  // Upcoming (next 5 sessions)
  const template = program.weekTemplates.find((t) => t.id === user.template_id);
  if (template) {
    const pendingItems = items.filter((i) => i.status === "pending").sort((a, b) => a.position - b.position);
    // Skip the first pending (already shown as hero) for upcoming
    const upcomingPending = pendingItems.slice(1);
    const upcoming = computeUpcoming(upcomingPending, template, program.routines, 5);
    if (upcoming.length > 0) {
      fragments.push(
        patchElements(upcomingSection(upcoming), { selector: "#content", mode: "append" })
      );
    }
  }

  // Sync button at the bottom
  fragments.push(
    patchElements(syncButton(user.webhook_id, user.last_sync_at, tz), { selector: "#content", mode: "append" })
  );

  return sseResponse(mergeFragments(fragments));
}
