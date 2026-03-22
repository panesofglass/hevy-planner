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
  getExerciseMappings,
  upsertExerciseMapping,
} from "./storage/queries";
import { generatePlaylist, getNextSession, getCompletedSessions } from "./domain/queue";
import { computeUpcoming } from "./domain/reflow";
import { buildRoutinePayload, matchCompletions, autoMatchExercises } from "./domain/hevy-sync";
import { HevyClient } from "./hevy/client";
import { htmlShell } from "./fragments/layout";
import { carsCard, heroSessionCard, completedSection, upcomingSection } from "./fragments/today";
import { sessionDetailPage } from "./fragments/session-detail";
import { skillCards, roadmapSection, benchmarksSection } from "./fragments/progress";
import { setupPage } from "./fragments/setup";
import type { Program, Progression } from "./types";

import programJson from "../programs/mobility-joint-restoration.json";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const program = programJson as unknown as Program;
const APP_NAME = "Hevy Planner";

export interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
}

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Find the active progression based on start_date and current date. */
function getCurrentProgression(
  startDate: string,
  progressions: Progression[]
): Progression | undefined {
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const currentWeek = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;

  return progressions.find(
    (p) =>
      p.weekStart != null &&
      p.weekEnd != null &&
      currentWeek >= p.weekStart &&
      currentWeek <= p.weekEnd
  );
}

