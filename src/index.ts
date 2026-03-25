// ──────────────────────────────────────────────────────────────────
// Worker entry point — router with content negotiation
// ──────────────────────────────────────────────────────────────────

import { getAuthenticatedUserOrDev } from "./auth/access";
import {
  executeScript,
  isSSERequest,
  mergeFragments,
  patchElements,
  sseResponse,
} from "./sse/helpers";
import {
  getUser,
  upsertUser,
  getQueueItems,
  insertQueueItems,
  batchMarkQueueItemsCompleted,
  markQueueItemCompletedForUser,
  updateQueueItemHevyRoutineId,
  getExerciseTemplateMappings,
  upsertExerciseTemplateMapping,
  getRoutineMappings,
  upsertRoutineMapping,
  bulkSetQueueItemRoutineIds,
  insertProgram,
  getActiveProgram,
  updateDailyCompleted,
  updateWebhookState,
  clearWebhookState,
  updateLastSyncAt,
  getUserByWebhookToken,
  clearPendingStateForUser,
  updateUserProgram,
} from "./storage/queries";
import { generatePlaylist, getNextRoutine, getCompletedRoutines } from "./domain/queue";
import { computeUpcoming } from "./domain/reflow";
import { buildRoutinePayload, matchCompletions, autoMatchExercises, computeFolderAssignments, reconcileRoutines } from "./domain/hevy-sync";
import { mapToHevyEnums } from "./domain/hevy-enums";
import { currentWeek, findActiveProgression } from "./domain/schedule";
import { validateProgram } from "./validation/validate-program";
import { HevyClient } from "./hevy/client";
import { htmlShell } from "./fragments/layout";
import { carsCard, heroRoutineCard, completedSection, upcomingSection, syncButton } from "./fragments/today";
import { routineDetailPage } from "./fragments/routine-detail";
import { skillCards, roadmapSection, benchmarksSection } from "./fragments/progress";
import { setupPage, templateSelectionFragment } from "./fragments/setup";
import { programOverview, progressionsSection, routinesSection, foundationsSection, resourcesSection, bodiSection, importProgramSection, importTemplateSelectionFragment } from "./fragments/program";
import type { Program } from "./types";
import { escapeHtml } from "./utils/html";
import { todayString, toLocalDate } from "./utils/date";
import { getDecryptedApiKey } from "./storage/api-key";
import { encryptAesGcm } from "./utils/crypto";

import defaultProgramJson from "../programs/mobility-joint-restoration.json";

const APP_NAME = "Hevy Planner";

export interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
  CF_ACCESS_AUD?: string;
  /** AES-256 key in hex (64 chars). Set via `wrangler secret put ENCRYPTION_KEY`. */
  ENCRYPTION_KEY: string;
}

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────

/**
 * Return an SSE response that patches an error card into the given selector.
 * Always HTML-escapes the message, so callers should pass the raw string.
 */
function sseErrorCard(
  msg: string,
  selector = "#content",
  mode: "inner" | "prepend" | "append" = "prepend"
): Response {
  return sseResponse(
    patchElements(
      `<div class="card"><p style="color:var(--orange)">${escapeHtml(msg)}</p></div>`,
      { selector, mode }
    )
  );
}

/** Load the subtitle from the active program, or undefined on failure. */
async function loadSubtitle(db: D1Database, userId: string): Promise<string | undefined> {
  try {
    const prog = await loadProgram(db, userId);
    return prog.meta.subtitle;
  } catch {
    return undefined;
  }
}

/** Load the active program from D1 for a given user. */
async function loadProgram(db: D1Database, userId: string): Promise<Program> {
  const row = await getActiveProgram(db, userId);
  if (!row) throw new Error("No active program found");
  return JSON.parse(row.json_data) as Program;
}

function htmlResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
      "vary": "Accept",
    },
  });
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function redirect(location: string, status = 303): Response {
  return new Response(null, { status, headers: { location } });
}

