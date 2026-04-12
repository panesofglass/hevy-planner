import type { SseEvent } from "../actor/session-actor";
import { loadProgram, getUserSkillAssessments, getBenchmarkResults } from "../storage/queries";
import { skillCards, roadmapSection, benchmarksSection } from "../fragments/progress";
import { todayString } from "../utils/date";

/** Build SseEvent[] for the Progress page — used by the SessionActor DO on connect. */
export async function buildProgressEvents(db: D1Database, userId: string, tz?: string): Promise<SseEvent[]> {
  const { program, programId, currentPhaseId, phaseAdvancedAt } = await loadProgram(db, userId);
  const assessments = await getUserSkillAssessments(db, userId, programId);
  const results = await getBenchmarkResults(db, userId, programId);
  const today = todayString(tz);

  const events: SseEvent[] = [];
  let firstEmitted = false;

  function emit(html: string): void {
    if (!firstEmitted) {
      events.push({ type: "patch", html: `<div id="content">${html}</div>` });
      firstEmitted = true;
    } else {
      events.push({ type: "append", target: "#content", html });
    }
  }

  if (program.skills && program.skills.length > 0) {
    emit(skillCards(program.skills, assessments));
  }

  if (program.roadmap && program.roadmap.length > 0) {
    emit(roadmapSection(program.roadmap, results, program.benchmarks ?? [], currentPhaseId, phaseAdvancedAt));
  }

  if (program.benchmarks && program.benchmarks.length > 0) {
    emit(benchmarksSection(program.benchmarks, results, today));
  }

  return events;
}
