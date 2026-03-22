import type { Session, ExerciseMappingRow, QueueItemRow } from "../types";
import type { HevyRoutineExercise, HevySet, HevyWorkout, HevyExerciseTemplate } from "../hevy/client";

// ──────────────────────────────────────────────────────────────────
// Sets string parser
// ──────────────────────────────────────────────────────────────────

/**
 * Parse a sets string like "3×8", "3×30 sec", "2×45 sec", "3×1 min"
 * into an array of HevySet objects.
 *
 * - Patterns containing "sec" or "min" produce duration_seconds sets.
 * - All other patterns produce reps sets.
 */
function parseSetsString(setsStr: string): HevySet[] {
  // Normalise the multiplication sign — programs may use × (U+00D7) or x
  const normalised = setsStr.replace(/×/g, "x");

  // Match "NxM sec", "NxM min", or "NxM"
  const match = normalised.match(/^(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*(sec|min)?/i);
  if (!match) {
    // Fallback: return a single normal set with no values
    return [{ type: "normal" }];
  }

  const count = parseInt(match[1], 10);
  const value = parseFloat(match[2]);
  const unit = match[3]?.toLowerCase();

  const isDuration = unit === "sec" || unit === "min";
  const duration_seconds = isDuration
    ? unit === "min"
      ? Math.round(value * 60)
      : Math.round(value)
    : undefined;

  const sets: HevySet[] = [];
  for (let i = 0; i < count; i++) {
    if (isDuration) {
      sets.push({ type: "normal", duration_seconds });
    } else {
      sets.push({ type: "normal", reps: Math.round(value) });
    }
  }
  return sets;
}

// ──────────────────────────────────────────────────────────────────
// buildRoutinePayload
// ──────────────────────────────────────────────────────────────────

export interface RoutinePayload {
  title: string;
  exercises: HevyRoutineExercise[];
  /** Exercise names from the session that had no mapping */
  unmapped: string[];
}

/**
 * Build a Hevy routine payload from a program session + exercise mappings.
 * Exercises without a mapping are collected in `unmapped` and omitted from
 * the payload.
 */
export function buildRoutinePayload(
  session: Session,
  mappings: ExerciseMappingRow[]
): RoutinePayload {
  const mappingMap = new Map(
    mappings.map((m) => [m.program_exercise_name, m.hevy_exercise_id])
  );

  const exercises: HevyRoutineExercise[] = [];
  const unmapped: string[] = [];

  for (const exercise of session.exercises) {
    const hevyId = mappingMap.get(exercise.name);
    if (!hevyId) {
      unmapped.push(exercise.name);
      continue;
    }

    let sets: HevySet[];
    if (typeof exercise.sets === "string") {
      sets = parseSetsString(exercise.sets);
    } else if (typeof exercise.sets === "number") {
      // Only a count provided — default to 1 rep per set
      sets = Array.from({ length: exercise.sets }, () => ({ type: "normal" as const, reps: 1 }));
    } else {
      sets = [{ type: "normal" }];
    }

    exercises.push({
      exercise_template_id: hevyId,
      sets,
      notes: exercise.notes,
    });
  }

  return { title: session.title, exercises, unmapped };
}

// ──────────────────────────────────────────────────────────────────
// matchCompletions
// ──────────────────────────────────────────────────────────────────

export interface CompletionMatch {
  queueItemId: number;
  workoutId: string;
}

/**
 * Match Hevy workouts to queue items by comparing each workout's routine ID
 * (obtained via `getRoutineId`) to the `hevy_routine_id` stored on the queue
 * item.
 *
 * Each workout is matched to at most one queue item.
 */
export function matchCompletions(
  items: Pick<QueueItemRow, "id" | "hevy_routine_id">[],
  workouts: HevyWorkout[],
  getRoutineId: (workout: HevyWorkout) => string | null
): CompletionMatch[] {
  // Build a map: routine_id → queue item id
  const routineToItem = new Map<string, number>();
  for (const item of items) {
    if (item.hevy_routine_id) {
      routineToItem.set(item.hevy_routine_id, item.id);
    }
  }

  const matches: CompletionMatch[] = [];
  const usedItems = new Set<number>();

  for (const workout of workouts) {
    const routineId = getRoutineId(workout);
    if (!routineId) continue;

    const itemId = routineToItem.get(routineId);
    if (itemId !== undefined && !usedItems.has(itemId)) {
      matches.push({ queueItemId: itemId, workoutId: workout.id });
      usedItems.add(itemId);
    }
  }

  return matches;
}

// ──────────────────────────────────────────────────────────────────
// autoMatchExercises
// ──────────────────────────────────────────────────────────────────

/**
 * Normalize an exercise name for fuzzy matching:
 * - Lowercase
 * - Strip non-alphanumeric characters (spaces, hyphens, punctuation)
 * - Strip a trailing 's' (basic singular/plural normalisation)
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/s$/, "");
}

/**
 * Attempt to automatically match program exercise names to Hevy exercise
 * template IDs using normalized name comparison. Supports partial matching
 * (one normalized name contains the other).
 *
 * Returns a Map of program exercise name → Hevy template ID for every name
 * that could be matched.
 */
export function autoMatchExercises(
  programNames: string[],
  hevyTemplates: HevyExerciseTemplate[]
): Map<string, string> {
  const result = new Map<string, string>();

  // Pre-normalize template names
  const normalizedTemplates = hevyTemplates.map((t) => ({
    id: t.id,
    norm: normalizeName(t.title),
  }));

  for (const programName of programNames) {
    const normProgram = normalizeName(programName);

    // Prefer exact match first
    let matched = normalizedTemplates.find((t) => t.norm === normProgram);

    // Fall back to partial match (one contains the other)
    if (!matched) {
      matched = normalizedTemplates.find(
        (t) => t.norm.includes(normProgram) || normProgram.includes(t.norm)
      );
    }

    if (matched) {
      result.set(programName, matched.id);
    }
  }

  return result;
}
