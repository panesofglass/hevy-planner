import { describe, it, expect } from "vitest";
import { compareWorkout } from "../../src/domain/workout-compare";
import type { HevyWorkoutExercise } from "../../src/domain/workout-compare";
import type { RoutineExercise } from "../../src/types";

// helpers
function makeActual(
  templateId: string,
  title: string,
  sets: HevyWorkoutExercise["sets"]
): HevyWorkoutExercise {
  return { exercise_template_id: templateId, title, sets };
}

function makePresecribed(templateId: string, sets = "3×8"): RoutineExercise {
  return { exerciseTemplateId: templateId, sets };
}

describe("compareWorkout", () => {
  it("marks all exercises as matched when actual and prescribed align", () => {
    const templateMap = new Map([
      ["hevy-1", "prog-squat"],
      ["hevy-2", "prog-rdl"],
    ]);
    const actual: HevyWorkoutExercise[] = [
      makeActual("hevy-1", "Squat", [{ type: "normal", reps: 8, weight_kg: 100 }]),
      makeActual("hevy-2", "Romanian Deadlift", [{ type: "normal", reps: 10, weight_kg: 70 }]),
    ];
    const prescribed: RoutineExercise[] = [
      makePresecribed("prog-squat", "3×8"),
      makePresecribed("prog-rdl", "3×10"),
    ];

    const result = compareWorkout(actual, prescribed, templateMap);

    expect(result).toHaveLength(2);
    expect(result[0].status).toBe("matched");
    expect(result[0].exerciseTitle).toBe("Squat");
    expect(result[0].prescribedSets).toBe("3×8");
    expect(result[0].actualSets).toHaveLength(1);
    expect(result[1].status).toBe("matched");
    expect(result[1].exerciseTitle).toBe("Romanian Deadlift");
  });

  it("marks extra exercises when user adds an exercise not in the program", () => {
    const templateMap = new Map([["hevy-1", "prog-squat"]]);
    const actual: HevyWorkoutExercise[] = [
      makeActual("hevy-1", "Squat", [{ type: "normal", reps: 8, weight_kg: 100 }]),
      makeActual("hevy-99", "Bench Press", [{ type: "normal", reps: 10, weight_kg: 80 }]),
    ];
    const prescribed: RoutineExercise[] = [makePresecribed("prog-squat", "3×8")];

    const result = compareWorkout(actual, prescribed, templateMap);

    expect(result).toHaveLength(2);
    const extra = result.find((r) => r.status === "extra");
    expect(extra).toBeDefined();
    expect(extra!.exerciseTitle).toBe("Bench Press");
    expect(extra!.prescribedSets).toBeUndefined();
    expect(extra!.actualSets).toHaveLength(1);
  });

  it("marks missing exercises when user skips a prescribed exercise", () => {
    const templateMap = new Map([["hevy-1", "prog-squat"]]);
    const actual: HevyWorkoutExercise[] = [
      makeActual("hevy-1", "Squat", [{ type: "normal", reps: 8, weight_kg: 100 }]),
      // prog-rdl was prescribed but not performed
    ];
    const prescribed: RoutineExercise[] = [
      makePresecribed("prog-squat", "3×8"),
      makePresecribed("prog-rdl", "3×10"),
    ];

    const result = compareWorkout(actual, prescribed, templateMap);

    expect(result).toHaveLength(2);
    const missing = result.find((r) => r.status === "missing");
    expect(missing).toBeDefined();
    expect(missing!.exerciseTitle).toBe("prog-rdl");
    expect(missing!.prescribedSets).toBe("3×10");
    expect(missing!.actualSets).toHaveLength(0);
  });

  it("returns empty array when both actual and prescribed are empty", () => {
    const result = compareWorkout([], [], new Map());
    expect(result).toHaveLength(0);
  });

  it("handles null-equivalent empty workout data (no actual exercises)", () => {
    const templateMap = new Map([["hevy-1", "prog-squat"]]);
    const actual: HevyWorkoutExercise[] = [];
    const prescribed: RoutineExercise[] = [makePresecribed("prog-squat", "3×8")];

    const result = compareWorkout(actual, prescribed, templateMap);

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("missing");
    expect(result[0].actualSets).toHaveLength(0);
  });

  it("handles duration-type sets in actual exercises", () => {
    const templateMap = new Map([["hevy-1", "prog-dead-hang"]]);
    const actual: HevyWorkoutExercise[] = [
      makeActual("hevy-1", "Dead Hang", [
        { type: "normal", duration_seconds: 30 },
        { type: "normal", duration_seconds: 30 },
        { type: "normal", duration_seconds: 25 },
      ]),
    ];
    const prescribed: RoutineExercise[] = [makePresecribed("prog-dead-hang", "3×30 sec")];

    const result = compareWorkout(actual, prescribed, templateMap);

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("matched");
    expect(result[0].actualSets).toHaveLength(3);
    expect(result[0].actualSets[0].duration_seconds).toBe(30);
  });

  it("handles mixed extra and missing exercises together", () => {
    // Prescribed: A and B. Actual: A and C (C is extra, B is missing).
    const templateMap = new Map([
      ["hevy-a", "prog-a"],
      ["hevy-b", "prog-b"],
    ]);
    const actual: HevyWorkoutExercise[] = [
      makeActual("hevy-a", "Exercise A", [{ type: "normal", reps: 5 }]),
      makeActual("hevy-c", "Exercise C (extra)", [{ type: "normal", reps: 8 }]),
    ];
    const prescribed: RoutineExercise[] = [
      makePresecribed("prog-a", "3×5"),
      makePresecribed("prog-b", "3×8"),
    ];

    const result = compareWorkout(actual, prescribed, templateMap);

    expect(result).toHaveLength(3);
    const statuses = result.map((r) => r.status);
    expect(statuses).toContain("matched");
    expect(statuses).toContain("extra");
    expect(statuses).toContain("missing");
  });
});
