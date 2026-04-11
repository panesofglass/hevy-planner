import type { Env } from "../types";
import { sseResponse, patchElements } from "../sse/helpers";
import { getUser, loadProgram } from "../storage/queries";
import { currentWeek, findActiveProgression } from "../domain/schedule";
import { routineDetailPage } from "../fragments/routine-detail";

/** Full HTML: Routine detail — exercise list with coaching context */
export async function renderRoutinePage(env: Env, userId: string, routineId: string): Promise<string> {
  const { program } = await loadProgram(env.DB, userId);
  const routine = program.routines.find((r) => r.id === routineId);
  if (!routine) {
    return `<p>Routine not found.</p>`;
  }

  const user = await getUser(env.DB, userId);
  const week = user ? currentWeek(user.start_date) : null;
  const currentProgression = week != null
    ? findActiveProgression(week, program.progressions)
    : program.progressions[0];

  return routineDetailPage(routine, program.exerciseTemplates, currentProgression);
}

/** SSE: Routine detail — exercise list with coaching context */
export async function handleRoutineSSE(env: Env, userId: string, routineId: string): Promise<Response> {
  const { program } = await loadProgram(env.DB, userId);
  const routine = program.routines.find((r) => r.id === routineId);
  if (!routine) {
    return sseResponse(
      patchElements(`<p>Routine not found.</p>`, { selector: "#content", mode: "inner" })
    );
  }

  // Look up user to determine current progression from start_date
  const user = await getUser(env.DB, userId);
  const week = user ? currentWeek(user.start_date) : null;
  const currentProgression = week != null
    ? findActiveProgression(week, program.progressions)
    : program.progressions[0];

  const html = routineDetailPage(routine, program.exerciseTemplates, currentProgression);
  return sseResponse(
    patchElements(html, { selector: "#content", mode: "inner" })
  );
}
