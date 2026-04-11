import type { Env, WeekTemplate, Program } from "../types";
import { sseResponse, patchElements, mergeFragments } from "../sse/helpers";
import { sseErrorCard } from "../utils/sse";
import {
  getUser,
  loadProgram,
  getPrograms,
  setActiveProgram,
  getActiveProgram,
  deleteProgram,
  updateUserProgram,
} from "../storage/queries";
import { currentWeek } from "../domain/schedule";
import { validateProgram } from "../validation/validate-program";
import {
  programOverview,
  progressionsSection,
  routinesSection,
  foundationsSection,
  resourcesSection,
  bodiSection,
  importProgramSection,
  importTemplateSelectionFragment,
  programLibrarySection,
} from "../fragments/program";
import { templateSelectionFragment } from "../fragments/setup";
import { activateProgram } from "../services/activate-program";
import { getDecryptedApiKey } from "../storage/api-key";
import { escapeHtml } from "../utils/html";
import { todayString } from "../utils/date";

import defaultProgramJson from "../../programs/mobility-joint-restoration.json";

/**
 * Shared validation logic for both the setup and import program flows.
 * Parses and validates programJsonStr, then returns either an error card
 * or the rendered template selection fragment.
 *
 * @param programJsonStr  - raw JSON string to validate (may be undefined)
 * @param selector        - CSS selector for the patch target
 * @param renderTemplates - function that renders the template selection UI
 * @param fallback        - JSON string to use when programJsonStr is empty
 */
export function validateAndRespond(
  programJsonStr: string | undefined,
  selector: string,
  renderTemplates: (templates: WeekTemplate[]) => string,
  fallback?: string
): Response {
  const jsonStr = programJsonStr || fallback;
  if (!jsonStr) {
    return sseErrorCard("No program JSON provided.", selector, "inner");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return sseErrorCard("Invalid JSON file.", selector, "inner");
  }

  const result = validateProgram(parsed);
  if (!result.valid) {
    const errorList = result.errors.map((e) => `<li>${escapeHtml(e)}</li>`).join("");
    return sseResponse(
      patchElements(
        `<div class="card"><p style="color:var(--orange)">Validation errors:</p><ul style="margin:8px 0 0 16px;font-size:13px;color:var(--text-secondary)">${errorList}</ul></div>`,
        { selector, mode: "inner" }
      )
    );
  }

  return sseResponse(
    patchElements(renderTemplates(result.program.weekTemplates), { selector, mode: "inner" })
  );
}

/** POST /api/validate-program — validate uploaded JSON, return template cards */
export async function handleValidateProgram(request: Request): Promise<Response> {
  const body = (await request.json()) as Record<string, unknown>;
  const programJsonStr = body.programJson as string | undefined;
  // Fall back to bundled default program if none uploaded
  return validateAndRespond(
    programJsonStr,
    "#validation-result",
    templateSelectionFragment,
    JSON.stringify(defaultProgramJson)
  );
}

/** POST /api/validate-import-program — validate uploaded JSON for the import flow */
export async function handleValidateImportProgram(request: Request): Promise<Response> {
  const body = (await request.json()) as Record<string, unknown>;
  // Datastar converts data-signals:import-program-json to importProgramJson
  const programJsonStr = body.importProgramJson as string | undefined;
  return validateAndRespond(programJsonStr, "#import-validation-result", importTemplateSelectionFragment);
}

/** POST /api/import-program — replace active program, re-sync Hevy, regenerate queue */
export async function handleImportProgram(request: Request, env: Env, userId: string, tz?: string): Promise<Response> {
  // Datastar sends camelCase signal names: importProgramJson, importTemplateId
  let body: { importProgramJson?: string; importTemplateId?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response("Invalid request body.", { status: 400 });
  }

  const { importProgramJson: programJsonStr, importTemplateId: templateId } = body;

  if (!programJsonStr) {
    return new Response("No program JSON provided.", { status: 400 });
  }

  if (!templateId) {
    return new Response("Template ID is required.", { status: 400 });
  }

  // Parse and validate program
  let program: Program;
  try {
    const parsed = JSON.parse(programJsonStr);
    const result = validateProgram(parsed);
    if (!result.valid) {
      return new Response(`Invalid program: ${result.errors.join(", ")}`, { status: 400 });
    }
    program = result.program;
  } catch {
    return new Response("Invalid program JSON.", { status: 400 });
  }

  if (!program.weekTemplates.find((t) => t.id === templateId)) {
    return new Response("Invalid template ID.", { status: 400 });
  }

  // Update user program fields and get existing (encrypted) API key in one pass, then decrypt
  const storedKey = await updateUserProgram(env.DB, userId, program.meta.title, templateId, todayString(tz));
  const apiKey = storedKey ? (await getDecryptedApiKey(env.DB, userId, env.ENCRYPTION_KEY)) ?? undefined : undefined;

  // Activate: clear old state, sync to Hevy, generate queue
  await activateProgram(env.DB, userId, program, programJsonStr, templateId, apiKey);

  return new Response(null, { status: 202 });
}

