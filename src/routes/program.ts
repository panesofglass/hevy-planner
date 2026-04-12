import type { Env, WeekTemplate, Program } from "../types";
import type { SseEvent } from "../actor/session-actor";
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
 * Returns SseEvent[] for the DO to broadcast — either an error card
 * or the rendered template selection fragment.
 */
export function validateAndBuildEvents(
  programJsonStr: string | undefined,
  targetId: string,
  renderTemplates: (templates: WeekTemplate[]) => string,
  fallback?: string
): { ok: boolean; events: SseEvent[] } {
  const jsonStr = programJsonStr || fallback;
  if (!jsonStr) {
    return { ok: false, events: [{ type: "patch", html: `<div id="${targetId}"><div class="card"><p style="color:var(--orange)">No program JSON provided.</p></div></div>` }] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return { ok: false, events: [{ type: "patch", html: `<div id="${targetId}"><div class="card"><p style="color:var(--orange)">Invalid JSON file.</p></div></div>` }] };
  }

  const result = validateProgram(parsed);
  if (!result.valid) {
    const errorList = result.errors.map((e) => `<li>${escapeHtml(e)}</li>`).join("");
    return {
      ok: false,
      events: [{ type: "patch", html: `<div id="${targetId}"><div class="card"><p style="color:var(--orange)">Validation errors:</p><ul style="margin:8px 0 0 16px;font-size:13px;color:var(--text-secondary)">${errorList}</ul></div></div>` }],
    };
  }

  return {
    ok: true,
    events: [{ type: "patch", html: `<div id="${targetId}">${renderTemplates(result.program.weekTemplates)}</div>` }],
  };
}

/** POST /api/validate-program — validate uploaded JSON, broadcast template cards */
export async function handleValidateProgram(request: Request): Promise<{ events: SseEvent[]; status: number }> {
  const body = (await request.json()) as Record<string, unknown>;
  const programJsonStr = body.programJson as string | undefined;
  const result = validateAndBuildEvents(
    programJsonStr,
    "validation-result",
    templateSelectionFragment,
    JSON.stringify(defaultProgramJson)
  );
  return { events: result.events, status: result.ok ? 202 : 400 };
}

/** POST /api/validate-import-program — validate uploaded JSON for the import flow */
export async function handleValidateImportProgram(request: Request): Promise<{ events: SseEvent[]; status: number }> {
  const body = (await request.json()) as Record<string, unknown>;
  const programJsonStr = body.importProgramJson as string | undefined;
  const result = validateAndBuildEvents(programJsonStr, "import-validation-result", importTemplateSelectionFragment);
  return { events: result.events, status: result.ok ? 202 : 400 };
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

/** Build SseEvent[] for the Program page — used by the SessionActor DO on connect. */
export async function buildProgramEvents(db: D1Database, userId: string): Promise<SseEvent[]> {
  let program: Program;
  let user: Awaited<ReturnType<typeof getUser>>;
  let allPrograms: Awaited<ReturnType<typeof getPrograms>>;
  try {
    const [loaded, userRow, programRows] = await Promise.all([
      loadProgram(db, userId),
      getUser(db, userId),
      getPrograms(db, userId),
    ]);
    program = loaded.program;
    user = userRow;
    allPrograms = programRows;
  } catch {
    return [{ type: "patch", html: `<div id="content"><div class="card"><p style="color:var(--text-secondary)">No active program. Upload a program to get started.</p></div></div>` }];
  }

  const events: SseEvent[] = [];
  let firstEmitted = false;

  function emit(html: string): void {
    if (!firstEmitted) {
      events.push({ type: "patch", html: `<div id="content">${html}</div>` });
      firstEmitted = true;
    } else {
      events.push({ type: "append", target: "#content", html });
    }
  }

  const week = user ? currentWeek(user.start_date) : null;

  if (allPrograms.length > 1) {
    emit(programLibrarySection(allPrograms));
  }

  emit(programOverview(program, user, week));

  if (program.progressions.length > 0) {
    emit(progressionsSection(program.progressions, week));
  }

  emit(routinesSection(program));

  if (program.foundations && program.foundations.length > 0) {
    emit(foundationsSection(program.foundations));
  }

  if (program.resources && program.resources.length > 0) {
    emit(resourcesSection(program.resources));
  }

  if (program.bodi && program.bodi.length > 0) {
    emit(bodiSection(program.bodi));
  }

  emit(importProgramSection());

  return events;
}

