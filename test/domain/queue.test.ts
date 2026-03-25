import { describe, it, expect } from "vitest";
import { generatePlaylist, getNextRoutine, getCompletedRoutines } from "../../src/domain/queue";
import type { WeekTemplate, Routine, QueueItemRow } from "../../src/types";

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

describe("generatePlaylist", () => {
  it("extracts main routines in order, skipping daily-only and rest days", () => {
    const playlist = generatePlaylist(template, routines, 1);
    const ids = playlist.map((item) => item.routine_id);
    expect(ids).toEqual(["a", "b", "c", "recovery"]);
  });

  it("repeats for multiple weeks", () => {
    const playlist = generatePlaylist(template, routines, 2);
    expect(playlist).toHaveLength(8);
    expect(playlist[4].routine_id).toBe("a");
    expect(playlist[4].position).toBe(4);
  });

  it("assigns sequential positions starting at 0", () => {
    const playlist = generatePlaylist(template, routines, 1);
    expect(playlist.map((p) => p.position)).toEqual([0, 1, 2, 3]);
  });
});

describe("getNextRoutine", () => {
  it("returns the first pending item", () => {
    const items: QueueItemRow[] = [
      { id: 1, user_id: "u", routine_id: "a", position: 0, status: "completed", completed_date: "2026-03-20", hevy_routine_id: null, hevy_workout_id: null, hevy_workout_data: null, program_id: null },
      { id: 2, user_id: "u", routine_id: "b", position: 1, status: "pending", completed_date: null, hevy_routine_id: null, hevy_workout_id: null, hevy_workout_data: null, program_id: null },
      { id: 3, user_id: "u", routine_id: "c", position: 2, status: "pending", completed_date: null, hevy_routine_id: null, hevy_workout_id: null, hevy_workout_data: null, program_id: null },
    ];
    const next = getNextRoutine(items);
    expect(next?.routine_id).toBe("b");
  });

  it("returns null when all items are completed", () => {
    const items: QueueItemRow[] = [
      { id: 1, user_id: "u", routine_id: "a", position: 0, status: "completed", completed_date: "2026-03-20", hevy_routine_id: null, hevy_workout_id: null, hevy_workout_data: null, program_id: null },
    ];
    expect(getNextRoutine(items)).toBeNull();
  });
});

describe("getCompletedRoutines", () => {
  it("returns only sessions completed today", () => {
    const items: QueueItemRow[] = [
      { id: 1, user_id: "u", routine_id: "a", position: 0, status: "completed", completed_date: "2026-03-20", hevy_routine_id: null, hevy_workout_id: null, hevy_workout_data: null, program_id: null },
      { id: 2, user_id: "u", routine_id: "b", position: 1, status: "completed", completed_date: "2026-03-21", hevy_routine_id: null, hevy_workout_id: null, hevy_workout_data: null, program_id: null },
      { id: 3, user_id: "u", routine_id: "c", position: 2, status: "pending", completed_date: null, hevy_routine_id: null, hevy_workout_id: null, hevy_workout_data: null, program_id: null },
    ];
    const completed = getCompletedRoutines(items, "2026-03-21");
    expect(completed).toHaveLength(1);
    expect(completed[0].routine_id).toBe("b");
  });
});