/** POST /api/switch-program/:id — switch the active program */
export async function handleSwitchProgram(
  env: Env,
  userId: string,
  programId: number,
  _tz?: string
): Promise<Response> {
  try {
    await setActiveProgram(env.DB, userId, programId);
    // Update the active_program label on the users row for subtitle display
    const row = await getActiveProgram(env.DB, userId);
    if (row) {
      const prog = JSON.parse(row.json_data) as Program;
      await env.DB.prepare("UPDATE users SET active_program = ? WHERE id = ?")
        .bind(prog.meta.title, userId)
        .run();
    }
  } catch (err) {
    return new Response(err instanceof Error ? err.message : "Failed to switch program", { status: 500 });
  }
  return new Response(null, { status: 202 });
}

/** POST /api/delete-program/:id — delete an inactive program */
export async function handleDeleteProgram(
  env: Env,
  userId: string,
  programId: number
): Promise<Response> {
  // Verify the program is not active before deleting
  const programs = await getPrograms(env.DB, userId);
  const target = programs.find((p) => p.id === programId);
  if (!target) {
    return new Response("Program not found.", { status: 404 });
  }
  if (target.is_active) {
    return new Response("Cannot delete the active program. Switch to another program first.", { status: 400 });
  }
  try {
    await deleteProgram(env.DB, userId, programId);
  } catch (err) {
    return new Response(err instanceof Error ? err.message : "Failed to delete program", { status: 500 });
  }
  return new Response(null, { status: 202 });
}

/** Full HTML: Program page — overview, progressions, routines, foundations, resources, BODi */
export async function renderProgramPage(env: Env, userId: string): Promise<string> {
  let program: Program;
  let user: Awaited<ReturnType<typeof getUser>>;
  let allPrograms: Awaited<ReturnType<typeof getPrograms>>;
  try {
    const [loaded, userRow, programRows] = await Promise.all([
      loadProgram(env.DB, userId),
      getUser(env.DB, userId),
      getPrograms(env.DB, userId),
    ]);
    program = loaded.program;
    user = userRow;
    allPrograms = programRows;
  } catch {
    return `<div class="card"><p style="color:var(--text-secondary)">No active program. Upload a program to get started.</p></div>`;
  }
  const parts: string[] = [];

  const week = user ? currentWeek(user.start_date) : null;

  if (allPrograms.length > 1) {
    parts.push(programLibrarySection(allPrograms));
  }

  parts.push(programOverview(program, user, week));

  if (program.progressions.length > 0) {
    parts.push(progressionsSection(program.progressions, week));
  }

  parts.push(routinesSection(program));

  if (program.foundations && program.foundations.length > 0) {
    parts.push(foundationsSection(program.foundations));
  }

  if (program.resources && program.resources.length > 0) {
    parts.push(resourcesSection(program.resources));
  }

  if (program.bodi && program.bodi.length > 0) {
    parts.push(bodiSection(program.bodi));
  }

  parts.push(importProgramSection());

  return parts.join("");
}

/** SSE: Program page — overview, progressions, routines, foundations, resources, BODi */
export async function handleProgramSSE(env: Env, userId: string): Promise<Response> {
  let program: Program;
  let user: Awaited<ReturnType<typeof getUser>>;
  let allPrograms: Awaited<ReturnType<typeof getPrograms>>;
  try {
    const [loaded, userRow, programRows] = await Promise.all([
      loadProgram(env.DB, userId),
      getUser(env.DB, userId),
      getPrograms(env.DB, userId),
    ]);
    program = loaded.program;
    user = userRow;
    allPrograms = programRows;
  } catch {
    return sseResponse(
      patchElements(`<div class="card"><p style="color:var(--text-secondary)">No active program. Upload a program to get started.</p></div>`, {
        selector: "#content", mode: "inner",
      })
    );
  }
  const fragments: string[] = [];
  let isFirst = true;

  const addFragment = (html: string) => {
    fragments.push(patchElements(html, { selector: "#content", mode: isFirst ? "inner" : "append" }));
    isFirst = false;
  };

  const week = user ? currentWeek(user.start_date) : null;

  // Program Library section — always shown first (only when > 1 program exists)
  if (allPrograms.length > 1) {
    addFragment(programLibrarySection(allPrograms));
  }

  addFragment(programOverview(program, user, week));

  if (program.progressions.length > 0) {
    addFragment(progressionsSection(program.progressions, week));
  }

  addFragment(routinesSection(program));

  if (program.foundations && program.foundations.length > 0) {
    addFragment(foundationsSection(program.foundations));
  }

  if (program.resources && program.resources.length > 0) {
    addFragment(resourcesSection(program.resources));
  }

  if (program.bodi && program.bodi.length > 0) {
    addFragment(bodiSection(program.bodi));
  }

  // Import section — always shown at the bottom of the Program page
  addFragment(importProgramSection());

  return sseResponse(mergeFragments(fragments));
}
