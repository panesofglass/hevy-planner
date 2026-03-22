import { describe, it, expect } from "vitest";
import { computeUpcoming } from "../../src/domain/reflow";
import type { QueueItemRow, WeekTemplate, Session } from "../../src/types";

const sessions: Session[] = [
  { id: "daily", title: "CARs", isDaily: true, exercises: [] },
  { id: "a", title: "Session A", exercises: [] },
  { id: "b", title: "Session B", exercises: [] },
  { id: "c", title: "Session C", exercises: [] },
  { id: "recovery", title: "Recovery", exercises: [] },
];

const template: WeekTemplate = {
  id: "5day",
  name: "5-Day",
  days: [
    { dayOfWeek: 0, sessionIDs: ["daily", "a"] },
    { dayOfWeek: 1, sessionIDs: ["daily", "b"] },
    { dayOfWeek: 2, sessionIDs: ["daily"] },
    { dayOfWeek: 3, sessionIDs: ["daily", "c"] },
    { dayOfWeek: 4, sessionIDs: ["daily", "recovery"] },
    { dayOfWeek: 5, sessionIDs: [] },
    { dayOfWeek: 6, sessionIDs: [] },
  ],
};

describe("computeUpcoming", () => {
  it("interleaves spacer days between main sessions based on template rhythm", () => {
    const pending: QueueItemRow[] = [
      { id: 2, user_id: "u", session_id: "b", position: 1, status: "pending", completed_date: null, hevy_routine_id: null, hevy_workout_id: null },
      { id: 3, user_id: "u", session_id: "c", position: 2, status: "pending", completed_date: null, hevy_routine_id: null, hevy_workout_id: null },
      { id: 4, user_id: "u", session_id: "recovery", position: 3, status: "pending", completed_date: null, hevy_routine_id: null, hevy_workout_id: null },
    ];

    const upcoming = computeUpcoming(pending, template, sessions, 5);
    const types = upcoming.map((u) => u.type);
    expect(types[0]).toBe("session");   // b
    expect(types[1]).toBe("spacer");    // CARs-only
    expect(types[2]).toBe("session");   // c
  });

  it("limits to requested count of main sessions", () => {
    const pending: QueueItemRow[] = Array.from({ length: 10 }, (_, i) => ({
      id: i, user_id: "u", session_id: "a", position: i,
      status: "pending" as const, completed_date: null,
      hevy_routine_id: null, hevy_workout_id: null,
    }));
    const upcoming = computeUpcoming(pending, template, sessions, 3);
    const sessionCount = upcoming.filter((u) => u.type === "session").length;
    expect(sessionCount).toBe(3);
  });
});
