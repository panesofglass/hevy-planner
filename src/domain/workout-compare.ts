// ──────────────────────────────────────────────────────────────────
// workout-compare — compare actual Hevy workout data vs prescribed
// ──────────────────────────────────────────────────────────────────

import type { RoutineExercise } from "../types";

export interface ActualSet {
  type: "normal" | "warmup" | "dropset" | "failure";
  reps?: number;
  weight_kg?: number;
  duration_seconds?: number;
  rpe?: number;
}

export interface ExerciseComparison {
  exerciseTitle: string;
  status: "matched" | "extra" | "missing";
  /** e.g. "3×8" from the routine prescription */
  prescribedSets?: string;
  actualSets: ActualSet[];
}

export interface HevyWorkoutExercise {
  exercise_template_id: string;
  title: string;
  sets: ActualSet[];
}

/**
 * Compare actual workout data from Hevy with prescribed sets from the program routine.
 *
 * @param actualExercises - parsed from hevy_workout_data JSON (Hevy exercise format)
 * @param prescribedExercises - from the program routine's exercises array
 * @param templateMap - maps hevy_template_id → program_template_id
 */
export function compareWorkout(
  actualExercises: HevyWorkoutExercise[],
  prescribedExercises: RoutineExercise[],
  templateMap: Map<string, string>
): ExerciseComparison[] {
  // Build reverse map: program_template_id → prescribed exercise
  const prescribedByProgramId = new Map<string, RoutineExercise>(
    prescribedExercises.map((e) => [e.exerciseTemplateId, e])
  );

  const result: ExerciseComparison[] = [];
  const matchedProgramIds = new Set<string>();

  // Process each actual exercise
  for (const actual of actualExercises) {
    const programTemplateId = templateMap.get(actual.exercise_template_id);
    const prescribed = programTemplateId
      ? prescribedByProgramId.get(programTemplateId)
      : undefined;

    if (prescribed && programTemplateId) {
      matchedProgramIds.add(programTemplateId);
      result.push({
        exerciseTitle: actual.title,
        status: "matched",
        prescribedSets: prescribed.sets,
        actualSets: actual.sets,
      });
    } else {
      result.push({
        exerciseTitle: actual.title,
        status: "extra",
        actualSets: actual.sets,
      });
    }
  }

  // Add any prescribed exercises that were not performed
  for (const prescribed of prescribedExercises) {
    if (!matchedProgramIds.has(prescribed.exerciseTemplateId)) {
      result.push({
        exerciseTitle: prescribed.exerciseTemplateId,
        status: "missing",
        prescribedSets: prescribed.sets,
        actualSets: [],
      });
    }
  }

  return result;
}
