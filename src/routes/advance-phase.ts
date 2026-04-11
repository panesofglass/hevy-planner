import type { Env } from "../types";
import { loadProgram, getBenchmarkResults, advancePhase } from "../storage/queries";
import { evaluateGateTests } from "../domain/benchmarks";
import { validateAdvancement } from "../domain/phases";
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
    return new Response("No roadmap defined", { status: 404 });
  }

  const phase = program.roadmap.find((p) => p.id === phaseId);
  if (!phase) {
    return new Response("Phase not found", { status: 404 });
  }

  const results = await getBenchmarkResults(env.DB, userId, programId);

  // Filter results for the current phase — only count results after the phase transition
  const filteredResults = phaseAdvancedAt
    ? results.filter((r) => r.tested_at >= phaseAdvancedAt)
    : results;

  const gateEvaluation = evaluateGateTests(phase.gateTests ?? [], filteredResults);

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

    // Return SSE error response so Datastar can handle it
    const message = validation.error === "already_completed"
      ? "Phase already completed"
      : validation.error === "not_current"
        ? "Phase is not current"
        : `Gates not passed: ${(validation.failingGates ?? []).join(", ")}`;

    const errorHtml = `<div class="card"><p style="color:var(--orange)">${escapeHtml(message)}</p></div>`;
    return new Response(
      patchElements(errorHtml, { selector: "#content", mode: "prepend" }),
      {
        status: 422,
        headers: { "content-type": "text/event-stream" },
      }
    );
  }

  // Advance: set new current phase (or keep current if last phase)
  const newPhaseId = validation.nextPhaseId ?? phaseId;
  await advancePhase(env.DB, programId, newPhaseId);

  // Return updated roadmap fragment — new phase has no phaseAdvancedAt filter yet
  // (the timestamp was just set, and no results exist after it)
  const html = roadmapSection(
    program.roadmap,
    results,
    program.benchmarks ?? [],
    newPhaseId
  );
  return sseResponse(patchElements(html, { selector: ".card", mode: "outer" }));
}