// ──────────────────────────────────────────────────────────────────
// Router
// ──────────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;

      // ── POST /api/webhooks/hevy ────────────────────────────────
      // Must be checked before auth — this comes from Hevy, not the app user
      if (method === "POST" && path === "/api/webhooks/hevy") {
        return await handleWebhookEvent(request, env, ctx);
      }

      const auth = await getAuthenticatedUserOrDev(request, env);
      const tz = (request.cf as Record<string, unknown> | undefined)?.timezone as string | undefined;

      // ── GET /programs/default.json ─────────────────────────────
      if (method === "GET" && path === "/programs/default.json") {
        return new Response(JSON.stringify(defaultProgramJson, null, 2), {
          headers: {
            "content-type": "application/json",
            "content-disposition": 'attachment; filename="default-program.json"',
          },
        });
      }

      // ── GET / ──────────────────────────────────────────────────
      if (method === "GET" && path === "/") {
        const user = await getUser(env.DB, auth.userId);
        if (!user) {
          return htmlResponse(
            htmlShell({
              title: APP_NAME,
              subtitle: "Setup",
              body: `<div id="content">${setupPage()}</div>`,
            })
          );
        }

        if (isSSERequest(request)) {
          return await handleTodaySSE(env, auth.userId, tz);
        }

        const subtitle = await loadSubtitle(env.DB, auth.userId);
        return htmlResponse(
          htmlShell({
            title: APP_NAME,
            subtitle,
            activeTab: "today",
            ssePath: "/",
          })
        );
      }

      // ── GET /progress ──────────────────────────────────────────
      if (method === "GET" && path === "/progress") {
        if (isSSERequest(request)) {
          return await handleProgressSSE(env, auth.userId);
        }

        const subtitle = await loadSubtitle(env.DB, auth.userId);
        return htmlResponse(
          htmlShell({
            title: "Progress",
            subtitle,
            activeTab: "progress",
            ssePath: "/progress",
          })
        );
      }

      // ── GET /program ──────────────────────────────────────────
      if (method === "GET" && path === "/program") {
        if (isSSERequest(request)) {
          return await handleProgramSSE(env, auth.userId);
        }

        const subtitle = await loadSubtitle(env.DB, auth.userId);
        return htmlResponse(
          htmlShell({
            title: "Program",
            subtitle,
            activeTab: "program",
            ssePath: "/program",
          })
        );
      }

      // ── GET /routine/:id ──────────────────────────────────────
      const routineMatch = path.match(/^\/routine\/([^/]+)$/);
      if (method === "GET" && routineMatch) {
        const routineId = decodeURIComponent(routineMatch[1]);

        if (isSSERequest(request)) {
          return await handleRoutineSSE(env, auth.userId, routineId);
        }

        return htmlResponse(
          htmlShell({
            title: "Routine",
            activeTab: "today",
            ssePath: `/routine/${encodeURIComponent(routineId)}`,
          })
        );
      }

      // ── POST /api/validate-program ─────────────────────────────
      if (method === "POST" && path === "/api/validate-program") {
        return await handleValidateProgram(request);
      }

      // ── POST /api/validate-import-program ──────────────────────
      if (method === "POST" && path === "/api/validate-import-program") {
        return await handleValidateImportProgram(request);
      }

      // ── POST /api/import-program ────────────────────────────────
      if (method === "POST" && path === "/api/import-program") {
        return await handleImportProgram(request, env, auth.userId, tz);
      }

      // ── POST /api/setup/:templateId ─────────────────────────────
      const setupMatch = path.match(/^\/api\/setup\/([^/]+)$/);
      if (method === "POST" && (path === "/api/setup" || setupMatch)) {
        const urlTemplateId = setupMatch ? decodeURIComponent(setupMatch[1]) : undefined;
        return await handleSetup(request, env, auth.userId, urlTemplateId, tz);
      }

      // ── POST /api/push-hevy/:id ────────────────────────────────
      const pushMatch = path.match(/^\/api\/push-hevy\/([^/]+)$/);
      if (method === "POST" && pushMatch) {
        const routineId = decodeURIComponent(pushMatch[1]);
        return await handlePush(env, auth.userId, routineId);
      }

      // ── POST /api/pull ─────────────────────────────────────────
      if (method === "POST" && path === "/api/pull") {
        return await handlePull(env, auth.userId, tz);
      }

      // ── POST /api/cleanup-routines ───────────────────────────────
      if (method === "POST" && path === "/api/cleanup-routines") {
        return await handleCleanupRoutines(env, auth.userId);
      }

      // ── POST /api/complete/:id ─────────────────────────────────
      const completeMatch = path.match(/^\/api\/complete\/([^/]+)$/);
      if (method === "POST" && completeMatch) {
        const itemId = parseInt(completeMatch[1], 10);
        return await handleManualComplete(env, auth.userId, itemId, tz);
      }

      // ── POST /api/webhooks/register ────────────────────────────
      if (method === "POST" && path === "/api/webhooks/register") {
        return await handleWebhookRegister(request, env, auth.userId, tz);
      }

      // ── POST /api/webhooks/unregister ──────────────────────────
      if (method === "POST" && path === "/api/webhooks/unregister") {
        return await handleWebhookUnregister(env, auth.userId, tz);
      }

      // ── 404 ────────────────────────────────────────────────────
      return new Response("Not Found", { status: 404 });
    } catch (err) {
      if (err instanceof Response) return err;
      console.error("Unhandled error:", err instanceof Error ? err.message : err, err instanceof Error ? err.stack : "");
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};

