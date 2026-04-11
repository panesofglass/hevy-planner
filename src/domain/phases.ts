import type { RoadmapPhase } from "../types";
import type { GateEvaluation } from "./benchmarks";

export type AdvancementResult =
  | { ok: true; nextPhaseId: string | null }
  | { ok: false; error: "not_found" | "already_completed" | "not_current" | "gates_not_passed"; failingGates?: string[] };

/**
 * Resolve phase statuses (current/completed/future) from a sorted roadmap
 * and the stored currentPhaseId. Always computes — ignores any JSON `status` field.
 */
export function resolvePhaseStatuses(
  phases: RoadmapPhase[],
  currentPhaseId: string | null
): RoadmapPhase[] {
  const sorted = [...phases].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const resolvedCurrentId = currentPhaseId ?? sorted[0]?.id;
  const currentIndex = sorted.findIndex((p) => p.id === resolvedCurrentId);

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
  const sorted = [...phases].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const phaseIndex = sorted.findIndex((p) => p.id === phaseIdToAdvance);

  if (phaseIndex === -1) {
    return { ok: false, error: "not_found" };
  }

  const resolvedCurrentId = currentPhaseId ?? sorted[0]?.id;
  const currentIndex = sorted.findIndex((p) => p.id === resolvedCurrentId);

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

  const nextPhaseId = phaseIndex + 1 < sorted.length ? sorted[phaseIndex + 1].id : null;
  return { ok: true, nextPhaseId };
}
