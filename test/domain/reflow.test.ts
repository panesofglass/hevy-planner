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

describe("computeUpcoming", () => {
  it("interleaves spacer days between main routines based on template rhythm", () => {
    const pending: QueueItemRow[] = [
      { id: 2, user_id: "u", routine_id: "b", position: 1, status: "pending", completed_date: null, hevy_routine_id: null, hevy_workout_id: null },
      { id: 3, user_id: "u", routine_id: "c", position: 2, status: "pending", completed_date: null, hevy_routine_id: null, hevy_workout_id: null },
      { id: 4, user_id: "u", routine_id: "recovery", position: 3, status: "pending", completed_date: null, hevy_routine_id: null, hevy_workout_id: null },
    ];

    const upcoming = computeUpcoming(pending, template, routines, 5);
    const types = upcoming.map((u) => u.type);
    expect(types[0]).toBe("routine");   // b
    expect(types[1]).toBe("spacer");    // CARs-only
    expect(types[2]).toBe("routine");   // c
  });

  it("limits to requested count of main sessions", () => {
    const pending: QueueItemRow[] = Array.from({ length: 10 }, (_, i) => ({
      id: i, user_id: "u", routine_id: "a", position: i,
      status: "pending" as const, completed_date: null,
      hevy_routine_id: null, hevy_workout_id: null,
    }));
    const upcoming = computeUpcoming(pending, template, routines, 3);
    const sessionCount = upcoming.filter((u) => u.type === "routine").length;
    expect(sessionCount).toBe(3);
  });
});
