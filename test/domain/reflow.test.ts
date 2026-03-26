import { describe, it, expect } from "vitest";
import { computeUpcoming } from "../../src/domain/reflow";
import type { QueueItemRow, WeekTemplate, Routine } from "../../src/types";

const routines: Routine[] = [
  { id: "daily", title: "CARs", isDaily: true, exercises: [] },
  { id: "a", title: "Routine A", exercises: [] },
  { id: "b", title: "Routine B", exercises: [] },
  { id: "c", title: "Routine C", exercises: [] },
  { id: "recovery", title: "Recovery", exercises: [] },
];

// Template dayOfWeek: 0=Mon … 6=Sun
// Day 0 (Mon): a
// Day 1 (Tue): b
// Day 2 (Wed): CARs only (spacer)
// Day 3 (Thu): c
// Day 4 (Fri): recovery
// Day 5 (Sat): rest
// Day 6 (Sun): rest
const template: WeekTemplate = {
  id: "5day",
  name: "5-Day",
  days: [
    { dayOfWeek: 0, routineIDs: ["daily", "a"] },
    { dayOfWeek: 1, routineIDs: ["daily", "b"] },
    { dayOfWeek: 2, routineIDs: ["daily"] },
    { dayOfWeek: 3, routineIDs: ["daily", "c"] },
    { dayOfWeek: 4, routineIDs: ["daily", "recovery"] },
    { dayOfWeek: 5, routineIDs: [] },
    { dayOfWeek: 6, routineIDs: [] },
  ],
};

function makePending(routineId: string, position: number): QueueItemRow {
  return {
    id: position, user_id: "u", routine_id: routineId, position,
    status: "pending", completed_date: null,
    hevy_routine_id: null, hevy_workout_id: null, hevy_workout_data: null, program_id: null,
  };
}

describe("computeUpcoming", () => {
  it("on schedule: shows spacer between hero day and next session", () => {
    // Hero = b on Tuesday (day 1). Tomorrow = Wednesday (day 2) = CARs spacer.
    const pending = [makePending("c", 2), makePending("recovery", 3), makePending("a", 4)];
    const todayDow = 1; // Tuesday

    const upcoming = computeUpcoming(pending, template, routines, 5, todayDow);

    expect(upcoming[0]).toMatchObject({ type: "spacer", title: "CARs" });
    expect(upcoming[1]).toMatchObject({ type: "routine", routineId: "c" });
    expect(upcoming[2]).toMatchObject({ type: "routine", routineId: "recovery" });
  });

  it("smart shift: consumes spacer when session slides past it", () => {
    // Hero = b but today is Wednesday (day 2) — slid from Tuesday.
    // Tomorrow = Thursday (day 3) = routine day. Spacer consumed.
    const pending = [makePending("c", 2), makePending("recovery", 3), makePending("a", 4)];
    const todayDow = 2; // Wednesday (the CARs day — consumed by the slide)

    const upcoming = computeUpcoming(pending, template, routines, 5, todayDow);

    expect(upcoming[0]).toMatchObject({ type: "routine", routineId: "c" });
    expect(upcoming[1]).toMatchObject({ type: "routine", routineId: "recovery" });
  });

  it("wraps correctly across week boundary", () => {
    // Hero = recovery on Friday (day 4). Tomorrow = Saturday (day 5) = rest, then Sunday = rest, then Monday = a.
    const pending = [makePending("a", 5), makePending("b", 6), makePending("c", 7)];
    const todayDow = 4; // Friday

    const upcoming = computeUpcoming(pending, template, routines, 3, todayDow);

    // Sat + Sun are rest (skipped), Monday = a, Tuesday = b, Wed = spacer, Thu = c
    expect(upcoming[0]).toMatchObject({ type: "routine", routineId: "a" });
    expect(upcoming[1]).toMatchObject({ type: "routine", routineId: "b" });
    expect(upcoming[2]).toMatchObject({ type: "spacer", title: "CARs" });
  });

  it("derives spacer title from the daily routine's title", () => {
    const pending = [makePending("c", 2), makePending("recovery", 3)];
    const todayDow = 1; // Tuesday — tomorrow is CARs spacer

    const upcoming = computeUpcoming(pending, template, routines, 5, todayDow);
    const spacer = upcoming.find((u) => u.type === "spacer");
    expect(spacer?.title).toBe("CARs");
  });

  it("falls back to 'Rest' for spacer title when no daily routine exists", () => {
    const noDaily: Routine[] = [
      { id: "a", title: "Routine A", exercises: [] },
      { id: "b", title: "Routine B", exercises: [] },
      { id: "c", title: "Routine C", exercises: [] },
      { id: "recovery", title: "Recovery", exercises: [] },
    ];
    const pending = [makePending("c", 2), makePending("recovery", 3)];
    const todayDow = 1; // Tuesday

    const upcoming = computeUpcoming(pending, template, noDaily, 5, todayDow);
    const spacer = upcoming.find((u) => u.type === "spacer");
    expect(spacer?.title).toBe("Rest");
  });

  it("limits to requested count of main sessions", () => {
    const pending = Array.from({ length: 10 }, (_, i) => makePending("a", i));
    const todayDow = 0; // Monday

    const upcoming = computeUpcoming(pending, template, routines, 3, todayDow);
    const sessionCount = upcoming.filter((u) => u.type === "routine").length;
    expect(sessionCount).toBe(3);
  });
});
