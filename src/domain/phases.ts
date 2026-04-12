import type { RoadmapPhase, BenchmarkResultRow } from "../types";
import type { GateEvaluation } from "./benchmarks";

export type AdvancementResult =
  | { ok: true; nextPhaseId: string }
  | { ok: true; nextPhaseId: null; lastPhase: true }
  | { ok: false; error: "not_found" | "already_completed" | "not_current" | "gates_not_passed"; failingGates?: string[] };

/** Sort phases by sortOrder (defensive copy). */
function sortPhases(phases: RoadmapPhase[]): RoadmapPhase[] {
  return [...phases].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

/** Filter benchmark results to only those logged on or after a phase transition date. */
export function filterResultsSince(
  results: BenchmarkResultRow[],
  since: string | null | undefined
): BenchmarkResultRow[] {
  if (!since) return results;
  // phase_advanced_at is datetime ("2026-04-10 14:32:05"), tested_at is date-only ("2026-04-10")
  const sinceDate = since.slice(0, 10);
  return results.filter((r) => r.tested_at >= sinceDate);
}

/**
 * Resolve phase statuses (current/completed/future) from a sorted roadmap
 * and the stored currentPhaseId. Always computes — ignores any JSON `status` field.
 */
export function resolvePhaseStatuses(
  phases: RoadmapPhase[],
  currentPhaseId: string | null
): RoadmapPhase[] {
  const sorted = sortPhases(phases);

  // All phases completed — program finished (#28)
  if (currentPhaseId === "__completed__") {
    return sorted.map((phase) => ({ ...phase, status: "completed" as const }));
  }

  const resolvedCurrentId = currentPhaseId ?? sorted[0]?.id;
  let currentIndex = sorted.findIndex((p) => p.id === resolvedCurrentId);
  // Guard: if currentPhaseId doesn't match any phase (e.g., program JSON was updated),
  // fall back to first phase rather than marking everything as future (#29)
  if (currentIndex === -1) currentIndex = 0;

  return sorted.map((phase, i) => {
    let status: "current" | "future" | "completed";
    if (i < currentIndex) {
      status = "completed";
    } else if (i === currentIndex) {
      status = "current";
    } else {
      status = "future";
    }
    return { ...phase, status };
  });
}

/**
 * Validate whether a phase can be advanced.
 * Returns ok:true with the next phase ID (or null if last),
 * or ok:false with an error code and optional failing gate IDs.
 */
export function validateAdvancement(
  phases: RoadmapPhase[],
  phaseIdToAdvance: string,
  currentPhaseId: string | null,
  gateEvaluation: GateEvaluation
): AdvancementResult {
  const sorted = sortPhases(phases);
  const phaseIndex = sorted.findIndex((p) => p.id === phaseIdToAdvance);

  if (phaseIndex === -1) {
    return { ok: false, error: "not_found" };
  }

  const resolvedCurrentId = currentPhaseId ?? sorted[0]?.id;
  let currentIndex = sorted.findIndex((p) => p.id === resolvedCurrentId);
  if (currentIndex === -1) currentIndex = 0;

  if (phaseIndex < currentIndex) {
    return { ok: false, error: "already_completed" };
  }

  if (phaseIndex > currentIndex) {
    return { ok: false, error: "not_current" };
  }

  if (!gateEvaluation.allPassed) {
    const failingGates = gateEvaluation.tests
      .filter((t) => !t.passed)
      .map((t) => t.benchmarkId);
    return { ok: false, error: "gates_not_passed", failingGates };
  }

  if (phaseIndex + 1 < sorted.length) {
    return { ok: true, nextPhaseId: sorted[phaseIndex + 1].id };
  }
  return { ok: true, nextPhaseId: null, lastPhase: true };
}
