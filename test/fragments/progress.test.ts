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
});
