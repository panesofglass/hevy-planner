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
  markQueueItemCompleted,
  markQueueItemCompletedForUser,
  updateQueueItemHevyRoutineId,
  getExerciseTemplateMappings,
  upsertExerciseTemplateMapping,
  getRoutineMappings,
  upsertRoutineMapping,
  bulkSetQueueItemRoutineIds,
  insertProgram,
  getActiveProgram,
} from "./storage/queries";
import { generatePlaylist, getNextRoutine, getCompletedRoutines } from "./domain/queue";
import { computeUpcoming } from "./domain/reflow";
import { buildRoutinePayload, matchCompletions, autoMatchExercises, computeFolderAssignments, reconcileRoutines } from "./domain/hevy-sync";
import { mapToHevyEnums } from "./domain/hevy-enums";
import { currentWeek, findActiveProgression } from "./domain/schedule";
import { validateProgram } from "./validation/validate-program";
import { HevyClient } from "./hevy/client";
import { htmlShell } from "./fragments/layout";
import { carsCard, heroRoutineCard, completedSection, upcomingSection } from "./fragments/today";
import { routineDetailPage } from "./fragments/routine-detail";
import { skillCards, roadmapSection, benchmarksSection } from "./fragments/progress";
import { setupPage, templateSelectionFragment } from "./fragments/setup";
import { programOverview, progressionsSection, routinesSection, foundationsSection, resourcesSection, bodiSection } from "./fragments/program";
import type { Program } from "./types";
import { escapeHtml } from "./utils/html";

import defaultProgramJson from "../programs/mobility-joint-restoration.json";

const APP_NAME = "Hevy Planner";

export interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
  CF_ACCESS_AUD?: string;
}

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
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
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const auth = await getAuthenticatedUserOrDev(request, env);
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;

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
          return await handleTodaySSE(env, auth.userId);
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

      // ── POST /api/setup/:templateId ─────────────────────────────
      const setupMatch = path.match(/^\/api\/setup\/([^/]+)$/);
      if (method === "POST" && (path === "/api/setup" || setupMatch)) {
        const urlTemplateId = setupMatch ? decodeURIComponent(setupMatch[1]) : undefined;
        return await handleSetup(request, env, auth.userId, urlTemplateId);
      }

      // ── POST /api/push-hevy/:id ────────────────────────────────
      const pushMatch = path.match(/^\/api\/push-hevy\/([^/]+)$/);
      if (method === "POST" && pushMatch) {
        const routineId = decodeURIComponent(pushMatch[1]);
        return await handlePush(env, auth.userId, routineId);
      }

      // ── POST /api/pull ─────────────────────────────────────────
      if (method === "POST" && path === "/api/pull") {
        return await handlePull(env, auth.userId);
      }

      // ── POST /api/cleanup-routines ───────────────────────────────
      if (method === "POST" && path === "/api/cleanup-routines") {
        return await handleCleanupRoutines(env, auth.userId);
      }

      // ── POST /api/complete/:id ─────────────────────────────────
      const completeMatch = path.match(/^\/api\/complete\/([^/]+)$/);
      if (method === "POST" && completeMatch) {
        const itemId = parseInt(completeMatch[1], 10);
        return await handleManualComplete(env, auth.userId, itemId);
      }

      // ── 404 ────────────────────────────────────────────────────
      return new Response("Not Found", { status: 404 });
    } catch (err) {
      if (err instanceof Response) return err;
      const message = err instanceof Error ? err.message : "Internal Server Error";
      const stack = err instanceof Error ? err.stack : "";
      console.error("Unhandled error:", message, stack);
      return new Response(message, { status: 500 });
    }
  },
};

// ──────────────────────────────────────────────────────────────────
// Route handlers
// ──────────────────────────────────────────────────────────────────

/** POST /api/validate-program — validate uploaded JSON, return template cards */
async function handleValidateProgram(request: Request): Promise<Response> {
  const body = (await request.json()) as Record<string, unknown>;
  // Fall back to bundled default program if none uploaded
  const programJsonStr = (body.programJson as string | undefined) || JSON.stringify(defaultProgramJson);

  let parsed: unknown;
  try {
    parsed = JSON.parse(programJsonStr);
  } catch {
    return sseResponse(
      patchElements(
        `<div class="card"><p style="color:var(--orange)">Invalid JSON file.</p></div>`,
        { selector: "#validation-result", mode: "inner" }
      )
    );
  }

  const result = validateProgram(parsed);
  if (!result.valid) {
    const errorList = result.errors
      .map((e) => `<li>${escapeHtml(e)}</li>`)
      .join("");
    return sseResponse(
      patchElements(
        `<div class="card"><p style="color:var(--orange)">Validation errors:</p><ul style="margin:8px 0 0 16px;font-size:13px;color:var(--text-secondary)">${errorList}</ul></div>`,
        { selector: "#validation-result", mode: "inner" }
      )
    );
  }

  return sseResponse(
    patchElements(templateSelectionFragment(result.program.weekTemplates), {
      selector: "#validation-result",
      mode: "inner",
    })
  );
}

