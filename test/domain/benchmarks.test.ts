import { describe, it, expect } from "vitest";
import { evaluateGateTests, isRetestDue, formatTrend } from "../../src/domain/benchmarks";
import type { BenchmarkResultRow } from "../../src/types";

/** Helper: build a BenchmarkResultRow with defaults */
function makeResult(
  overrides: Partial<BenchmarkResultRow> & Pick<BenchmarkResultRow, "benchmark_id">
): BenchmarkResultRow {
  return {
    id: 1,
    user_id: "u1",
    program_id: 1,
    value: "pass",
    passed: 1,
    side: null,
    notes: null,
    tested_at: "2026-04-01",
    created_at: "2026-04-01T00:00:00Z",
    ...overrides,
  };
}

describe("evaluateGateTests", () => {
  it("returns all passed when every gate test has a passed result", () => {
    const gateTestIds = ["pain-free-planks", "strict-pullups-8"];
    const results: BenchmarkResultRow[] = [
      makeResult({ benchmark_id: "pain-free-planks", passed: 1 }),
      makeResult({ benchmark_id: "strict-pullups-8", passed: 1 }),
    ];
    const evaluation = evaluateGateTests(gateTestIds, results);
    expect(evaluation.allPassed).toBe(true);
    expect(evaluation.tests).toHaveLength(2);
    expect(evaluation.tests.every((t) => t.passed)).toBe(true);
  });

  it("returns not passed when a gate test has no result", () => {
    const gateTestIds = ["pain-free-planks", "strict-pullups-8"];
    const results: BenchmarkResultRow[] = [
      makeResult({ benchmark_id: "pain-free-planks", passed: 1 }),
    ];
    const evaluation = evaluateGateTests(gateTestIds, results);
    expect(evaluation.allPassed).toBe(false);
    expect(evaluation.tests.find((t) => t.benchmarkId === "strict-pullups-8")?.passed).toBe(false);
  });

  it("does NOT count benchmarks outside the gateTests array (anti-shortcut)", () => {
    const gateTestIds = ["pain-free-planks"];
    const results: BenchmarkResultRow[] = [
      makeResult({ benchmark_id: "strict-pullups-8", passed: 1 }),
      makeResult({ benchmark_id: "clean-dips-15", passed: 1 }),
    ];
    const evaluation = evaluateGateTests(gateTestIds, results);
    expect(evaluation.allPassed).toBe(false);
    expect(evaluation.tests).toHaveLength(1);
    expect(evaluation.tests[0].benchmarkId).toBe("pain-free-planks");
    expect(evaluation.tests[0].passed).toBe(false);
  });

  it("requires both sides to pass for bilateral benchmarks", () => {
    const gateTestIds = ["wall-dorsiflexion-4in"];
    const results: BenchmarkResultRow[] = [
      makeResult({ benchmark_id: "wall-dorsiflexion-4in", side: "left", passed: 1 }),
      makeResult({ benchmark_id: "wall-dorsiflexion-4in", side: "right", passed: 0 }),
    ];
    const evaluation = evaluateGateTests(gateTestIds, results);
    expect(evaluation.allPassed).toBe(false);
    expect(evaluation.tests[0].passed).toBe(false);
  });

  it("passes bilateral benchmark when both sides pass", () => {
    const gateTestIds = ["wall-dorsiflexion-4in"];
    const results: BenchmarkResultRow[] = [
      makeResult({ benchmark_id: "wall-dorsiflexion-4in", side: "left", passed: 1 }),
      makeResult({ benchmark_id: "wall-dorsiflexion-4in", side: "right", passed: 1 }),
    ];
    const evaluation = evaluateGateTests(gateTestIds, results);
    expect(evaluation.allPassed).toBe(true);
    expect(evaluation.tests[0].passed).toBe(true);
  });

  it("uses most recent result per benchmark per side", () => {
    const gateTestIds = ["pain-free-planks"];
    const results: BenchmarkResultRow[] = [
      makeResult({ id: 1, benchmark_id: "pain-free-planks", passed: 1, tested_at: "2026-03-01" }),
      makeResult({ id: 2, benchmark_id: "pain-free-planks", passed: 0, tested_at: "2026-04-01" }),
    ];
    const evaluation = evaluateGateTests(gateTestIds, results);
    expect(evaluation.allPassed).toBe(false);
    expect(evaluation.tests[0].passed).toBe(false);
  });

  it("handles empty gate test list", () => {
    const evaluation = evaluateGateTests([], []);
    expect(evaluation.allPassed).toBe(true);
    expect(evaluation.tests).toHaveLength(0);
  });
});

describe("isRetestDue", () => {
  it("returns false when no frequencyDays defined", () => {
    expect(isRetestDue("2026-04-01", undefined, "2026-04-20")).toBe(false);
  });

  it("returns false when no previous result exists", () => {
    expect(isRetestDue(null, 14, "2026-04-20")).toBe(false);
  });

  it("returns false when within frequency window", () => {
    expect(isRetestDue("2026-04-10", 14, "2026-04-20")).toBe(false);
  });

  it("returns true when past frequency window", () => {
    expect(isRetestDue("2026-04-01", 14, "2026-04-20")).toBe(true);
  });

  it("returns true on exact boundary day", () => {
    expect(isRetestDue("2026-04-06", 14, "2026-04-20")).toBe(true);
  });
});

describe("formatTrend", () => {
  it("returns 'No results yet' for empty array", () => {
    expect(formatTrend([])).toBe("No results yet");
  });

  it("returns single value for one result", () => {
    const results: BenchmarkResultRow[] = [
      makeResult({ benchmark_id: "test", value: "3.5" }),
    ];
    expect(formatTrend(results)).toBe("3.5");
  });

  it("returns arrow-separated values for multiple results (oldest first)", () => {
    const results: BenchmarkResultRow[] = [
      makeResult({ benchmark_id: "test", value: "2.5", tested_at: "2026-03-01" }),
      makeResult({ benchmark_id: "test", value: "3.0", tested_at: "2026-03-15" }),
      makeResult({ benchmark_id: "test", value: "3.5", tested_at: "2026-04-01" }),
    ];
    expect(formatTrend(results)).toBe("2.5 \u2192 3.0 \u2192 3.5");
  });

  it("sorts by tested_at ascending regardless of input order", () => {
    const results: BenchmarkResultRow[] = [
      makeResult({ benchmark_id: "test", value: "3.5", tested_at: "2026-04-01" }),
      makeResult({ benchmark_id: "test", value: "2.5", tested_at: "2026-03-01" }),
    ];
    expect(formatTrend(results)).toBe("2.5 \u2192 3.5");
  });
});
