import type { Env } from "../types";
import { sseResponse, patchElements, mergeFragments } from "../sse/helpers";
import { loadProgram, getUserSkillAssessments, getBenchmarkResults } from "../storage/queries";
import { skillCards, roadmapSection, benchmarksSection } from "../fragments/progress";

/** SSE: Progress page — skills, roadmap with gate tests, benchmarks with results */
export async function handleProgressSSE(env: Env, userId: string, tz?: string): Promise<Response> {
  const { program, programId, currentPhaseId } = await loadProgram(env.DB, userId);
  const assessments = await getUserSkillAssessments(env.DB, userId, programId);
  const results = await getBenchmarkResults(env.DB, userId, programId);
  const fragments: string[] = [];
  let isFirst = true;

  const now = new Date();
  const today = tz
    ? now.toLocaleDateString("en-CA", { timeZone: tz })
    : now.toISOString().slice(0, 10);

  const addFragment = (html: string) => {
    fragments.push(patchElements(html, { selector: "#content", mode: isFirst ? "inner" : "append" }));
    isFirst = false;
  };

  if (program.skills && program.skills.length > 0) {
    addFragment(skillCards(program.skills, assessments));
  }

  if (program.roadmap && program.roadmap.length > 0) {
    addFragment(roadmapSection(program.roadmap, results, program.benchmarks ?? [], currentPhaseId));
  }

  if (program.benchmarks && program.benchmarks.length > 0) {
    addFragment(benchmarksSection(program.benchmarks, results, today));
  }

  return sseResponse(mergeFragments(fragments));
}
