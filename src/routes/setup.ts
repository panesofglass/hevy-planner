import type { Env, Program } from "../types";
import { sseResponse, executeScript } from "../sse/helpers";
import { sseErrorCard } from "../utils/sse";
import { upsertUser } from "../storage/queries";
import { validateProgram } from "../validation/validate-program";
import { activateProgram } from "../services/activate-program";
import { HevyClient } from "../hevy/client";
import { encryptAesGcm } from "../utils/crypto";
import { todayString } from "../utils/date";

import defaultProgramJson from "../../programs/mobility-joint-restoration.json";

/** POST /api/setup — store program, sync Hevy, create user, generate queue */
export async function handleSetup(
  request: Request,
  env: Env,
  userId: string,
  urlTemplateId?: string,
  tz?: string
): Promise<Response> {
  let body: { apiKey?: string; startDate?: string; templateId?: string; programJson?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // Body may be empty — that's OK, template ID comes from URL
  }

  const templateId = urlTemplateId ?? body.templateId;
  const startDate = body.startDate || todayString(tz);
  const apiKey = body.apiKey || undefined;
  // Fall back to bundled default program if none uploaded
  const programJsonStr = body.programJson || JSON.stringify(defaultProgramJson);

  if (!templateId) {
    return sseErrorCard("Template ID is required.");
  }

  // Parse and validate program
  let program: Program;
  try {
    const parsed = JSON.parse(programJsonStr);
    const result = validateProgram(parsed);
    if (!result.valid) {
      return sseErrorCard(`Invalid program: ${result.errors.join(", ")}`);
    }
    program = result.program;
  } catch {
    return sseErrorCard("Invalid program JSON.");
  }

  const template = program.weekTemplates.find((t) => t.id === templateId);
  if (!template) {
    return sseErrorCard("Invalid template ID.");
  }

  // Validate API key against Hevy before proceeding
  if (apiKey) {
    try {
      const client = new HevyClient(apiKey);
      await client.getExerciseTemplates(1, 1);
    } catch {
      return sseErrorCard(
        "Invalid Hevy API key. Check your key in Hevy Settings > Developer and try again.",
        "#content",
        "prepend"
      );
    }
  }

  // h. Upsert user (must exist before program insert due to FK constraint)
  // Encrypt the API key before storage; pass undefined when no key provided.
  const encryptedApiKey = apiKey ? await encryptAesGcm(apiKey, env.ENCRYPTION_KEY) : undefined;
  await upsertUser(env.DB, {
    id: userId,
    active_program: program.meta.title,
    template_id: templateId,
    start_date: startDate,
    hevy_api_key: encryptedApiKey,
    timezone: tz,
  });

  // a-j. Store program, sync Hevy templates/routines, generate queue
  await activateProgram(env.DB, userId, program, programJsonStr, templateId, apiKey);

  // k. Redirect to Today
  return sseResponse(executeScript("window.location.href = '/'"));
}