// ──────────────────────────────────────────────────────────────────
// Route handlers
// ──────────────────────────────────────────────────────────────────

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
function validateAndRespond(
  programJsonStr: string | undefined,
  selector: string,
  renderTemplates: (templates: import("./types").WeekTemplate[]) => string,
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
async function handleValidateProgram(request: Request): Promise<Response> {
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

/** SSE: Today page — CARs card, hero session, completed, upcoming */
async function handleTodaySSE(env: Env, userId: string, tz?: string): Promise<Response> {
  const user = await getUser(env.DB, userId);
  if (!user) {
    return sseResponse(
      patchElements(setupPage(), { selector: "#content", mode: "inner" })
    );
  }

  const program = await loadProgram(env.DB, userId);
  const routineMap = new Map(program.routines.map((r) => [r.id, r]));
  const dailyRoutine = program.routines.find((r) => r.isDaily);

  const items = await getQueueItems(env.DB, userId);
  const today = todayString(tz);

  // Look up routine mappings for deep links
  const routineMappings = await getRoutineMappings(env.DB, userId);
  const routineToHevyId = new Map(
    routineMappings.map((m) => [m.program_routine_id, m.hevy_routine_id])
  );

  const fragments: string[] = [];

  const dailyDoneToday = dailyRoutine && user.daily_completed_date === today;

  if (dailyRoutine && !dailyDoneToday) {
    fragments.push(patchElements(carsCard(dailyRoutine, routineToHevyId.get(dailyRoutine.id)), { selector: "#content", mode: "inner" }));
  }

  // Hero session card — next pending
  const nextItem = getNextRoutine(items);
  if (nextItem) {
    const routine = routineMap.get(nextItem.routine_id);
    if (routine) {
      const mode = (dailyRoutine && !dailyDoneToday) ? "append" : "inner";
      fragments.push(
        patchElements(heroRoutineCard(routine, nextItem), { selector: "#content", mode })
      );
    }
  }

  // Completed today
  const completed = getCompletedRoutines(items, today);
  const completedData = completed.map((item) => ({
    title: routineMap.get(item.routine_id)?.title ?? item.routine_id,
    hevy_workout_data: item.hevy_workout_data,
  }));
  if (dailyDoneToday) {
    completedData.unshift({ title: dailyRoutine.title, hevy_workout_data: null });
  }
  if (completedData.length > 0) {
    fragments.push(
      patchElements(completedSection(completedData), { selector: "#content", mode: "append" })
    );
  }

  // Upcoming (next 5 sessions)
  const template = program.weekTemplates.find((t) => t.id === user.template_id);
  if (template) {
    const pendingItems = items.filter((i) => i.status === "pending").sort((a, b) => a.position - b.position);
    // Skip the first pending (already shown as hero) for upcoming
    const upcomingPending = pendingItems.slice(1);
    const upcoming = computeUpcoming(upcomingPending, template, program.routines, 5);
    if (upcoming.length > 0) {
      fragments.push(
        patchElements(upcomingSection(upcoming), { selector: "#content", mode: "append" })
      );
    }
  }

  // Sync button at the bottom
  fragments.push(
    patchElements(syncButton(user.webhook_id, user.last_sync_at, tz), { selector: "#content", mode: "append" })
  );

  return sseResponse(mergeFragments(fragments));
}

/** SSE: Progress page — skills, roadmap, benchmarks */
async function handleProgressSSE(env: Env, userId: string): Promise<Response> {
  const program = await loadProgram(env.DB, userId);
  const fragments: string[] = [];
  let isFirst = true;

  const addFragment = (html: string) => {
    fragments.push(patchElements(html, { selector: "#content", mode: isFirst ? "inner" : "append" }));
    isFirst = false;
  };

  if (program.skills && program.skills.length > 0) {
    addFragment(skillCards(program.skills));
  }

  if (program.roadmap && program.roadmap.length > 0) {
    addFragment(roadmapSection(program.roadmap));
  }

  if (program.benchmarks && program.benchmarks.length > 0) {
    addFragment(benchmarksSection(program.benchmarks));
  }

  return sseResponse(mergeFragments(fragments));
}

/** SSE: Program page — overview, progressions, routines, foundations, resources, BODi */
async function handleProgramSSE(env: Env, userId: string): Promise<Response> {
  let program: Program;
  let user: Awaited<ReturnType<typeof getUser>>;
  try {
    [program, user] = await Promise.all([
      loadProgram(env.DB, userId),
      getUser(env.DB, userId),
    ]);
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

/** SSE: Routine detail — exercise list with coaching context */
async function handleRoutineSSE(env: Env, userId: string, routineId: string): Promise<Response> {
  const program = await loadProgram(env.DB, userId);
  const routine = program.routines.find((r) => r.id === routineId);
  if (!routine) {
    return sseResponse(
      patchElements(`<p>Routine not found.</p>`, { selector: "#content", mode: "inner" })
    );
  }

  // Look up user to determine current progression from start_date
  const user = await getUser(env.DB, userId);
  const week = user ? currentWeek(user.start_date) : null;
  const currentProgression = week != null
    ? findActiveProgression(week, program.progressions)
    : program.progressions[0];

  const html = routineDetailPage(routine, program.exerciseTemplates, currentProgression);
  return sseResponse(
    patchElements(html, { selector: "#content", mode: "inner" })
  );
}

/** POST /api/setup — store program, sync Hevy, create user, generate queue */
async function handleSetup(request: Request, env: Env, userId: string, urlTemplateId?: string, tz?: string): Promise<Response> {
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

/**
 * Activate a program: clear old pending queue and mappings, store in D1,
 * sync to Hevy (exercise templates + routines), then generate queue.
 * Reused by both initial setup (handleSetup) and program import (handleImportProgram).
 */
async function activateProgram(
  db: D1Database,
  userId: string,
  program: Program,
  programJsonStr: string,
  templateId: string,
  apiKey: string | undefined
): Promise<void> {
  const template = program.weekTemplates.find((t) => t.id === templateId);
  if (!template) throw new Error(`Week template "${templateId}" not found in program`);

  // 1. Clear existing pending queue items and mappings atomically (preserve completed history)
  await clearPendingStateForUser(db, userId);

  // 2. Insert program (deactivates previous via batch in insertProgram)
  await insertProgram(db, userId, programJsonStr);

  // 3. Hevy exercise template & routine creation (only with API key)
  const routineIdMap = new Map<string, string>();
  if (apiKey) {
    const client = new HevyClient(apiKey);

    // b. Fetch all Hevy exercise templates
    const hevyTemplates = await client.getAllExerciseTemplates();

    // c. Auto-match our templates to Hevy's by normalized title
    const matched = autoMatchExercises(program.exerciseTemplates, hevyTemplates);

    // d. Create custom Hevy exercise templates for unmatched
    const customCreated = new Set<string>();
    for (const et of program.exerciseTemplates) {
      if (!matched.has(et.id)) {
        const enums = mapToHevyEnums(et);
        const created = await client.createExerciseTemplate({
          title: et.title,
          exercise_type: enums.exerciseType,
          equipment_category: enums.equipmentCategory,
          muscle_group: enums.primaryMuscleGroup,
          other_muscles: enums.secondaryMuscleGroups,
        });
        matched.set(et.id, created.id);
        customCreated.add(et.id);
      }
    }

    // e. Save all exercise template mappings (batched)
    if (matched.size > 0) {
      const upsertTemplateStmt = db.prepare(
        `INSERT INTO exercise_template_mappings (user_id, program_template_id, hevy_template_id, is_custom)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id, program_template_id) DO UPDATE SET
           hevy_template_id = excluded.hevy_template_id,
           is_custom = excluded.is_custom`
      );
      await db.batch(
        [...matched.entries()].map(([programTemplateId, hevyTemplateId]) =>
          upsertTemplateStmt.bind(
            userId,
            programTemplateId,
            hevyTemplateId,
            customCreated.has(programTemplateId) ? 1 : 0
          )
        )
      );
    }

    // f. Create or update Hevy routines with folder grouping + dedup
    const allMappings = await getExerciseTemplateMappings(db, userId);
    const existingRoutineMappings = await getRoutineMappings(db, userId);
    const existingMappingsMap = new Map(
      existingRoutineMappings.map((m) => [m.program_routine_id, m.hevy_routine_id])
    );

    // Compute folder assignments and create/find folders
    const folderAssignments = computeFolderAssignments(program.routines, program.meta.title);
    const uniqueFolderNames = [...new Set(folderAssignments.map((a) => a.folderName))];
    const folderNameToId = new Map<string, number>();
    // Create folders in parallel, limited to 3 concurrent to avoid Hevy rate limits
    for (let i = 0; i < uniqueFolderNames.length; i += 3) {
      const batch = uniqueFolderNames.slice(i, i + 3);
      const results = await Promise.all(
        batch.map((name) => client.getOrCreateRoutineFolder(name))
      );
      for (let j = 0; j < batch.length; j++) {
        folderNameToId.set(batch[j], results[j].id);
      }
    }

    // Fetch existing Hevy routines for dedup by title+folder
    const existingHevyRoutines = await client.getAllRoutines();

    // Reconcile: decide create vs update for each routine
    const reconciliations = reconcileRoutines(
      folderAssignments, existingHevyRoutines, folderNameToId, existingMappingsMap
    );

    for (const recon of reconciliations) {
      const routine = program.routines.find((r) => r.id === recon.programRoutineId);
      if (!routine) continue;
      const payload = buildRoutinePayload(routine, allMappings);
      const folderId = folderNameToId.get(recon.folderName)!;

      if (recon.action === "update" && recon.existingHevyRoutineId) {
        await client.updateRoutine(recon.existingHevyRoutineId, {
          title: payload.title,
          exercises: payload.exercises,
        });
        routineIdMap.set(routine.id, recon.existingHevyRoutineId);
      } else {
        const created = await client.createRoutine({
          title: payload.title,
          folder_id: folderId,
          exercises: payload.exercises,
        });
        routineIdMap.set(routine.id, created.id);
      }
    }

    // g. Save all routine mappings (batched)
    if (routineIdMap.size > 0) {
      const upsertRoutineStmt = db.prepare(
        `INSERT INTO routine_mappings (user_id, program_routine_id, hevy_routine_id)
         VALUES (?, ?, ?)
         ON CONFLICT(user_id, program_routine_id) DO UPDATE SET
           hevy_routine_id = excluded.hevy_routine_id`
      );
      await db.batch(
        [...routineIdMap.entries()].map(([programRoutineId, hevyRoutineId]) =>
          upsertRoutineStmt.bind(userId, programRoutineId, hevyRoutineId)
        )
      );
    }
  }

  // 4. Generate queue playlist and insert items
  const weeks = program.meta.durationWeeks || 8;
  const playlist = generatePlaylist(template, program.routines, weeks);
  if (playlist.length > 0) {
    await insertQueueItems(db, userId, playlist);
  }

  // 5. Bulk-set hevy_routine_id on queue items via routine_mappings
  if (apiKey) {
    await bulkSetQueueItemRoutineIds(db, userId, routineIdMap);
  }
}

/** POST /api/validate-import-program — validate uploaded JSON for the import flow */
async function handleValidateImportProgram(request: Request): Promise<Response> {
  const body = (await request.json()) as Record<string, unknown>;
  // Datastar converts data-signals:import-program-json to importProgramJson
  const programJsonStr = body.importProgramJson as string | undefined;
  return validateAndRespond(programJsonStr, "#import-validation-result", importTemplateSelectionFragment);
}

/** POST /api/import-program — replace active program, re-sync Hevy, regenerate queue */
async function handleImportProgram(request: Request, env: Env, userId: string, tz?: string): Promise<Response> {
  // Datastar sends camelCase signal names: importProgramJson, importTemplateId
  let body: { importProgramJson?: string; importTemplateId?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return sseErrorCard("Invalid request body.", "#import-validation-result", "inner");
  }

  const { importProgramJson: programJsonStr, importTemplateId: templateId } = body;

  if (!programJsonStr) {
    return sseErrorCard("No program JSON provided.", "#import-validation-result", "inner");
  }

  if (!templateId) {
    return sseErrorCard("Template ID is required.", "#import-validation-result", "inner");
  }

  // Parse and validate program
  let program: Program;
  try {
    const parsed = JSON.parse(programJsonStr);
    const result = validateProgram(parsed);
    if (!result.valid) {
      return sseErrorCard(`Invalid program: ${result.errors.join(", ")}`, "#import-validation-result", "inner");
    }
    program = result.program;
  } catch {
    return sseErrorCard("Invalid program JSON.", "#import-validation-result", "inner");
  }

  if (!program.weekTemplates.find((t) => t.id === templateId)) {
    return sseErrorCard("Invalid template ID.", "#import-validation-result", "inner");
  }

  // Update user program fields and get existing (encrypted) API key in one pass, then decrypt
  const storedKey = await updateUserProgram(env.DB, userId, program.meta.title, templateId, todayString(tz));
  const apiKey = storedKey ? (await getDecryptedApiKey(env.DB, userId, env.ENCRYPTION_KEY)) ?? undefined : undefined;

  // Activate: clear old state, sync to Hevy, generate queue
  await activateProgram(env.DB, userId, program, programJsonStr, templateId, apiKey);

  // Re-render the Program page
  return await handleProgramSSE(env, userId);
}

/** POST /api/push-hevy/:id — open routine in Hevy (uses existing mapping from setup) */
async function handlePush(env: Env, userId: string, routineId: string): Promise<Response> {
  const user = await getUser(env.DB, userId);
  if (!user || !user.hevy_api_key) {
    return sseErrorCard("Connect your Hevy API key first.", "#content", "inner");
  }

  // Look up existing routine mapping from setup
  const routineMappings = await getRoutineMappings(env.DB, userId);
  const mapping = routineMappings.find((m) => m.program_routine_id === routineId);

  if (mapping) {
    // Routine already exists in Hevy — open it directly
    return sseResponse(
      executeScript(`window.open('https://hevy.com/routine/' + ${JSON.stringify(mapping.hevy_routine_id)}, '_blank')`)
    );
  }

  // Fallback: no mapping exists (edge case — setup didn't create this routine)
  const program = await loadProgram(env.DB, userId);
  const routine = program.routines.find((r) => r.id === routineId);
  if (!routine) {
    return new Response("Routine not found", { status: 404 });
  }

  const apiKey = await getDecryptedApiKey(env.DB, userId, env.ENCRYPTION_KEY);
  if (!apiKey) {
    return sseErrorCard("Connect your Hevy API key first.", "#content", "inner");
  }
  const client = new HevyClient(apiKey);

  // Get or auto-create exercise template mappings
  let mappings = await getExerciseTemplateMappings(env.DB, userId);
  if (mappings.length === 0) {
    try {
      const hevyTemplates = await client.getAllExerciseTemplates();
      const autoMatched = autoMatchExercises(program.exerciseTemplates, hevyTemplates);

      for (const [programTemplateId, hevyTemplateId] of autoMatched) {
        await upsertExerciseTemplateMapping(env.DB, {
          user_id: userId,
          program_template_id: programTemplateId,
          hevy_template_id: hevyTemplateId,
          is_custom: 0,
        });
      }
      mappings = await getExerciseTemplateMappings(env.DB, userId);
    } catch {
      // If auto-match fails, continue with empty mappings
    }
  }

  const payload = buildRoutinePayload(routine, mappings);

  if (payload.exercises.length === 0) {
    return sseErrorCard(
      `Cannot push: no exercises could be mapped to Hevy templates. ${payload.unmapped.length} unmapped exercise(s).`
    );
  }

  try {
    const folder = await client.getOrCreateRoutineFolder(program.meta.title);
    const created = await client.createRoutine({
      title: payload.title,
      folder_id: folder.id,
      exercises: payload.exercises,
    });

    // Save the mapping so future pushes use the existing routine
    await upsertRoutineMapping(env.DB, {
      user_id: userId,
      program_routine_id: routineId,
      hevy_routine_id: created.id,
    });

    // Also update the queue item if there is one
    const items = await getQueueItems(env.DB, userId);
    const queueItem = items.find(
      (i) => i.routine_id === routineId && i.status === "pending"
    );
    if (queueItem) {
      await updateQueueItemHevyRoutineId(env.DB, queueItem.id, created.id);
    }

    return sseResponse(
      executeScript(`window.open('https://hevy.com/routine/' + ${JSON.stringify(created.id)}, '_blank')`)
    );
  } catch (err) {
    return sseErrorCard(err instanceof Error ? err.message : "Push failed");
  }
}

/** POST /api/cleanup-routines — delete duplicate routines from Hevy */
async function handleCleanupRoutines(env: Env, userId: string): Promise<Response> {
  const user = await getUser(env.DB, userId);
  if (!user || !user.hevy_api_key) {
    return sseErrorCard("Connect your Hevy API key first.");
  }

  const apiKey = await getDecryptedApiKey(env.DB, userId, env.ENCRYPTION_KEY);
  if (!apiKey) {
    return sseErrorCard("Connect your Hevy API key first.");
  }
  const client = new HevyClient(apiKey);
  const allRoutines = await client.getAllRoutines();

  // Group by title+folder, find duplicates
  const byKey = new Map<string, typeof allRoutines>();
  for (const r of allRoutines) {
    const key = `${r.title}::${r.folder_id ?? "none"}`;
    const list = byKey.get(key) ?? [];
    list.push(r);
    byKey.set(key, list);
  }

  const toDelete: string[] = [];
  for (const [, routines] of byKey) {
    if (routines.length > 1) {
      // Keep the most recently updated, delete the rest
      routines.sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
      toDelete.push(...routines.slice(1).map((r) => r.id));
    }
  }

  let deleted = 0;
  let failed = 0;
  for (const id of toDelete) {
    try {
      await client.deleteRoutine(id);
      deleted++;
    } catch {
      failed++;
    }
  }

  const msg = toDelete.length === 0
    ? "No duplicates found."
    : `Cleaned up ${deleted} duplicate(s)${failed > 0 ? `, ${failed} failed` : ""}.`;

  return sseResponse(
    patchElements(
      `<div class="card"><p style="color:var(--green)">${escapeHtml(msg)}</p></div>`,
      { selector: "#content", mode: "prepend" }
    )
  );
}

/**
 * Core sync logic — fetch recent Hevy workouts, match to pending queue items,
 * mark completions, update daily CARs. Reused by both manual pull and webhook.
 * Updates last_sync_at on successful completion.
 */
async function performSync(db: D1Database, userId: string, apiKey: string, tz?: string): Promise<void> {
  const program = await loadProgram(db, userId);
  const routineMap = new Map(program.routines.map((r) => [r.id, r]));
  const client = new HevyClient(apiKey);

  const [workouts, items] = await Promise.all([
    client.getRecentWorkouts(),
    getQueueItems(db, userId),
  ]);

  // Skip workouts already matched to a completed queue item
  const usedWorkoutIds = new Set(
    items.filter((i) => i.hevy_workout_id).map((i) => i.hevy_workout_id)
  );
  const newWorkouts = workouts.filter((w) => !usedWorkoutIds.has(w.id));

  const pendingItems = items.filter((i) => i.status === "pending" && i.hevy_routine_id);

  const nameToRoutineId = new Map<string, string>();
  for (const item of pendingItems) {
    const routine = routineMap.get(item.routine_id);
    if (routine && item.hevy_routine_id) {
      nameToRoutineId.set(routine.title, item.hevy_routine_id);
    }
  }

  const matches = matchCompletions(
    pendingItems,
    newWorkouts,
    (w) => nameToRoutineId.get(w.title) ?? null
  );

  // Build workout ID → { date, exercisesJson } map for accurate completion dates
  const workoutInfo = new Map<string, { date: string; exercisesJson: string }>();
  for (const w of newWorkouts) {
    workoutInfo.set(w.id, {
      date: toLocalDate(w.start_time, tz),
      exercisesJson: JSON.stringify(w.exercises),
    });
  }

  // Batch-mark completions
  await batchMarkQueueItemsCompleted(
    db,
    matches.map((match) => {
      const info = workoutInfo.get(match.workoutId);
      return {
        itemId: match.queueItemId,
        completedDate: info?.date ?? todayString(tz),
        workoutId: match.workoutId,
        workoutData: info?.exercisesJson,
      };
    })
  );

  // Check for daily routine completion (use workout date, not sync date)
  const dailyRoutine = program.routines.find((r) => r.isDaily);
  if (dailyRoutine) {
    const dailyWorkout = workouts.find((w) => w.title === dailyRoutine.title);
    if (dailyWorkout) {
      await updateDailyCompleted(db, userId, toLocalDate(dailyWorkout.start_time, tz));
    }
  }

  await updateLastSyncAt(db, userId, new Date().toISOString());
}

/** POST /api/pull — pull completions from Hevy */
async function handlePull(env: Env, userId: string, tz?: string): Promise<Response> {
  const user = await getUser(env.DB, userId);
  if (!user || !user.hevy_api_key) {
    return sseErrorCard("Connect your Hevy API key first.", "#content", "inner");
  }

  try {
    const apiKey = await getDecryptedApiKey(env.DB, userId, env.ENCRYPTION_KEY);
    if (!apiKey) {
      return sseErrorCard("Connect your Hevy API key first.", "#content", "inner");
    }
    await performSync(env.DB, userId, apiKey, tz);
    return await handleTodaySSE(env, userId, tz);
  } catch (err) {
    return sseErrorCard(err instanceof Error ? err.message : "Pull failed");
  }
}

/** POST /api/webhooks/register — subscribe to Hevy webhooks for auto-sync */
async function handleWebhookRegister(
  request: Request,
  env: Env,
  userId: string,
  tz?: string
): Promise<Response> {
  const user = await getUser(env.DB, userId);
  if (!user || !user.hevy_api_key) {
    return sseErrorCard("Connect your Hevy API key first.");
  }

  try {
    const authToken = crypto.randomUUID();
    const webhookUrl = `${new URL(request.url).origin}/api/webhooks/hevy`;
    const apiKey = await getDecryptedApiKey(env.DB, userId, env.ENCRYPTION_KEY);
    if (!apiKey) {
      return sseErrorCard("Connect your Hevy API key first.");
    }
    const client = new HevyClient(apiKey);
    const sub = await client.createWebhookSubscription(webhookUrl, authToken);
    await updateWebhookState(env.DB, userId, sub.id, authToken);
    return await handleTodaySSE(env, userId, tz);
  } catch (err) {
    return sseErrorCard(err instanceof Error ? err.message : "Failed to enable auto-sync");
  }
}

/** POST /api/webhooks/unregister — remove Hevy webhook subscription */
async function handleWebhookUnregister(
  env: Env,
  userId: string,
  tz?: string
): Promise<Response> {
  const user = await getUser(env.DB, userId);
  if (!user) {
    return sseErrorCard("User not found.");
  }

  try {
    if (user.hevy_api_key && user.webhook_id) {
      const apiKey = await getDecryptedApiKey(env.DB, userId, env.ENCRYPTION_KEY);
      if (apiKey) {
        const client = new HevyClient(apiKey);
        await client.deleteWebhookSubscription(user.webhook_id);
      }
    }
    await clearWebhookState(env.DB, userId);
    return await handleTodaySSE(env, userId, tz);
  } catch (err) {
    return sseErrorCard(err instanceof Error ? err.message : "Failed to disable auto-sync");
  }
}

/** POST /api/webhooks/hevy — incoming event from Hevy (no app auth) */
async function handleWebhookEvent(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  // Extract auth token — Hevy sends it in the Authorization header as "Bearer <token>"
  // or as a plain token. Fall back to checking the request body.
  let authToken: string | null = null;
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    authToken = authHeader.replace(/^bearer\s+/i, "").trim();
  }

  if (!authToken) {
    // Try to extract from JSON body
    try {
      const body = await request.clone().json() as Record<string, unknown>;
      if (typeof body.auth_token === "string") {
        authToken = body.auth_token;
      }
    } catch {
      // Body not JSON or already consumed — ignore
    }
  }

  if (!authToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await getUserByWebhookToken(env.DB, authToken);
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Acknowledge immediately — Hevy expects a fast 2xx
  // Run sync in the background via waitUntil so the response is not delayed
  if (user.hevy_api_key) {
    ctx.waitUntil(
      getDecryptedApiKey(env.DB, user.id, env.ENCRYPTION_KEY).then((apiKey) => {
        if (!apiKey) return;
        return performSync(env.DB, user.id, apiKey, user.timezone ?? undefined).catch((err) => {
          console.error("Webhook sync failed:", err instanceof Error ? err.message : err);
        });
      })
    );
  }

  return new Response(null, { status: 204 });
}

/** POST /api/complete/:id — manual complete, re-render today */
async function handleManualComplete(
  env: Env,
  userId: string,
  itemId: number,
  tz?: string
): Promise<Response> {
  if (!Number.isInteger(itemId)) {
    return new Response("Invalid item ID", { status: 400 });
  }
  const today = todayString(tz);
  await markQueueItemCompletedForUser(env.DB, itemId, userId, today);
  return await handleTodaySSE(env, userId, tz);
}