function htmlResponse(body: string): Response {
  return new Response(body, {
    headers: { "content-type": "text/html; charset=utf-8" },
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
      const auth = getAuthenticatedUserOrDev(request, env);
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;

      // ── GET / ──────────────────────────────────────────────────
      if (method === "GET" && path === "/") {
        const user = await getUser(env.DB, auth.userId);
        if (!user) {
          return htmlResponse(
            htmlShell({
              title: APP_NAME,
              subtitle: "Setup",
              body: `<div id="content">${setupPage(program.weekTemplates)}</div>`,
            })
          );
        }

        if (isSSERequest(request)) {
          return await handleTodaySSE(env, auth.userId);
        }

        return htmlResponse(
          htmlShell({
            title: APP_NAME,
            subtitle: program.meta.subtitle,
            activeTab: "today",
            ssePath: "/",
          })
        );
      }

      // ── GET /progress ──────────────────────────────────────────
      if (method === "GET" && path === "/progress") {
        if (isSSERequest(request)) {
          return handleProgressSSE();
        }

        return htmlResponse(
          htmlShell({
            title: "Progress",
            subtitle: program.meta.subtitle,
            activeTab: "progress",
            ssePath: "/progress",
          })
        );
      }

      // ── GET /session/:id ───────────────────────────────────────
      const sessionMatch = path.match(/^\/session\/([^/]+)$/);
      if (method === "GET" && sessionMatch) {
        const sessionId = decodeURIComponent(sessionMatch[1]);

        if (isSSERequest(request)) {
          return await handleSessionSSE(env, auth.userId, sessionId);
        }

        return htmlResponse(
          htmlShell({
            title: "Session",
            activeTab: "today",
            ssePath: `/session/${encodeURIComponent(sessionId)}`,
          })
        );
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
        const sessionId = decodeURIComponent(pushMatch[1]);
        return await handlePush(env, auth.userId, sessionId);
      }

      // ── POST /api/pull ─────────────────────────────────────────
      if (method === "POST" && path === "/api/pull") {
        return await handlePull(env, auth.userId);
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
      return new Response(message, { status: 500 });
    }
  },
};

// ──────────────────────────────────────────────────────────────────
// Route handlers
// ──────────────────────────────────────────────────────────────────

/** SSE: Today page — CARs card, hero session, completed, upcoming */
async function handleTodaySSE(env: Env, userId: string): Promise<Response> {
  const user = await getUser(env.DB, userId);
  if (!user) {
    return sseResponse(
      patchElements(setupPage(program.weekTemplates), { selector: "#content", mode: "inner" })
    );
  }

  const items = await getQueueItems(env.DB, userId);
  const today = todayString();
  const sessionMap = new Map(program.sessions.map((s) => [s.id, s]));

  const fragments: string[] = [];

  // CARs card (daily session)
  const dailySession = program.sessions.find((s) => s.isDaily);
  if (dailySession) {
    fragments.push(patchElements(carsCard(dailySession), { selector: "#content", mode: "inner" }));
  }

  // Hero session card — next pending
  const nextItem = getNextSession(items);
  if (nextItem) {
    const session = sessionMap.get(nextItem.session_id);
    if (session) {
      fragments.push(
        patchElements(heroSessionCard(session, nextItem), { selector: "#content", mode: "append" })
      );
    }
  }

  // Completed today
  const completed = getCompletedSessions(items, today);
  if (completed.length > 0) {
    const completedData = completed.map((item) => ({
      title: sessionMap.get(item.session_id)?.title ?? item.session_id,
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
    const upcoming = computeUpcoming(upcomingPending, template, program.sessions, 5);
    if (upcoming.length > 0) {
      fragments.push(
        patchElements(upcomingSection(upcoming), { selector: "#content", mode: "append" })
      );
    }
  }

  return sseResponse(mergeFragments(fragments));
}

/** SSE: Progress page — skills, roadmap, benchmarks */
function handleProgressSSE(): Response {
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

/** SSE: Session detail — exercise list with coaching context */
async function handleSessionSSE(env: Env, userId: string, sessionId: string): Promise<Response> {
  const session = program.sessions.find((s) => s.id === sessionId);
  if (!session) {
    return sseResponse(
      patchElements(`<p>Session not found.</p>`, { selector: "#content", mode: "inner" })
    );
  }

  // Look up user to determine current progression from start_date
  const user = await getUser(env.DB, userId);
  const currentProgression = user
    ? getCurrentProgression(user.start_date, program.progressions)
    : program.progressions[0];

  const html = sessionDetailPage(session, currentProgression);
  return sseResponse(
    patchElements(html, { selector: "#content", mode: "inner" })
  );
}

/** POST /api/setup — create user, generate queue, navigate to today */
async function handleSetup(request: Request, env: Env, userId: string, urlTemplateId?: string): Promise<Response> {
  let body: { apiKey?: string; startDate?: string; templateId?: string } = {};
  try {
    body = await request.json() as typeof body;
  } catch {
    // Body may be empty — that's OK, template ID comes from URL
  }

  const templateId = urlTemplateId ?? body.templateId;
  const startDate = body.startDate || todayString();
  const apiKey = body.apiKey || undefined;

  if (!templateId) {
    return new Response("Template ID is required", { status: 400 });
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

  // Upsert user
  await upsertUser(env.DB, {
    id: userId,
    active_program: program.meta.title,
    template_id: templateId,
    start_date: startDate,
    hevy_api_key: apiKey,
  });

  // Generate queue playlist
  const weeks = program.meta.durationWeeks || 8;
  const playlist = generatePlaylist(template, program.sessions, weeks);
  if (playlist.length > 0) {
    await insertQueueItems(env.DB, userId, playlist);
  }

  // Redirect to Today page via script injection (Datastar v1 pattern)
  return sseResponse(executeScript("window.location.href = '/'"));
}

/** POST /api/push-hevy/:id — push session to Hevy as routine */
async function handlePush(env: Env, userId: string, sessionId: string): Promise<Response> {
  const user = await getUser(env.DB, userId);
  if (!user || !user.hevy_api_key) {
    return sseResponse(
      patchElements(`<div class="card"><p>Connect your Hevy API key first.</p></div>`, {
        selector: "#content",
        mode: "inner",
      })
    );
  }

  const session = program.sessions.find((s) => s.id === sessionId);
  if (!session) {
    return new Response("Session not found", { status: 404 });
  }

  const client = new HevyClient(user.hevy_api_key);

  // Get or auto-create exercise mappings
  let mappings = await getExerciseMappings(env.DB, userId);
  if (mappings.length === 0) {
    // First push: auto-match exercises
    try {
      const templates = await client.getAllExerciseTemplates();
      const programNames = program.sessions.flatMap((s) =>
        s.exercises.map((e) => e.name)
      );
      const autoMatched = autoMatchExercises(programNames, templates);

      for (const [name, hevyId] of autoMatched) {
        await upsertExerciseMapping(env.DB, {
          user_id: userId,
          program_exercise_name: name,
          hevy_exercise_id: hevyId,
          confirmed_by_user: 0,
        });
      }
      mappings = await getExerciseMappings(env.DB, userId);
    } catch {
      // If auto-match fails, continue with empty mappings
    }
  }

  const payload = buildRoutinePayload(session, mappings);

  try {
    // Find existing queue item to update
    const items = await getQueueItems(env.DB, userId);
    const queueItem = items.find(
      (i) => i.session_id === sessionId && i.status === "pending"
    );

    let routineId: string;
    if (queueItem?.hevy_routine_id) {
      // Update existing routine
      const routine = await client.updateRoutine(queueItem.hevy_routine_id, {
        title: payload.title,
        exercises: payload.exercises,
      });
      routineId = routine.id;
    } else {
      // Create new routine
      const routine = await client.createRoutine({
        title: payload.title,
        exercises: payload.exercises,
      });
      routineId = routine.id;
    }

    // Store routine ID on queue item
    if (queueItem) {
      await updateQueueItemHevyRoutineId(env.DB, queueItem.id, routineId);
    }

    const unmappedNote =
      payload.unmapped.length > 0
        ? `<p style="color:var(--orange);font-size:13px;margin-top:8px">${payload.unmapped.length} exercise(s) could not be mapped.</p>`
        : "";

    return sseResponse(
      patchElements(
        `<div class="card"><p style="color:var(--green)">Pushed to Hevy!</p>${unmappedNote}</div>`,
        { selector: "#content", mode: "prepend" }
      )
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

  const client = new HevyClient(user.hevy_api_key);

  try {
    const workouts = await client.getRecentWorkouts();
    const items = await getQueueItems(env.DB, userId);
    const pendingItems = items.filter((i) => i.status === "pending" && i.hevy_routine_id);

    // Build a name→routine_id lookup from pending items
    const nameToRoutineId = new Map<string, string>();
    for (const item of pendingItems) {
      const session = program.sessions.find((s) => s.id === item.session_id);
      if (session && item.hevy_routine_id) {
        nameToRoutineId.set(session.title, item.hevy_routine_id);
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
