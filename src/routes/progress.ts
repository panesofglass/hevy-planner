import type { Env } from "../types";
import { sseResponse, patchElements, mergeFragments } from "../sse/helpers";
import { loadProgram } from "../storage/queries";
import { skillCards, roadmapSection, benchmarksSection } from "../fragments/progress";

/** SSE: Progress page — skills, roadmap, benchmarks */
export async function handleProgressSSE(env: Env, userId: string): Promise<Response> {
  const { program } = await loadProgram(env.DB, userId);
  const fragments: string[] = [];
  let isFirst = true;

  const addFragment = (html: string) => {
    fragments.push(patchElements(html, { selector: "#content", mode: isFirst ? "inner" : "append" }));
    isFirst = false;
  };

  if (program.skills && program.skills.length > 0) {
    addFragment(skillCards(program.skills));
  }

  if (program.roadmap && program.roadmap.length > 0) {
    addFragment(roadmapSection(program.roadmap));
  }

  if (program.benchmarks && program.benchmarks.length > 0) {
    addFragment(benchmarksSection(program.benchmarks));
  }

  return sseResponse(mergeFragments(fragments));
}
