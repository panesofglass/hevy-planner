import type { Env } from "../types";
import type { SseEvent } from "../actor/session-actor";
import { sseResponse, patchElements, mergeFragments } from "../sse/helpers";
import { getUser, loadProgram, getQueueItems, getRoutineMappings } from "../storage/queries";
import { getNextRoutine, getCompletedRoutines } from "../domain/queue";
import { computeUpcoming } from "../domain/reflow";
import { setupPage } from "../fragments/setup";
import { carsCard, heroRoutineCard, completedSection, upcomingSection, syncButton } from "../fragments/today";
import { todayString } from "../utils/date";
import { decryptAesGcm } from "../utils/crypto";

/**
 * Build SseEvent[] for the Today page — used by the SessionActor DO on connect.
 * Same data reads as handleTodaySSE but returns domain events instead of SSE strings.
 */
export async function buildTodayEvents(db: D1Database, userId: string, tz?: string): Promise<SseEvent[]> {
  const user = await getUser(db, userId);
  if (!user) {
    return [{ type: "patch", html: `<div id="content">${setupPage()}</div>` }];
  }

  const { program, programId } = await loadProgram(db, userId);
  const routineMap = new Map(program.routines.map((r) => [r.id, r]));
  const dailyRoutine = program.routines.find((r) => r.isDaily);

  const items = await getQueueItems(db, userId, programId);
  const today = todayString(tz);

  const routineMappings = await getRoutineMappings(db, userId, programId);
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

/** SSE: Today page — CARs card, hero session, completed, upcoming */
export async function handleTodaySSE(env: Env, userId: string, tz?: string, opts?: { showCredentials?: boolean }): Promise<Response> {
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
    // Convert JS getDay() (0=Sun) to template convention (0=Mon)
    const jsDay = new Date(today + "T12:00:00Z").getDay();
    const todayDow = jsDay === 0 ? 6 : jsDay - 1;
    const upcoming = computeUpcoming(upcomingPending, template, program.routines, 5, todayDow);
    if (upcoming.length > 0) {
      fragments.push(
        patchElements(upcomingSection(upcoming), { selector: "#content", mode: "append" })
      );
    }
  }

  // Sync button at the bottom — only decrypt bearer token when just registered
  let bearerToken: string | null = null;
  if (opts?.showCredentials && user.webhook_bearer_token) {
    bearerToken = await decryptAesGcm(user.webhook_bearer_token, env.ENCRYPTION_KEY);
  }
  fragments.push(
    patchElements(syncButton(user.webhook_id, bearerToken, user.last_sync_at, tz), { selector: "#content", mode: "append" })
  );

  return sseResponse(mergeFragments(fragments));
}
