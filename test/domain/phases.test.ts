import { describe, it, expect } from "vitest";
import { resolvePhaseStatuses, validateAdvancement } from "../../src/domain/phases";
import type { RoadmapPhase } from "../../src/types";
import type { GateEvaluation } from "../../src/domain/benchmarks";

const phases: RoadmapPhase[] = [
  { id: "phase1", name: "Phase 1", sortOrder: 1 },
  { id: "phase2", name: "Phase 2", sortOrder: 2 },
  { id: "phase3", name: "Phase 3", sortOrder: 3 },
  { id: "phase4", name: "Phase 4", sortOrder: 4 },
];

describe("resolvePhaseStatuses", () => {
  it("defaults to first phase as current when currentPhaseId is null", () => {
    const result = resolvePhaseStatuses(phases, null);
    expect(result[0].status).toBe("current");
    expect(result[1].status).toBe("future");
    expect(result[2].status).toBe("future");
    expect(result[3].status).toBe("future");
  });

  it("marks phases before currentPhaseId as completed", () => {
    const result = resolvePhaseStatuses(phases, "phase2");
    expect(result[0].status).toBe("completed");
    expect(result[1].status).toBe("current");
    expect(result[2].status).toBe("future");
    expect(result[3].status).toBe("future");
  });

  it("marks all before phase3 as completed", () => {
    const result = resolvePhaseStatuses(phases, "phase3");
    expect(result[0].status).toBe("completed");
    expect(result[1].status).toBe("completed");
    expect(result[2].status).toBe("current");
    expect(result[3].status).toBe("future");
  });

  it("handles last phase as current", () => {
    const result = resolvePhaseStatuses(phases, "phase4");
    expect(result[0].status).toBe("completed");
    expect(result[1].status).toBe("completed");
    expect(result[2].status).toBe("completed");
    expect(result[3].status).toBe("current");
  });

  it("ignores JSON status field — always computes from currentPhaseId", () => {
    const phasesWithStatus: RoadmapPhase[] = [
      { id: "phase1", name: "Phase 1", status: "current", sortOrder: 1 },
      { id: "phase2", name: "Phase 2", status: "future", sortOrder: 2 },
    ];
    const result = resolvePhaseStatuses(phasesWithStatus, "phase2");
    expect(result[0].status).toBe("completed");
    expect(result[1].status).toBe("current");
  });

  it("preserves all other phase fields", () => {
    const rich: RoadmapPhase[] = [
      { id: "p1", name: "P1", weeks: "1-4", summary: "sum", gateTests: ["a"], sortOrder: 1 },
    ];
    const result = resolvePhaseStatuses(rich, null);
    expect(result[0].weeks).toBe("1-4");
    expect(result[0].summary).toBe("sum");
    expect(result[0].gateTests).toEqual(["a"]);
  });

  it("sorts by sortOrder before resolving", () => {
    const unsorted: RoadmapPhase[] = [
      { id: "phase2", name: "Phase 2", sortOrder: 2 },
      { id: "phase1", name: "Phase 1", sortOrder: 1 },
    ];
    const result = resolvePhaseStatuses(unsorted, "phase2");
    expect(result[0].id).toBe("phase1");
    expect(result[0].status).toBe("completed");
    expect(result[1].id).toBe("phase2");
    expect(result[1].status).toBe("current");
  });
});

describe("validateAdvancement", () => {
  it("returns success when phase is current and all gates pass", () => {
    const evaluation: GateEvaluation = {
      tests: [{ benchmarkId: "a", passed: true }],
      allPassed: true,
    };
    const result = validateAdvancement(phases, "phase1", "phase1", evaluation);
    expect(result.ok).toBe(true);
  });

  it("returns error when phase ID does not exist", () => {
    const evaluation: GateEvaluation = { tests: [], allPassed: true };
    const result = validateAdvancement(phases, "nonexistent", "phase1", evaluation);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("not_found");
    }
  });

  it("returns error when phase is already completed", () => {
    const evaluation: GateEvaluation = { tests: [], allPassed: true };
    const result = validateAdvancement(phases, "phase1", "phase2", evaluation);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("already_completed");
    }
  });

  it("returns error when phase is future (not current)", () => {
    const evaluation: GateEvaluation = { tests: [], allPassed: true };
    const result = validateAdvancement(phases, "phase3", "phase1", evaluation);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("not_current");
    }
  });

  it("returns error with failing gate IDs when not all gates pass", () => {
    const evaluation: GateEvaluation = {
      tests: [
        { benchmarkId: "a", passed: true },
        { benchmarkId: "b", passed: false },
        { benchmarkId: "c", passed: false },
      ],
      allPassed: false,
    };
    const result = validateAdvancement(phases, "phase1", "phase1", evaluation);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("gates_not_passed");
      expect(result.failingGates).toEqual(["b", "c"]);
    }
  });

  it("returns nextPhaseId on success", () => {
    const evaluation: GateEvaluation = { tests: [], allPassed: true };
    const result = validateAdvancement(phases, "phase1", "phase1", evaluation);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextPhaseId).toBe("phase2");
    }
  });

  it("returns nextPhaseId as null for last phase", () => {
    const evaluation: GateEvaluation = { tests: [], allPassed: true };
    const result = validateAdvancement(phases, "phase4", "phase4", evaluation);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextPhaseId).toBeNull();
    }
  });
});
