import { describe, it, expect } from "vitest";
import { buildRoutinePayload, matchCompletions, autoMatchExercises } from "../../src/domain/hevy-sync";
import type { Session, ExerciseMappingRow } from "../../src/types";

describe("buildRoutinePayload", () => {
  it("maps session exercises to Hevy exercise IDs", () => {
    const session: Session = {
      id: "a",
      title: "Session A",
      exercises: [
        { id: "e1", name: "Dead Hangs", sets: "3×30 sec" },
        { id: "e2", name: "Scapular Push-ups", sets: "3×10" },
      ],
    };
    const mappings: ExerciseMappingRow[] = [
      { user_id: "u", program_exercise_name: "Dead Hangs", hevy_exercise_id: "hevy-1", confirmed_by_user: 1 },
      { user_id: "u", program_exercise_name: "Scapular Push-ups", hevy_exercise_id: "hevy-2", confirmed_by_user: 1 },
    ];
    const result = buildRoutinePayload(session, mappings);
    expect(result.title).toBe("Session A");
    expect(result.exercises).toHaveLength(2);
    expect(result.exercises[0].exercise_template_id).toBe("hevy-1");
  });

  it("reports unmapped exercises", () => {
    const session: Session = {
      id: "a",
      title: "Session A",
      exercises: [
        { id: "e1", name: "Dead Hangs", sets: "3×30 sec" },
        { id: "e2", name: "Unknown Exercise", sets: "3×10" },
      ],
    };
    const mappings: ExerciseMappingRow[] = [
      { user_id: "u", program_exercise_name: "Dead Hangs", hevy_exercise_id: "hevy-1", confirmed_by_user: 1 },
    ];
    const result = buildRoutinePayload(session, mappings);
    expect(result.unmapped).toEqual(["Unknown Exercise"]);
  });
});

describe("matchCompletions", () => {
  it("matches workouts to queue items by routine ID", () => {
    const items = [
      { id: 1, user_id: "u", session_id: "a", position: 0, status: "pending" as const, completed_date: null, hevy_routine_id: "r-1", hevy_workout_id: null },
      { id: 2, user_id: "u", session_id: "b", position: 1, status: "pending" as const, completed_date: null, hevy_routine_id: "r-2", hevy_workout_id: null },
    ];
    const workouts = [
      { id: "w-1", short_id: "s1", name: "Session A", start_time: "2026-03-21T08:00:00Z", end_time: "2026-03-21T08:30:00Z", exercises: [] },
    ];
    const matches = matchCompletions(items, workouts, (_w) => "r-1");
    expect(matches).toHaveLength(1);
    expect(matches[0].queueItemId).toBe(1);
    expect(matches[0].workoutId).toBe("w-1");
  });
});

describe("autoMatchExercises", () => {
  it("matches by normalized name", () => {
    const programNames = ["Dead Hangs", "Scapular Push-ups"];
    const hevyTemplates = [
      { id: "h1", title: "Dead Hang", type: "duration", primary_muscle_group: "lats" },
      { id: "h2", title: "Scapular Push Up", type: "reps", primary_muscle_group: "chest" },
    ];
    const matches = autoMatchExercises(programNames, hevyTemplates);
    expect(matches.get("Dead Hangs")).toBe("h1");
    expect(matches.get("Scapular Push-ups")).toBe("h2");
  });
});
