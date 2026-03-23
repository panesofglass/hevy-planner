import { describe, it, expect } from "vitest";
import { mapToHevyEnums } from "../../src/domain/hevy-enums";
import type { ExerciseTemplate } from "../../src/types";

function makeTemplate(overrides: Partial<ExerciseTemplate> = {}): ExerciseTemplate {
  return {
    id: "test",
    title: "Test Exercise",
    type: "duration",
    equipmentCategory: "none",
    primaryMuscleGroup: "chest",
    ...overrides,
  };
}

describe("mapToHevyEnums", () => {
  describe("exerciseType", () => {
    it("passes through valid Hevy types", () => {
      for (const type of ["duration", "reps_only", "bodyweight_reps", "weight_reps", "weight_duration"] as const) {
        const result = mapToHevyEnums(makeTemplate({ type }));
        expect(result.exerciseType).toBe(type);
      }
    });

    it("falls back to duration for unknown types", () => {
      const result = mapToHevyEnums(makeTemplate({ type: "unknown" as any }));
      expect(result.exerciseType).toBe("duration");
    });
  });

  describe("equipmentCategory", () => {
    it("passes through valid Hevy equipment", () => {
      for (const eq of ["none", "dumbbell", "machine", "resistance_band", "other"] as const) {
        const result = mapToHevyEnums(makeTemplate({ equipmentCategory: eq }));
        expect(result.equipmentCategory).toBe(eq);
      }
    });

    it("maps foam_roller to other", () => {
      const result = mapToHevyEnums(makeTemplate({ equipmentCategory: "foam_roller" }));
      expect(result.equipmentCategory).toBe("other");
    });

    it("maps pull_up_bar to other", () => {
      const result = mapToHevyEnums(makeTemplate({ equipmentCategory: "pull_up_bar" }));
      expect(result.equipmentCategory).toBe("other");
    });

    it("maps unknown equipment to other", () => {
      const result = mapToHevyEnums(makeTemplate({ equipmentCategory: "trampoline" as any }));
      expect(result.equipmentCategory).toBe("other");
    });
  });

  describe("primaryMuscleGroup", () => {
    it("passes through valid Hevy muscle groups", () => {
      for (const mg of ["chest", "glutes", "shoulders", "lats", "upper_back", "lower_back", "abdominals", "quadriceps", "hamstrings", "calves", "neck", "forearms", "adductors"] as const) {
        const result = mapToHevyEnums(makeTemplate({ primaryMuscleGroup: mg }));
        expect(result.primaryMuscleGroup).toBe(mg);
      }
    });

    it("maps hip_flexors to other", () => {
      const result = mapToHevyEnums(makeTemplate({ primaryMuscleGroup: "hip_flexors" }));
      expect(result.primaryMuscleGroup).toBe("other");
    });

    it("maps obliques to abdominals", () => {
      const result = mapToHevyEnums(makeTemplate({ primaryMuscleGroup: "obliques" }));
      expect(result.primaryMuscleGroup).toBe("abdominals");
    });

    it("maps unknown muscle group to other", () => {
      const result = mapToHevyEnums(makeTemplate({ primaryMuscleGroup: "brain" as any }));
      expect(result.primaryMuscleGroup).toBe("other");
    });
  });

  describe("secondaryMuscleGroups", () => {
    it("maps each secondary muscle group", () => {
      const result = mapToHevyEnums(makeTemplate({
        secondaryMuscleGroups: ["hip_flexors", "obliques", "glutes"],
      }));
      expect(result.secondaryMuscleGroups).toEqual(["other", "abdominals", "glutes"]);
    });

    it("returns empty array when no secondary groups", () => {
      const result = mapToHevyEnums(makeTemplate());
      expect(result.secondaryMuscleGroups).toEqual([]);
    });
  });

  describe("integration with real program data", () => {
    it("maps all equipment values from the mobility program to valid Hevy enums", () => {
      const expected: Record<string, string> = {
        dumbbell: "dumbbell",
        foam_roller: "other",
        machine: "machine",
        none: "none",
        other: "other",
        pull_up_bar: "other",
        resistance_band: "resistance_band",
      };
      for (const [input, output] of Object.entries(expected)) {
        const result = mapToHevyEnums(makeTemplate({ equipmentCategory: input as any }));
        expect(result.equipmentCategory, `equipment: ${input}`).toBe(output);
      }
    });

    it("maps all muscle group values from the mobility program to valid Hevy enums", () => {
      // Primary muscles — all are valid Hevy values, so they pass through
      const primaryPassthrough = ["abdominals", "adductors", "calves", "chest", "forearms", "glutes", "lats", "lower_back", "neck", "quadriceps", "shoulders", "upper_back"] as const;
      for (const mg of primaryPassthrough) {
        const result = mapToHevyEnums(makeTemplate({ primaryMuscleGroup: mg }));
        expect(result.primaryMuscleGroup, `primary: ${mg}`).toBe(mg);
      }

      // Secondary muscles that need mapping
      const secondaryExpected: Record<string, string> = {
        hip_flexors: "other",
        obliques: "abdominals",
        hamstrings: "hamstrings",
        glutes: "glutes",
      };
      for (const [input, output] of Object.entries(secondaryExpected)) {
        const result = mapToHevyEnums(makeTemplate({ secondaryMuscleGroups: [input as any] }));
        expect(result.secondaryMuscleGroups[0], `secondary: ${input}`).toBe(output);
      }
    });
  });
});
