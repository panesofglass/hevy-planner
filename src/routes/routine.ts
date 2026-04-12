import type { Env } from "../types";
import { getUser, loadProgram } from "../storage/queries";
import { currentWeek, findActiveProgression } from "../domain/schedule";
import { routineDetailPage } from "../fragments/routine-detail";

/** Full HTML: Routine detail — exercise list with coaching context */
export async function buildRoutinePage(env: Env, userId: string, routineId: string): Promise<string> {
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

