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
      { id: 2, user_id: "u", routine_id: "b", position: 1, status: "pending", completed_date: null, hevy_routine_id: null, hevy_workout_id: null, hevy_workout_data: null, program_id: null },
      { id: 3, user_id: "u", routine_id: "c", position: 2, status: "pending", completed_date: null, hevy_routine_id: null, hevy_workout_id: null, hevy_workout_data: null, program_id: null },
      { id: 4, user_id: "u", routine_id: "recovery", position: 3, status: "pending", completed_date: null, hevy_routine_id: null, hevy_workout_id: null, hevy_workout_data: null, program_id: null },
    ];

    const upcoming = computeUpcoming(pending, template, routines, 5);
    const types = upcoming.map((u) => u.type);
    expect(types[0]).toBe("routine");   // b
    expect(types[1]).toBe("spacer");    // daily-only day
    expect(types[2]).toBe("routine");   // c
  });

  it("derives spacer title from the daily routine's title", () => {
    const pending: QueueItemRow[] = [
      { id: 2, user_id: "u", routine_id: "b", position: 1, status: "pending", completed_date: null, hevy_routine_id: null, hevy_workout_id: null, hevy_workout_data: null, program_id: null },
      { id: 3, user_id: "u", routine_id: "c", position: 2, status: "pending", completed_date: null, hevy_routine_id: null, hevy_workout_id: null, hevy_workout_data: null, program_id: null },
    ];

    const upcoming = computeUpcoming(pending, template, routines, 5);
    const spacer = upcoming.find((u) => u.type === "spacer");
    // routines[0] has isDaily: true and title: "CARs"
    expect(spacer?.title).toBe("CARs");
  });

  it("falls back to 'Rest' for spacer title when no daily routine exists", () => {
    const noDaily: Routine[] = [
      { id: "a", title: "Routine A", exercises: [] },
      { id: "b", title: "Routine B", exercises: [] },
      { id: "c", title: "Routine C", exercises: [] },
      { id: "recovery", title: "Recovery", exercises: [] },
    ];
    const pending: QueueItemRow[] = [
      { id: 2, user_id: "u", routine_id: "b", position: 1, status: "pending", completed_date: null, hevy_routine_id: null, hevy_workout_id: null, hevy_workout_data: null, program_id: null },
      { id: 3, user_id: "u", routine_id: "c", position: 2, status: "pending", completed_date: null, hevy_routine_id: null, hevy_workout_id: null, hevy_workout_data: null, program_id: null },
    ];

    const upcoming = computeUpcoming(pending, template, noDaily, 5);
    const spacer = upcoming.find((u) => u.type === "spacer");
    expect(spacer?.title).toBe("Rest");
  });

  it("preserves spacer between hero and next session when startAfterRoutineId is provided", () => {
    // Hero = b (rhythm index 1). Upcoming should start at rhythm index 2 (spacer).
    const pending: QueueItemRow[] = [
      { id: 3, user_id: "u", routine_id: "c", position: 2, status: "pending", completed_date: null, hevy_routine_id: null, hevy_workout_id: null, hevy_workout_data: null, program_id: null },
      { id: 4, user_id: "u", routine_id: "recovery", position: 3, status: "pending", completed_date: null, hevy_routine_id: null, hevy_workout_id: null, hevy_workout_data: null, program_id: null },
    ];

    const upcoming = computeUpcoming(pending, template, routines, 3, "b");

    // After b (index 1), next is spacer (index 2), then c (index 3), then recovery (index 4)
    expect(upcoming[0]).toMatchObject({ type: "spacer", title: "CARs" });
    expect(upcoming[1]).toMatchObject({ type: "routine", routineId: "c" });
    expect(upcoming[2]).toMatchObject({ type: "routine", routineId: "recovery" });
  });

  it("wraps rhythm correctly across week boundary with startAfterRoutineId", () => {
    // Hero = recovery (last routine, rhythm index 4). Next wraps to a (index 0).
    const pending: QueueItemRow[] = [
      { id: 5, user_id: "u", routine_id: "a", position: 4, status: "pending", completed_date: null, hevy_routine_id: null, hevy_workout_id: null, hevy_workout_data: null, program_id: null },
      { id: 6, user_id: "u", routine_id: "b", position: 5, status: "pending", completed_date: null, hevy_routine_id: null, hevy_workout_id: null, hevy_workout_data: null, program_id: null },
    ];

    const upcoming = computeUpcoming(pending, template, routines, 3, "recovery");

    // After recovery (index 4), wraps to a (index 0), then b (index 1)
    expect(upcoming[0]).toMatchObject({ type: "routine", routineId: "a" });
    expect(upcoming[1]).toMatchObject({ type: "routine", routineId: "b" });
  });

  it("limits to requested count of main sessions", () => {
    const pending: QueueItemRow[] = Array.from({ length: 10 }, (_, i) => ({
      id: i, user_id: "u", routine_id: "a", position: i,
      status: "pending" as const, completed_date: null,
      hevy_routine_id: null, hevy_workout_id: null, hevy_workout_data: null, program_id: null,
    }));
    const upcoming = computeUpcoming(pending, template, routines, 3);
    const sessionCount = upcoming.filter((u) => u.type === "routine").length;
    expect(sessionCount).toBe(3);
  });
});
