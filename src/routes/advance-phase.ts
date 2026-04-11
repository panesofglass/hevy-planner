import type { Env } from "../types";
import { loadProgram, getBenchmarkResults, advancePhase } from "../storage/queries";
import { evaluateGateTests } from "../domain/benchmarks";
import { validateAdvancement, filterResultsSince } from "../domain/phases";
import { roadmapSection } from "../fragments/progress";
import { sseResponse, patchElements } from "../sse/helpers";
import { escapeHtml } from "../utils/html";

/** POST /api/advance-phase/:phaseId — advance the current roadmap phase */
export async function handleAdvancePhase(
  env: Env,
  userId: string,
  phaseId: string
): Promise<Response> {
  const { program, programId, currentPhaseId, phaseAdvancedAt } = await loadProgram(env.DB, userId);

  if (!program.roadmap || program.roadmap.length === 0) {
    return sseResponse(patchElements(
      `<div id="error-container"><p style="color:var(--orange)">No roadmap defined</p></div>`,
      { selector: "#content", mode: "prepend" }
    ));
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
    const message = validation.error === "not_found"
      ? "Phase not found"
      : validation.error === "already_completed"
        ? "Phase already completed"
        : validation.error === "not_current"
          ? "Phase is not current"
          : `Gates not passed: ${(validation.failingGates ?? []).join(", ")}`;

    return sseResponse(patchElements(
      `<div id="error-container"><p style="color:var(--orange)">${escapeHtml(message)}</p></div>`,
      { selector: "#content", mode: "prepend" }
    ));
  }

  // Advance: set new current phase (or keep current if last phase)
  const newPhaseId = validation.nextPhaseId ?? phaseId;
  await advancePhase(env.DB, userId, programId, newPhaseId);

  // Use current timestamp as cutoff — gates for new phase start fresh
  const newPhaseAdvancedAt = new Date().toISOString().replace("T", " ").slice(0, 19);
  const html = roadmapSection(
    program.roadmap,
    results,
    program.benchmarks ?? [],
    newPhaseId,
    newPhaseAdvancedAt
  );
  return sseResponse(patchElements(html, { selector: "#roadmap-section", mode: "outer" }));
}
