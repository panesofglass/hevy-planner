import type { Env } from "../types";
import { loadProgram, getBenchmarkResults, advancePhase } from "../storage/queries";
import { evaluateGateTests } from "../domain/benchmarks";
import { validateAdvancement, filterResultsSince, PHASE_COMPLETED } from "../domain/phases";

/** POST /api/advance-phase/:phaseId — advance the current roadmap phase */
export async function handleAdvancePhase(
  env: Env,
  userId: string,
  phaseId: string
): Promise<Response> {
  const { program, programId, currentPhaseId, phaseAdvancedAt } = await loadProgram(env.DB, userId);

  if (!program.roadmap || program.roadmap.length === 0) {
    return new Response("No roadmap defined", { status: 400 });
  }

  const results = await getBenchmarkResults(env.DB, userId, programId);
  const filteredResults = filterResultsSince(results, phaseAdvancedAt);

  const phase = program.roadmap.find((p) => p.id === phaseId);
  const gateEvaluation = evaluateGateTests(phase?.gateTests ?? [], filteredResults);

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
    if (validation.error === "already_completed") {
      return new Response("Phase already completed", { status: 400 });
    }
    if (validation.error === "not_current") {
      return new Response("Phase is not current", { status: 400 });
    }
    // gates_not_passed
    const message = `Gates not passed: ${(validation.failingGates ?? []).join(", ")}`;
    return new Response(message, { status: 400 });
  }

  await advancePhase(env.DB, userId, programId, validation.nextPhaseId ?? PHASE_COMPLETED);
  return new Response(null, { status: 202 });
}
