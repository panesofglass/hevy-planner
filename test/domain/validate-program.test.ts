import { describe, it, expect } from "vitest";
import { validateProgram } from "../../src/validation/validate-program";
import programJson from "../../programs/mobility-joint-restoration.json";

describe("validateProgram", () => {
  it("accepts a valid program", () => {
    const result = validateProgram(programJson);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.program.meta.title).toBeTruthy();
      expect(result.program.exerciseTemplates.length).toBeGreaterThan(0);
      expect(result.program.routines.length).toBeGreaterThan(0);
      expect(result.program.weekTemplates.length).toBeGreaterThan(0);
    }
  });

  it("rejects non-object input", () => {
    const result = validateProgram("not an object");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it("rejects empty object", () => {
    const result = validateProgram({});
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("meta"),
        ])
      );
    }
  });

  it("rejects program missing exerciseTemplates", () => {
    const result = validateProgram({
      meta: { version: "1.0.0", title: "Test" },
      routines: [{ id: "r1", title: "R", exercises: [{ exerciseTemplateId: "e1", sets: "3x10" }] }],
      weekTemplates: [{
        id: "w1", name: "W", days: [
          { dayOfWeek: 0 }, { dayOfWeek: 1 }, { dayOfWeek: 2 },
          { dayOfWeek: 3 }, { dayOfWeek: 4 }, { dayOfWeek: 5 }, { dayOfWeek: 6 },
        ],
      }],
      progressions: [],
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("exerciseTemplates"),
        ])
      );
    }
  });

  it("rejects exerciseTemplate with invalid type enum", () => {
    const result = validateProgram({
      meta: { version: "1.0.0", title: "Test" },
      exerciseTemplates: [{
        id: "e1",
        title: "Bad Type",
        type: "invalid_type",
        equipmentCategory: "none",
        primaryMuscleGroup: "chest",
      }],
      routines: [{ id: "r1", title: "R", exercises: [{ exerciseTemplateId: "e1", sets: "3x10" }] }],
      weekTemplates: [{
        id: "w1", name: "W", days: [
          { dayOfWeek: 0 }, { dayOfWeek: 1 }, { dayOfWeek: 2 },
          { dayOfWeek: 3 }, { dayOfWeek: 4 }, { dayOfWeek: 5 }, { dayOfWeek: 6 },
        ],
      }],
      progressions: [],
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("type"),
        ])
      );
    }
  });

  it("rejects additional properties at root level", () => {
    const base = {
      meta: { version: "1.0.0", title: "Test" },
      exerciseTemplates: [{
        id: "e1", title: "E", type: "duration",
        equipmentCategory: "none", primaryMuscleGroup: "chest",
      }],
      routines: [{ id: "r1", title: "R", exercises: [{ exerciseTemplateId: "e1", sets: "3x10" }] }],
      weekTemplates: [{
        id: "w1", name: "W", days: [
          { dayOfWeek: 0 }, { dayOfWeek: 1 }, { dayOfWeek: 2 },
          { dayOfWeek: 3 }, { dayOfWeek: 4 }, { dayOfWeek: 5 }, { dayOfWeek: 6 },
        ],
      }],
      progressions: [],
    };
    const result = validateProgram({ ...base, extraField: true });
    expect(result.valid).toBe(false);
  });

  it("returns multiple errors for multiple issues", () => {
    const result = validateProgram({
      meta: { version: "bad" },
      exerciseTemplates: [],
      routines: [],
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.length).toBeGreaterThan(1);
    }
  });
});
