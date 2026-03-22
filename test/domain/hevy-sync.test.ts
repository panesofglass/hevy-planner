import { describe, it, expect } from "vitest";
import { buildRoutinePayload, matchCompletions, autoMatchExercises } from "../../src/domain/hevy-sync";
import type { Routine, ExerciseTemplate, ExerciseTemplateMappingRow } from "../../src/types";

describe("buildRoutinePayload", () => {
  it("maps routine exercises to Hevy exercise IDs via template mappings", () => {
    const routine: Routine = {
      id: "a",
      title: "Routine A",
      exercises: [
        { exerciseTemplateId: "dead-hangs", sets: "3×30 sec" },
        { exerciseTemplateId: "scapular-pushups", sets: "3×10" },
      ],
    };
    const mappings: ExerciseTemplateMappingRow[] = [
      { user_id: "u", program_template_id: "dead-hangs", hevy_template_id: "hevy-1", is_custom: 0 },
      { user_id: "u", program_template_id: "scapular-pushups", hevy_template_id: "hevy-2", is_custom: 0 },
    ];
    const result = buildRoutinePayload(routine, mappings);
    expect(result.title).toBe("Routine A");
    expect(result.exercises).toHaveLength(2);
    expect(result.exercises[0].exercise_template_id).toBe("hevy-1");
  });

  it("reports unmapped exercise template IDs", () => {
    const routine: Routine = {
      id: "a",
      title: "Routine A",
      exercises: [
        { exerciseTemplateId: "dead-hangs", sets: "3×30 sec" },
        { exerciseTemplateId: "unknown-exercise", sets: "3×10" },
      ],
    };
    const mappings: ExerciseTemplateMappingRow[] = [
      { user_id: "u", program_template_id: "dead-hangs", hevy_template_id: "hevy-1", is_custom: 0 },
    ];
    const result = buildRoutinePayload(routine, mappings);
    expect(result.unmapped).toEqual(["unknown-exercise"]);
  });
});

describe("matchCompletions", () => {
  it("matches workouts to queue items by routine ID", () => {
    const items = [
      { id: 1, user_id: "u", routine_id: "a", position: 0, status: "pending" as const, completed_date: null, hevy_routine_id: "r-1", hevy_workout_id: null },
      { id: 2, user_id: "u", routine_id: "b", position: 1, status: "pending" as const, completed_date: null, hevy_routine_id: "r-2", hevy_workout_id: null },
    ];
    const workouts = [
      { id: "w-1", short_id: "s1", name: "Routine A", start_time: "2026-03-21T08:00:00Z", end_time: "2026-03-21T08:30:00Z", exercises: [] },
    ];
    const matches = matchCompletions(items, workouts, (_w) => "r-1");
    expect(matches).toHaveLength(1);
    expect(matches[0].queueItemId).toBe(1);
    expect(matches[0].workoutId).toBe("w-1");
  });
});

describe("autoMatchExercises", () => {
  it("matches our exercise templates to Hevy templates by normalized title", () => {
    const ourTemplates: ExerciseTemplate[] = [
      { id: "dead-hangs", title: "Dead Hangs", type: "duration", equipmentCategory: "pull_up_bar", primaryMuscleGroup: "lats" },
      { id: "scapular-pushups", title: "Scapular Push-ups", type: "bodyweight_reps", equipmentCategory: "none", primaryMuscleGroup: "chest" },
    ];
    const hevyTemplates = [
      { id: "h1", title: "Dead Hang", type: "duration", primary_muscle_group: "lats" },
      { id: "h2", title: "Scapular Push Up", type: "reps", primary_muscle_group: "chest" },
    ];
    const matches = autoMatchExercises(ourTemplates, hevyTemplates);
    expect(matches.get("dead-hangs")).toBe("h1");
    expect(matches.get("scapular-pushups")).toBe("h2");
  });
});
