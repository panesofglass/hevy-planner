import { describe, it, expect } from "vitest";
import { fetchWorkoutsCoveringTitles } from "../../src/services/sync";
import type { HevyWorkout } from "../../src/hevy/client";

function workout(id: string, title: string): HevyWorkout {
  return { id, short_id: id, title, start_time: "2026-03-01T08:00:00Z", end_time: "2026-03-01T08:30:00Z", exercises: [] };
}

/**
 * Fake paged client honoring the real Hevy API contract: each page returns
 * up to `pageSize` items; a page shorter than `pageSize` signals the end.
 */
function fakeClient(allWorkoutsNewestFirst: HevyWorkout[]) {
  return {
    async getRecentWorkouts(page = 1, pageSize = 5) {
      const start = (page - 1) * pageSize;
      return allWorkoutsNewestFirst.slice(start, start + pageSize);
    },
  };
}

describe("fetchWorkoutsCoveringTitles", () => {
  it("finds a title on page 1 without paging further", async () => {
    let pagesFetched = 0;
    const client = {
      async getRecentWorkouts(page = 1) {
        pagesFetched++;
        return [workout(`w${page}`, "Session B")];
      },
    };
    await fetchWorkoutsCoveringTitles(client, new Set(["Session B"]), new Set());
    expect(pagesFetched).toBe(1);
  });

  it("pages back to find a title buried behind newer workouts (the CARs-burial bug)", async () => {
    // Session A was logged days ago; 40+ Daily CARs + Session B entries since
    // then push it well past a single page-of-5 (or page-of-20) fetch.
    const filler = Array.from({ length: 40 }, (_, i) => workout(`cars-${i}`, "Daily CARs"));
    const allWorkouts = [workout("session-b", "Session B"), ...filler, workout("session-a", "Session A")];
    const client = fakeClient(allWorkouts);
    const result = await fetchWorkoutsCoveringTitles(client, new Set(["Session A", "Session B"]), new Set());
    expect(result.map((w) => w.id)).toContain("session-a");
  });

  it("stops paging once every title is found", async () => {
    let pagesFetched = 0;
    const client = {
      async getRecentWorkouts(page = 1) {
        pagesFetched++;
        if (page === 1) return [workout("w1", "Session A")];
        return [workout(`w${page}`, "Daily CARs")];
      },
    };
    await fetchWorkoutsCoveringTitles(client, new Set(["Session A"]), new Set());
    expect(pagesFetched).toBe(1);
  });

  it("does not page forever when a title never shows up (bounded loop)", async () => {
    let pagesFetched = 0;
    const client = {
      async getRecentWorkouts(page = 1, pageSize = 20) {
        pagesFetched++;
        return Array.from({ length: pageSize }, (_, i) => workout(`w${page}-${i}`, "Unrelated"));
      },
    };
    await fetchWorkoutsCoveringTitles(client, new Set(["Never Logged"]), new Set());
    expect(pagesFetched).toBe(10);
  });

  it("ignores already-used workout IDs when checking whether a title was found", async () => {
    const filler = Array.from({ length: 20 }, (_, i) => workout(`cars-${i}`, "Daily CARs"));
    const client = fakeClient([workout("used", "Session A"), ...filler, workout("fresh", "Session A")]);
    const result = await fetchWorkoutsCoveringTitles(client, new Set(["Session A"]), new Set(["used"]));
    expect(result.map((w) => w.id)).toContain("fresh");
  });
});
