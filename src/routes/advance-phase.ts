import type { Env } from "../types";
import { loadProgram, getBenchmarkResults, advancePhase } from "../storage/queries";
import { evaluateGateTests } from "../domain/benchmarks";
import { validateAdvancement } from "../domain/phases";
import { roadmapSection } from "../fragments/progress";
import { sseResponse, patchElements } from "../sse/helpers";

/** POST /api/advance-phase/:phaseId — advance the current roadmap phase */
export async function handleAdvancePhase(
  env: Env,
  userId: string,
  phaseId: string
): Promise<Response> {
  const { program, programId, currentPhaseId } = await loadProgram(env.DB, userId);

  if (!program.roadmap || program.roadmap.length === 0) {
    return new Response("No roadmap defined", { status: 404 });
  }

  const phase = program.roadmap.find((p) => p.id === phaseId);
  if (!phase) {
    return new Response("Phase not found", { status: 404 });
  }

  const results = await getBenchmarkResults(env.DB, userId, programId);
  const gateEvaluation = evaluateGateTests(phase.gateTests ?? [], results);

  const validation = validateAdvancement(
    program.roadmap,
    phaseId,
    currentPhaseId,
    gateEvaluation
  );

  if (!validation.ok) {
    if (validation.error === "not_found") {
      return new Response("Phase not found", { status: 404 });
    }
    const body = JSON.stringify({
      error: validation.error,
      failingGates: validation.failingGates,
    });
    return new Response(body, {
      status: 422,
      headers: { "content-type": "application/json" },
    });
  }

  // Advance: set new current phase (or keep current if last phase)
  const newPhaseId = validation.nextPhaseId ?? phaseId;
  await advancePhase(env.DB, programId, newPhaseId);

  // Return updated roadmap fragment
  const html = roadmapSection(
    program.roadmap,
    results,
    program.benchmarks ?? [],
    newPhaseId
  );
  return sseResponse(patchElements(html, { selector: ".card", mode: "outer" }));
}
