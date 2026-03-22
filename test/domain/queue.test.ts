import { describe, it, expect } from "vitest";
import { generatePlaylist, getNextSession, getCompletedSessions } from "../../src/domain/queue";
import type { WeekTemplate, Session, QueueItemRow } from "../../src/types";

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

describe("generatePlaylist", () => {
  it("extracts main sessions in order, skipping daily-only and rest days", () => {
    const playlist = generatePlaylist(template, sessions, 1);
    const ids = playlist.map((item) => item.session_id);
    expect(ids).toEqual(["a", "b", "c", "recovery"]);
  });

  it("repeats for multiple weeks", () => {
    const playlist = generatePlaylist(template, sessions, 2);
    expect(playlist).toHaveLength(8);
    expect(playlist[4].session_id).toBe("a");
    expect(playlist[4].position).toBe(4);
  });

  it("assigns sequential positions starting at 0", () => {
    const playlist = generatePlaylist(template, sessions, 1);
    expect(playlist.map((p) => p.position)).toEqual([0, 1, 2, 3]);
  });
});

describe("getNextSession", () => {
  it("returns the first pending item", () => {
    const items: QueueItemRow[] = [
      { id: 1, user_id: "u", session_id: "a", position: 0, status: "completed", completed_date: "2026-03-20", hevy_routine_id: null, hevy_workout_id: null },
      { id: 2, user_id: "u", session_id: "b", position: 1, status: "pending", completed_date: null, hevy_routine_id: null, hevy_workout_id: null },
      { id: 3, user_id: "u", session_id: "c", position: 2, status: "pending", completed_date: null, hevy_routine_id: null, hevy_workout_id: null },
    ];
    const next = getNextSession(items);
    expect(next?.session_id).toBe("b");
  });

  it("returns null when all items are completed", () => {
    const items: QueueItemRow[] = [
      { id: 1, user_id: "u", session_id: "a", position: 0, status: "completed", completed_date: "2026-03-20", hevy_routine_id: null, hevy_workout_id: null },
    ];
    expect(getNextSession(items)).toBeNull();
  });
});

describe("getCompletedSessions", () => {
  it("returns only sessions completed today", () => {
    const items: QueueItemRow[] = [
      { id: 1, user_id: "u", session_id: "a", position: 0, status: "completed", completed_date: "2026-03-20", hevy_routine_id: null, hevy_workout_id: null },
      { id: 2, user_id: "u", session_id: "b", position: 1, status: "completed", completed_date: "2026-03-21", hevy_routine_id: null, hevy_workout_id: null },
      { id: 3, user_id: "u", session_id: "c", position: 2, status: "pending", completed_date: null, hevy_routine_id: null, hevy_workout_id: null },
    ];
    const completed = getCompletedSessions(items, "2026-03-21");
    expect(completed).toHaveLength(1);
    expect(completed[0].session_id).toBe("b");
  });
});
