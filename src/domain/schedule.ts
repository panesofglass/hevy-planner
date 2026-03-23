import type { Progression } from "../types";

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/** 1-based week number from start date. Always >= 1. */
export function currentWeek(startDate: string, now: number = Date.now()): number {
  const start = new Date(startDate).getTime();
  if (isNaN(start)) return 1;
  return Math.max(1, Math.floor((now - start) / MS_PER_WEEK) + 1);
}

/** Find the active progression for a given week number. */
export function findActiveProgression(
  week: number,
  progressions: Progression[]
): Progression | undefined {
  return progressions.find(
    (p) =>
      p.weekStart != null &&
      p.weekEnd != null &&
      week >= p.weekStart &&
      week <= p.weekEnd
  );
}
