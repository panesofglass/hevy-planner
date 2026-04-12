import type { SseEvent } from "../actor/session-actor";
import { getUser, loadProgram, getQueueItems, getRoutineMappings } from "../storage/queries";
import { getNextRoutine, getCompletedRoutines } from "../domain/queue";
import { computeUpcoming } from "../domain/reflow";
import { setupPage } from "../fragments/setup";
import { carsCard, heroRoutineCard, completedSection, upcomingSection, syncButton } from "../fragments/today";
import { todayString } from "../utils/date";
import { buildContentEvents } from "./build-events";

export interface TodayProjection {
  events: SseEvent[];
  subtitle?: string;
  isSetup: boolean;
}

/** Build SseEvent[] for the Today page — used by the SessionActor DO on connect. */
export async function buildTodayProjection(db: D1Database, userId: string, tz?: string): Promise<TodayProjection> {
  const user = await getUser(db, userId);
  if (!user) {
    return {
      events: buildContentEvents([setupPage()]),
      isSetup: true,
    };
  }

  const { program, programId } = await loadProgram(db, userId);
  if (!program.routines || !program.weekTemplates) {
    throw new Error("Program missing required fields: routines, weekTemplates");
  }
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

  const dailyDoneToday = dailyRoutine && user.daily_completed_date === today;
  const fragments: string[] = [];

  if (dailyRoutine && !dailyDoneToday) {
    fragments.push(carsCard(dailyRoutine, routineToHevyId.get(dailyRoutine.id)));
  }

  const nextItem = getNextRoutine(items);
  if (nextItem) {
    const routine = routineMap.get(nextItem.routine_id);
    if (routine) {
      fragments.push(heroRoutineCard(routine, nextItem));
    }
  }

  const completed = getCompletedRoutines(items, today);
  const completedData = completed.map((item) => ({
    title: routineMap.get(item.routine_id)?.title ?? item.routine_id,
    hevy_workout_data: item.hevy_workout_data,
  }));
  if (dailyDoneToday) {
    completedData.unshift({ title: dailyRoutine.title, hevy_workout_data: null });
  }
  if (completedData.length > 0) {
    fragments.push(completedSection(completedData));
  }

  const template = program.weekTemplates.find((t) => t.id === user.template_id);
  if (template) {
    const pendingItems = items.filter((i) => i.status === "pending").sort((a, b) => a.position - b.position);
    const upcomingPending = pendingItems.slice(1);
    const jsDay = new Date(today + "T12:00:00Z").getDay();
    const todayDow = jsDay === 0 ? 6 : jsDay - 1;
    const upcoming = computeUpcoming(upcomingPending, template, program.routines, 5, todayDow);
    if (upcoming.length > 0) {
      fragments.push(upcomingSection(upcoming));
    }
  }

  fragments.push(syncButton(user.webhook_id, null, user.last_sync_at, tz));

  return { events: buildContentEvents(fragments), subtitle: program.meta.subtitle, isSetup: false };
}
