import type { Env } from "../types";
import { sseResponse, patchElements } from "../sse/helpers";
import { loadProgram, upsertSkillAssessment, getUserSkillAssessments } from "../storage/queries";
import { skillCardHtml } from "../fragments/progress";

/** POST /api/skill-assessment/:skillId — save or update a user's skill assessment */
export async function handleSkillAssessment(
  request: Request,
  env: Env,
  userId: string,
  skillId: string
): Promise<Response> {
  // Load active program to validate skill ID and get programId
  const { program, programId } = await loadProgram(env.DB, userId);

  const skill = program.skills?.find((s) => s.id === skillId);
  if (!skill) {
    return new Response("Skill not found", { status: 404 });
  }

  // Extract current_state from request body (Datastar sends signals as JSON)
  const body = (await request.json()) as Record<string, unknown>;
  const signalKey = `assess_skill_${skillId.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const currentState = typeof body[signalKey] === "string" ? (body[signalKey] as string) : undefined;

  if (!currentState || currentState.trim().length === 0) {
    return new Response("current_state is required", { status: 400 });
  }

  // Upsert the assessment
  await upsertSkillAssessment(env.DB, userId, programId, skillId, currentState.trim());

  // Return SSE response that patches the skill card.
  // Selector uses escaped colon to match the Datastar signal attribute.
  const assessments = await getUserSkillAssessments(env.DB, userId, programId);
  const cardHtml = skillCardHtml(skill, true, assessments);
  const selector = `[data-signals\\:skill_${skillId.replace(/[^a-zA-Z0-9]/g, "_")}]`;
  return sseResponse(patchElements(cardHtml, { selector, mode: "outer" }));
}