/** SSE: Today page — CARs card, hero session, completed, upcoming */
async function handleTodaySSE(env: Env, userId: string): Promise<Response> {
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
  const today = todayString();

  // Look up routine mappings for deep links
  const routineMappings = await getRoutineMappings(env.DB, userId);
  const routineToHevyId = new Map(
    routineMappings.map((m) => [m.program_routine_id, m.hevy_routine_id])
  );

  const fragments: string[] = [];

  if (dailyRoutine) {
    fragments.push(patchElements(carsCard(dailyRoutine, routineToHevyId.get(dailyRoutine.id)), { selector: "#content", mode: "inner" }));
  }

  // Hero session card — next pending
  const nextItem = getNextRoutine(items);
  if (nextItem) {
    const routine = routineMap.get(nextItem.routine_id);
    if (routine) {
      fragments.push(
        patchElements(heroRoutineCard(routine, nextItem), { selector: "#content", mode: "append" })
      );
    }
  }

  // Completed today
  const completed = getCompletedRoutines(items, today);
  if (completed.length > 0) {
    const completedData = completed.map((item) => ({
      title: routineMap.get(item.routine_id)?.title ?? item.routine_id,
    }));
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
async function handleSetup(request: Request, env: Env, userId: string, urlTemplateId?: string): Promise<Response> {
  let body: { apiKey?: string; startDate?: string; templateId?: string; programJson?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // Body may be empty — that's OK, template ID comes from URL
  }

  const templateId = urlTemplateId ?? body.templateId;
  const startDate = body.startDate || todayString();
  const apiKey = body.apiKey || undefined;
  // Fall back to bundled default program if none uploaded
  const programJsonStr = body.programJson || JSON.stringify(defaultProgramJson);

  if (!templateId) {
    return new Response("Template ID is required", { status: 400 });
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
    return new Response("Invalid program JSON", { status: 400 });
  }

  const template = program.weekTemplates.find((t) => t.id === templateId);
  if (!template) {
    return new Response("Invalid template ID", { status: 400 });
  }

  // Validate API key against Hevy before proceeding
  if (apiKey) {
    try {
      const client = new HevyClient(apiKey);
      await client.getExerciseTemplates(1, 1);
    } catch {
      return sseResponse(
        patchElements(
          `<div class="card"><p style="color:var(--orange)">Invalid Hevy API key. Check your key in Hevy Settings &gt; Developer and try again.</p></div>`,
          { selector: "#content", mode: "prepend" }
        )
      );
    }
  }

  // h. Upsert user (must exist before program insert due to FK constraint)
  await upsertUser(env.DB, {
    id: userId,
    active_program: program.meta.title,
    template_id: templateId,
    start_date: startDate,
    hevy_api_key: apiKey,
  });

  // a. Store program in D1
  await insertProgram(env.DB, userId, programJsonStr);

  // b-g. Hevy exercise template & routine creation (only with API key)
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

    // e. Save all exercise template mappings
    for (const [programTemplateId, hevyTemplateId] of matched) {
      await upsertExerciseTemplateMapping(env.DB, {
        user_id: userId,
        program_template_id: programTemplateId,
        hevy_template_id: hevyTemplateId,
        is_custom: customCreated.has(programTemplateId) ? 1 : 0,
      });
    }

    // f. Create or update Hevy routines with folder grouping + dedup
    const allMappings = await getExerciseTemplateMappings(env.DB, userId);
    const existingRoutineMappings = await getRoutineMappings(env.DB, userId);
    const existingMappingsMap = new Map(
      existingRoutineMappings.map((m) => [m.program_routine_id, m.hevy_routine_id])
    );

    // Compute folder assignments and create/find folders
    const folderAssignments = computeFolderAssignments(program.routines, program.meta.title);
    const uniqueFolderNames = [...new Set(folderAssignments.map((a) => a.folderName))];
    const folderNameToId = new Map<string, number>();
    for (const name of uniqueFolderNames) {
      const folder = await client.getOrCreateRoutineFolder(name);
      folderNameToId.set(name, folder.id);
    }

    // Fetch existing Hevy routines for dedup by title+folder
    const existingHevyRoutines = await client.getAllRoutines();

    // Reconcile: decide create vs update for each routine
    const reconciliations = reconcileRoutines(
      folderAssignments, existingHevyRoutines, folderNameToId, existingMappingsMap
    );

    for (const recon of reconciliations) {
      const routine = program.routines.find((r) => r.id === recon.programRoutineId)!;
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

    // g. Save all routine mappings
    for (const [programRoutineId, hevyRoutineId] of routineIdMap) {
      await upsertRoutineMapping(env.DB, {
        user_id: userId,
        program_routine_id: programRoutineId,
        hevy_routine_id: hevyRoutineId,
      });
    }
  }

  // i. Generate queue playlist
  const weeks = program.meta.durationWeeks || 8;
  const playlist = generatePlaylist(template, program.routines, weeks);
  if (playlist.length > 0) {
    await insertQueueItems(env.DB, userId, playlist);
  }

  // j. Bulk-set hevy_routine_id on queue items via routine_mappings
  if (apiKey) {
    await bulkSetQueueItemRoutineIds(env.DB, userId, routineIdMap);
  }

  // k. Redirect to Today
  return sseResponse(executeScript("window.location.href = '/'"));
}

/** POST /api/push-hevy/:id — open routine in Hevy (uses existing mapping from setup) */
async function handlePush(env: Env, userId: string, routineId: string): Promise<Response> {
  const user = await getUser(env.DB, userId);
  if (!user || !user.hevy_api_key) {
    return sseResponse(
      patchElements(`<div class="card"><p>Connect your Hevy API key first.</p></div>`, {
        selector: "#content",
        mode: "inner",
      })
    );
  }

  // Look up existing routine mapping from setup
  const routineMappings = await getRoutineMappings(env.DB, userId);
  const mapping = routineMappings.find((m) => m.program_routine_id === routineId);

  if (mapping) {
    // Routine already exists in Hevy — open it directly
    return sseResponse(
      executeScript(`window.open('https://hevy.com/routine/${mapping.hevy_routine_id}', '_blank')`)
    );
  }

  // Fallback: no mapping exists (edge case — setup didn't create this routine)
  const program = await loadProgram(env.DB, userId);
  const routine = program.routines.find((r) => r.id === routineId);
  if (!routine) {
    return new Response("Routine not found", { status: 404 });
  }

  const client = new HevyClient(user.hevy_api_key);

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
    return sseResponse(
      patchElements(
        `<div class="card"><p style="color:var(--orange)">Cannot push: no exercises could be mapped to Hevy templates. ${payload.unmapped.length} unmapped exercise(s).</p></div>`,
        { selector: "#content", mode: "prepend" }
      )
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
      executeScript(`window.open('https://hevy.com/routine/${created.id}', '_blank')`)
    );
  } catch (err) {
    const msg = escapeHtml(err instanceof Error ? err.message : "Push failed");
    return sseResponse(
      patchElements(
        `<div class="card"><p style="color:var(--orange)">${msg}</p></div>`,
        { selector: "#content", mode: "prepend" }
      )
    );
  }
}

/** POST /api/cleanup-routines — delete duplicate routines from Hevy */
async function handleCleanupRoutines(env: Env, userId: string): Promise<Response> {
  const user = await getUser(env.DB, userId);
  if (!user || !user.hevy_api_key) {
    return sseResponse(
      patchElements(`<div class="card"><p>Connect your Hevy API key first.</p></div>`, {
        selector: "#content",
        mode: "prepend",
      })
    );
  }

  const client = new HevyClient(user.hevy_api_key);
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

/** POST /api/pull — pull completions from Hevy */
async function handlePull(env: Env, userId: string): Promise<Response> {
  const user = await getUser(env.DB, userId);
  if (!user || !user.hevy_api_key) {
    return sseResponse(
      patchElements(`<div class="card"><p>Connect your Hevy API key first.</p></div>`, {
        selector: "#content",
        mode: "inner",
      })
    );
  }

  const program = await loadProgram(env.DB, userId);
  const routineMap = new Map(program.routines.map((r) => [r.id, r]));
  const client = new HevyClient(user.hevy_api_key);

  try {
    const [workouts, items] = await Promise.all([
      client.getRecentWorkouts(),
      getQueueItems(env.DB, userId),
    ]);
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
      workouts,
      (w) => nameToRoutineId.get(w.name) ?? null
    );

    const today = todayString();
    for (const match of matches) {
      await markQueueItemCompleted(env.DB, match.queueItemId, today, match.workoutId);
    }

    // Re-render today page
    return await handleTodaySSE(env, userId);
  } catch (err) {
    const msg = escapeHtml(err instanceof Error ? err.message : "Pull failed");
    return sseResponse(
      patchElements(
        `<div class="card"><p style="color:var(--orange)">${msg}</p></div>`,
        { selector: "#content", mode: "prepend" }
      )
    );
  }
}

/** POST /api/complete/:id — manual complete, re-render today */
async function handleManualComplete(
  env: Env,
  userId: string,
  itemId: number
): Promise<Response> {
  if (!Number.isInteger(itemId)) {
    return new Response("Invalid item ID", { status: 400 });
  }
  const today = todayString();
  await markQueueItemCompletedForUser(env.DB, itemId, userId, today);
  return await handleTodaySSE(env, userId);
}
