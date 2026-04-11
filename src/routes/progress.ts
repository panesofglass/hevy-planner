import type { Env } from "../types";
import { loadProgram, getUserSkillAssessments, getBenchmarkResults } from "../storage/queries";
import { skillCards, roadmapSection, benchmarksSection } from "../fragments/progress";

/** Full HTML: Progress page — skills, roadmap with gate tests, benchmarks with results */
export async function renderProgressPage(env: Env, userId: string, tz?: string): Promise<string> {
  const { program, programId, currentPhaseId, phaseAdvancedAt } = await loadProgram(env.DB, userId);
  const assessments = await getUserSkillAssessments(env.DB, userId, programId);
  const results = await getBenchmarkResults(env.DB, userId, programId);
  const parts: string[] = [];

  const now = new Date();
  const today = tz
    ? now.toLocaleDateString("en-CA", { timeZone: tz })
    : now.toISOString().slice(0, 10);

  if (program.skills && program.skills.length > 0) {
    parts.push(skillCards(program.skills, assessments));
  }

  if (program.roadmap && program.roadmap.length > 0) {
    parts.push(roadmapSection(program.roadmap, results, program.benchmarks ?? [], currentPhaseId, phaseAdvancedAt));
  }

  if (program.benchmarks && program.benchmarks.length > 0) {
    parts.push(benchmarksSection(program.benchmarks, results, today));
  }

  return parts.join("");
}

