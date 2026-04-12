import type { SseEvent } from "../actor/session-actor";
import { loadProgram, getUserSkillAssessments, getBenchmarkResults } from "../storage/queries";
import { skillCards, roadmapSection, benchmarksSection } from "../fragments/progress";
import { todayString } from "../utils/date";
import { buildContentEvents } from "./build-events";

export interface ProgressProjection {
  events: SseEvent[];
  subtitle?: string;
}

/** Build SseEvent[] for the Progress page — used by the SessionActor DO on connect. */
export async function buildProgressProjection(db: D1Database, userId: string, tz?: string): Promise<ProgressProjection> {
  const { program, programId, currentPhaseId, phaseAdvancedAt } = await loadProgram(db, userId);
  const assessments = await getUserSkillAssessments(db, userId, programId);
  const results = await getBenchmarkResults(db, userId, programId);
  const today = todayString(tz);

  const fragments: string[] = [];

  if (program.skills && program.skills.length > 0) {
    fragments.push(skillCards(program.skills, assessments));
  }

  if (program.roadmap && program.roadmap.length > 0) {
    fragments.push(roadmapSection(program.roadmap, results, program.benchmarks ?? [], currentPhaseId, phaseAdvancedAt));
  }

  if (program.benchmarks && program.benchmarks.length > 0) {
    fragments.push(benchmarksSection(program.benchmarks, results, today));
  }

  return { events: buildContentEvents(fragments), subtitle: program.meta.subtitle };
}
