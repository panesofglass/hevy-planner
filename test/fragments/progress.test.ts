import { describe, it, expect } from "vitest";
import { skillCards } from "~/fragments/progress";
import type { Skill } from "~/types";

const baseSkill: Skill = {
  id: "muscle-up",
  name: "Muscle Up",
  icon: "★",
  color: "rgb(224,134,96)",
  currentState: "3-5 pull-ups. No muscle-up experience.",
  timeline: "6-9 months",
  milestones: [{ name: "8-10 strict pull-ups" }],
};

describe("skillCards", () => {
  it("renders currentState text from program default", () => {
    const html = skillCards([baseSkill]);
    expect(html).toContain("3-5 pull-ups. No muscle-up experience.");
  });

  it("does not render currentState section when skill has no currentState", () => {
    const skill: Skill = { id: "test", name: "Test" };
    const html = skillCards([skill]);
    expect(html).not.toContain("skill-current-state");
  });

  it("prefers user assessment over program default", () => {
    const assessments = new Map([["muscle-up", "Can do 5 strict pull-ups now."]]);
    const html = skillCards([baseSkill], assessments);
    expect(html).toContain("Can do 5 strict pull-ups now.");
    expect(html).not.toContain("3-5 pull-ups. No muscle-up experience.");
  });

  it("falls back to program default when no user assessment exists", () => {
    const assessments = new Map([["other-skill", "Some text"]]);
    const html = skillCards([baseSkill], assessments);
    expect(html).toContain("3-5 pull-ups. No muscle-up experience.");
  });

  it("renders an Edit button on skills with currentState", () => {
    const html = skillCards([baseSkill]);
    expect(html).toContain("Edit");
    expect(html).toContain("editing_skill_muscle_up");
  });

  it("renders a textarea for editing pre-filled with current text", () => {
    const html = skillCards([baseSkill]);
    expect(html).toContain("textarea");
    expect(html).toContain("/api/skill-assessment/muscle-up");
  });

  it("pre-fills textarea with user assessment when available", () => {
    const assessments = new Map([["muscle-up", "Updated text."]]);
    const html = skillCards([baseSkill], assessments);
    // The signal initial value should contain the user assessment
    expect(html).toContain("Updated text.");
  });
});
