import type { SseEvent } from "../actor/session-actor";
import { getUser, loadProgram, getQueueItems, getRoutineMappings } from "../storage/queries";
import { getNextRoutine, getCompletedRoutines } from "../domain/queue";
import { computeUpcoming } from "../domain/reflow";
import { setupPage } from "../fragments/setup";
import { carsCard, heroRoutineCard, completedSection, upcomingSection, syncButton } from "../fragments/today";
import { todayString } from "../utils/date";

/** Build SseEvent[] for the Today page — used by the SessionActor DO on connect. */
export async function buildTodayEvents(db: D1Database, userId: string, tz?: string): Promise<SseEvent[]> {
  const user = await getUser(db, userId);
  if (!user) {
    return [{ type: "patch", html: `<div id="content">${setupPage()}</div>` }];
  }

  const { program, programId } = await loadProgram(db, userId);
  const routineMap = new Map(program.routines.map((r) => [r.id, r]));
  const dailyRoutine = program.routines.find((r) => r.isDaily);

  const [items, routineMappings] = await Promise.all([
    getQueueItems(db, userId, programId),
    getRoutineMappings(db, userId, programId),
  ]);
  const today = todayString(tz);
  const routineToHevyId = new Map(
    routineMappings.map((m) => [m.program_routine_id, m.hevy_routine_id])
  );

  const events: SseEvent[] = [];
  let firstEmitted = false;

  const dailyDoneToday = dailyRoutine && user.daily_completed_date === today;

  // Helper: emit first fragment as patch (outer morph replaces #content),
  // subsequent fragments as append into #content.
  function emit(html: string): void {
    if (!firstEmitted) {
      events.push({ type: "patch", html: `<div id="content">${html}</div>` });
      firstEmitted = true;
    } else {
      events.push({ type: "append", target: "#content", html });
    }
  }

  if (dailyRoutine && !dailyDoneToday) {
    emit(carsCard(dailyRoutine, routineToHevyId.get(dailyRoutine.id)));
  }

  // Hero session card — next pending
  const nextItem = getNextRoutine(items);
  if (nextItem) {
    const routine = routineMap.get(nextItem.routine_id);
    if (routine) {
      emit(heroRoutineCard(routine, nextItem));
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
    emit(completedSection(completedData));
  }

  // Upcoming (next 5 sessions)
  const template = program.weekTemplates.find((t) => t.id === user.template_id);
  if (template) {
    const pendingItems = items.filter((i) => i.status === "pending").sort((a, b) => a.position - b.position);
    const upcomingPending = pendingItems.slice(1);
    const jsDay = new Date(today + "T12:00:00Z").getDay();
    const todayDow = jsDay === 0 ? 6 : jsDay - 1;
    const upcoming = computeUpcoming(upcomingPending, template, program.routines, 5, todayDow);
    if (upcoming.length > 0) {
      emit(upcomingSection(upcoming));
    }
  }

  // Sync button — never decrypt bearer token for DO connect (no showCredentials)
  emit(syncButton(user.webhook_id, null, user.last_sync_at, tz));

  return events;
}

