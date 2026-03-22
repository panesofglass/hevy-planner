import type { ExerciseTemplate } from "../types";

export const HEVY_EXERCISE_TYPES = [
  "weight_reps",
  "bodyweight_reps",
  "weighted_bodyweight",
  "assisted_bodyweight",
  "duration",
  "weight_duration",
  "distance_duration",
  "weight_distance",
  "reps_only",
] as const;

export const HEVY_EQUIPMENT_CATEGORIES = [
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "bodyweight",
  "band",
  "kettlebell",
  "other",
  "weighted_bodyweight",
  "assisted_bodyweight",
  "cardio",
  "duration",
  "resistance_band",
  "none",
] as const;

export const HEVY_MUSCLE_GROUPS = [
  "abdominals",
  "abductors",
  "adductors",
  "biceps",
  "calves",
  "cardio",
  "chest",
  "forearms",
  "full_body",
  "glutes",
  "hamstrings",
  "lats",
  "lower_back",
  "neck",
  "other",
  "quadriceps",
  "shoulders",
  "triceps",
  "traps",
  "upper_back",
] as const;

export type HevyExerciseType = (typeof HEVY_EXERCISE_TYPES)[number];
export type HevyEquipmentCategory = (typeof HEVY_EQUIPMENT_CATEGORIES)[number];
export type HevyMuscleGroup = (typeof HEVY_MUSCLE_GROUPS)[number];

function mapEnum<T extends string>(
  value: string,
  validValues: readonly T[],
  overrides: Record<string, T>,
  fallback: T,
): T {
  if (value in overrides) return overrides[value];
  if ((validValues as readonly string[]).includes(value)) return value as T;
  return fallback;
}

const noOverrides: Record<string, never> = {};

const equipmentOverrides: Record<string, HevyEquipmentCategory> = {
  foam_roller: "other",
  pull_up_bar: "other",
};

const muscleGroupOverrides: Record<string, HevyMuscleGroup> = {
  hip_flexors: "other",
  obliques: "abdominals",
};

export interface HevyEnumValues {
  exerciseType: HevyExerciseType;
  equipmentCategory: HevyEquipmentCategory;
  primaryMuscleGroup: HevyMuscleGroup;
  secondaryMuscleGroups: HevyMuscleGroup[];
}

function mapMuscleGroup(value: string): HevyMuscleGroup {
  return mapEnum(value, HEVY_MUSCLE_GROUPS, muscleGroupOverrides, "other");
}

export function mapToHevyEnums(template: ExerciseTemplate): HevyEnumValues {
  return {
    exerciseType: mapEnum(template.type, HEVY_EXERCISE_TYPES, noOverrides, "duration"),
    equipmentCategory: mapEnum(template.equipmentCategory, HEVY_EQUIPMENT_CATEGORIES, equipmentOverrides, "other"),
    primaryMuscleGroup: mapMuscleGroup(template.primaryMuscleGroup),
    secondaryMuscleGroups: (template.secondaryMuscleGroups ?? []).map(mapMuscleGroup),
  };
}
