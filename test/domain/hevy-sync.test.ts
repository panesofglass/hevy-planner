import { describe, it, expect } from "vitest";
import { buildRoutinePayload, matchCompletions, autoMatchExercises, computeFolderAssignments, reconcileRoutines } from "../../src/domain/hevy-sync";
import type { Routine, ExerciseTemplate, ExerciseTemplateMappingRow } from "../../src/types";
import type { HevyExerciseTemplate } from "../../src/hevy/client";

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
      { user_id: "u", program_template_id: "dead-hangs", hevy_template_id: "hevy-1", is_custom: 0, program_id: null },
      { user_id: "u", program_template_id: "scapular-pushups", hevy_template_id: "hevy-2", is_custom: 0, program_id: null },
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
      { user_id: "u", program_template_id: "dead-hangs", hevy_template_id: "hevy-1", is_custom: 0, program_id: null },
    ];
    const result = buildRoutinePayload(routine, mappings);
    expect(result.unmapped).toEqual(["unknown-exercise"]);
  });
});

describe("matchCompletions", () => {
  it("matches workouts to queue items by routine ID", () => {
    const items = [
      { id: 1, user_id: "u", routine_id: "a", position: 0, status: "pending" as const, completed_date: null, hevy_routine_id: "r-1", hevy_workout_id: null, hevy_workout_data: null, program_id: null },
      { id: 2, user_id: "u", routine_id: "b", position: 1, status: "pending" as const, completed_date: null, hevy_routine_id: "r-2", hevy_workout_id: null, hevy_workout_data: null, program_id: null },
    ];
    const workouts = [
      { id: "w-1", short_id: "s1", title: "Routine A", start_time: "2026-03-21T08:00:00Z", end_time: "2026-03-21T08:30:00Z", exercises: [] },
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
    const hevyTemplates: HevyExerciseTemplate[] = [
      { id: "h1", title: "Dead Hang", type: "duration", primary_muscle_group: "lats", equipment_category: "other", other_muscles: [] },
      { id: "h2", title: "Scapular Push Up", type: "reps", primary_muscle_group: "chest", equipment_category: "none", other_muscles: [] },
    ];
    const matches = autoMatchExercises(ourTemplates, hevyTemplates);
    expect(matches.get("dead-hangs")).toBe("h1");
    expect(matches.get("scapular-pushups")).toBe("h2");
  });
});

describe("computeFolderAssignments", () => {
  it("uses folderGroup when set", () => {
    const routines: Routine[] = [
      { id: "a", title: "Session A", folderGroup: "Main Sessions", exercises: [] },
      { id: "b", title: "Session B", folderGroup: "Recovery", exercises: [] },
    ];
    const result = computeFolderAssignments(routines, "My Program");
    expect(result[0].folderName).toBe("Main Sessions");
    expect(result[1].folderName).toBe("Recovery");
  });

  it("defaults isDaily routines to 'Daily'", () => {
    const routines: Routine[] = [
      { id: "cars", title: "Daily CARs", isDaily: true, exercises: [] },
    ];
    const result = computeFolderAssignments(routines, "My Program");
    expect(result[0].folderName).toBe("Daily");
  });

  it("defaults non-daily routines to program title", () => {
    const routines: Routine[] = [
      { id: "a", title: "Session A", exercises: [] },
    ];
    const result = computeFolderAssignments(routines, "My Program");
    expect(result[0].folderName).toBe("My Program");
  });

  it("folderGroup takes priority over isDaily", () => {
    const routines: Routine[] = [
      { id: "cars", title: "Daily CARs", isDaily: true, folderGroup: "Custom Folder", exercises: [] },
    ];
    const result = computeFolderAssignments(routines, "My Program");
    expect(result[0].folderName).toBe("Custom Folder");
  });
});

describe("reconcileRoutines", () => {
  it("returns update when D1 mapping exists", () => {
    const assignments = [{ routineId: "a", routineTitle: "Session A", folderName: "Main" }];
    const existingMappings = new Map([["a", "hevy-123"]]);
    const result = reconcileRoutines(assignments, [], new Map(), existingMappings);
    expect(result[0].action).toBe("update");
    expect(result[0].existingHevyRoutineId).toBe("hevy-123");
  });

  it("returns update when Hevy routine matches by title+folder", () => {
    const assignments = [{ routineId: "a", routineTitle: "Session A", folderName: "Main" }];
    const hevyRoutines = [{ id: "hevy-456", title: "Session A", folder_id: 100 }];
    const folderMap = new Map([["Main", 100]]);
    const result = reconcileRoutines(assignments, hevyRoutines, folderMap, new Map());
    expect(result[0].action).toBe("update");
    expect(result[0].existingHevyRoutineId).toBe("hevy-456");
  });

  it("returns create when no match exists", () => {
    const assignments = [{ routineId: "a", routineTitle: "Session A", folderName: "Main" }];
    const result = reconcileRoutines(assignments, [], new Map([["Main", 100]]), new Map());
    expect(result[0].action).toBe("create");
    expect(result[0].existingHevyRoutineId).toBeUndefined();
  });

  it("does not match routine in wrong folder", () => {
    const assignments = [{ routineId: "a", routineTitle: "Session A", folderName: "Main" }];
    const hevyRoutines = [{ id: "hevy-789", title: "Session A", folder_id: 999 }];
    const folderMap = new Map([["Main", 100]]);
    const result = reconcileRoutines(assignments, hevyRoutines, folderMap, new Map());
    expect(result[0].action).toBe("create");
  });
});
