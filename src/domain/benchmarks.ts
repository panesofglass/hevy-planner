import type { BenchmarkResultRow } from "../types";

export interface GateTestResult {
  benchmarkId: string;
  passed: boolean;
}

export interface GateEvaluation {
  tests: GateTestResult[];
  allPassed: boolean;
}

/**
 * Evaluate gate tests for a roadmap phase.
 * For each gate test ID, finds the most recent result(s).
 * If the benchmark has side-specific results (bilateral), both left AND right
 * must have passed=1 on their most recent result.
 */
export function evaluateGateTests(
  gateTestIds: string[],
  results: BenchmarkResultRow[]
): GateEvaluation {
  const tests: GateTestResult[] = gateTestIds.map((benchmarkId) => {
    const matching = results
      .filter((r) => r.benchmark_id === benchmarkId)
      .sort((a, b) => b.tested_at.localeCompare(a.tested_at));

    if (matching.length === 0) {
      return { benchmarkId, passed: false };
    }

    const hasSides = matching.some((r) => r.side != null);

    if (hasSides) {
      const latestLeft = matching.find((r) => r.side === "left");
      const latestRight = matching.find((r) => r.side === "right");
      const passed = latestLeft?.passed === 1 && latestRight?.passed === 1;
      return { benchmarkId, passed };
    }

    return { benchmarkId, passed: matching[0].passed === 1 };
  });

  return {
    tests,
    allPassed: tests.every((t) => t.passed),
  };
}

/**
 * Check if a benchmark is due for retesting.
 * Returns true only when BOTH a lastTestedAt date AND frequencyDays are present,
 * and the elapsed days >= frequencyDays.
 */
export function isRetestDue(
  lastTestedAt: string | null,
  frequencyDays: number | undefined,
  today: string
): boolean {
  if (!frequencyDays || !lastTestedAt) return false;
  const last = new Date(lastTestedAt);
  const now = new Date(today);
  const elapsedDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  return elapsedDays >= frequencyDays;
}

/**
 * Format benchmark results as a trend string.
 * Sorts by tested_at ascending, joins values with →.
 */
export function formatTrend(results: BenchmarkResultRow[]): string {
  if (results.length === 0) return "No results yet";
  const sorted = [...results].sort((a, b) => a.tested_at.localeCompare(b.tested_at));
  return sorted.map((r) => r.value).join(" \u2192 ");
}
