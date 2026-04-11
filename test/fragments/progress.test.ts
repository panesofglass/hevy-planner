import { describe, it, expect } from "vitest";
import { skillCards, roadmapSection } from "~/fragments/progress";
import type { Skill, RoadmapPhase, BenchmarkResultRow, Benchmark } from "~/types";

const baseSkill: Skill = {
  id: "muscle-up",
  name: "Muscle Up",
  icon: "★",
  color: "rgb(224,134,96)",
  currentState: "3-5 pull-ups. No muscle-up experience.",
  timeline: "6-9 months",
  milestones: [{ name: "8-10 strict pull-ups" }],
};

describe("skillCards", () => {
  it("renders currentState text from program default", () => {
    const html = skillCards([baseSkill]);
    expect(html).toContain("3-5 pull-ups. No muscle-up experience.");
  });

  it("does not render currentState section when skill has no currentState", () => {
    const skill: Skill = { id: "test", name: "Test" };
    const html = skillCards([skill]);
    expect(html).not.toContain("skill-current-state");
  });

  it("does not render edit affordance when currentState is empty string", () => {
    const skill: Skill = { id: "test", name: "Test", currentState: "" };
    const html = skillCards([skill]);
    expect(html).not.toContain("skill-edit-row");
    expect(html).not.toContain("editing_skill_test");
  });

  it("prefers user assessment over program default", () => {
    const assessments = new Map([["muscle-up", "Can do 5 strict pull-ups now."]]);
    const html = skillCards([baseSkill], assessments);
    expect(html).toContain("Can do 5 strict pull-ups now.");
    expect(html).not.toContain("3-5 pull-ups. No muscle-up experience.");
  });

  it("falls back to program default when no user assessment exists", () => {
    const assessments = new Map([["other-skill", "Some text"]]);
    const html = skillCards([baseSkill], assessments);
    expect(html).toContain("3-5 pull-ups. No muscle-up experience.");
  });

  it("renders an Edit button on skills with currentState", () => {
    const html = skillCards([baseSkill]);
    expect(html).toContain("Edit");
    expect(html).toContain("editing_skill_muscle_up");
  });

  it("renders a textarea for editing pre-filled with current text", () => {
    const html = skillCards([baseSkill]);
    expect(html).toContain("textarea");
    expect(html).toContain("/api/skill-assessment/muscle-up");
  });

  it("pre-fills textarea with user assessment when available", () => {
    const assessments = new Map([["muscle-up", "Updated text."]]);
    const html = skillCards([baseSkill], assessments);
    // The signal initial value should contain the user assessment
    expect(html).toContain("Updated text.");
  });
});

const makeResult = (
  overrides: Partial<BenchmarkResultRow> & Pick<BenchmarkResultRow, "benchmark_id">
): BenchmarkResultRow => ({
  id: 1, user_id: "u1", program_id: 1, value: "pass", passed: 1,
  side: null, notes: null, tested_at: "2026-04-01", created_at: "2026-04-01T00:00:00Z",
  ...overrides,
});

const testPhases: RoadmapPhase[] = [
  { id: "phase1", name: "Phase 1", gateTests: ["gate-a", "gate-b"], sortOrder: 1, status: "current" },
  { id: "phase2", name: "Phase 2", gateTests: ["gate-c"], sortOrder: 2, status: "future" },
];

const benchmarks: Benchmark[] = [
  { id: "gate-a", name: "Gate A", howTo: "test" },
  { id: "gate-b", name: "Gate B", howTo: "test" },
  { id: "gate-c", name: "Gate C", howTo: "test" },
];

describe("roadmapSection", () => {
  it("uses currentPhaseId to determine status, not JSON status field", () => {
    const html = roadmapSection(testPhases, [], benchmarks, "phase2");
    expect(html).toContain("completed");
    expect(html).toContain("roadmap-current");
  });

  it("shows 'ready to advance' when all gates pass on current phase", () => {
    const results: BenchmarkResultRow[] = [
      makeResult({ benchmark_id: "gate-a", passed: 1 }),
      makeResult({ benchmark_id: "gate-b", passed: 1 }),
    ];
    const html = roadmapSection(testPhases, results, benchmarks, null);
    expect(html).toMatch(/ready to advance/i);
  });

  it("does not show 'ready to advance' when not all gates pass", () => {
    const results: BenchmarkResultRow[] = [
      makeResult({ benchmark_id: "gate-a", passed: 1 }),
      makeResult({ benchmark_id: "gate-b", passed: 0 }),
    ];
    const html = roadmapSection(testPhases, results, benchmarks, null);
    expect(html).not.toMatch(/ready to advance/i);
  });

  it("does not show 'ready to advance' on completed phases", () => {
    const results: BenchmarkResultRow[] = [
      makeResult({ benchmark_id: "gate-a", passed: 1 }),
      makeResult({ benchmark_id: "gate-b", passed: 1 }),
    ];
    const html = roadmapSection(testPhases, results, benchmarks, "phase2");
    expect(html).not.toMatch(/advance-phase\/phase1/);
  });

  it("shows advance form targeting correct phase ID", () => {
    const results: BenchmarkResultRow[] = [
      makeResult({ benchmark_id: "gate-a", passed: 1 }),
      makeResult({ benchmark_id: "gate-b", passed: 1 }),
    ];
    const html = roadmapSection(testPhases, results, benchmarks, null);
    expect(html).toContain("/api/advance-phase/phase1");
  });

  it("adds completed class on completed phases", () => {
    const html = roadmapSection(testPhases, [], benchmarks, "phase2");
    expect(html).toContain("completed");
  });

  it("does not show 'all gates passed' on future phases", () => {
    const results: BenchmarkResultRow[] = [
      makeResult({ benchmark_id: "gate-c", passed: 1 }),
    ];
    // phase1 is current, phase2 is future — phase2's gate-c is passed but no badge shown
    const html = roadmapSection(testPhases, results, benchmarks, null);
    expect(html).not.toMatch(/all gates passed/i);
  });

  it("filters results by phaseAdvancedAt for current phase gates", () => {
    const results: BenchmarkResultRow[] = [
      makeResult({ benchmark_id: "gate-c", passed: 1, tested_at: "2026-04-01" }),
    ];
    // phase2 is current, phaseAdvancedAt is after the result — result doesn't count
    const html = roadmapSection(testPhases, results, benchmarks, "phase2", "2026-04-05");
    expect(html).not.toMatch(/all gates passed/i);
  });
});
