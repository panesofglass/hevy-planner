// ──────────────────────────────────────────────────────────────────
// Worker entry point — router with content negotiation
// ──────────────────────────────────────────────────────────────────

import type { Env } from "./types";
import { getAuthenticatedUserOrDev } from "./auth/access";
import { getUser } from "./storage/queries";
import { loadProgram as loadProgramForSubtitle } from "./storage/queries";
import { htmlShell } from "./fragments/layout";
import { handleValidateProgram, handleValidateImportProgram, handleImportProgram, handleSwitchProgram, handleDeleteProgram } from "./routes/program";
import { buildRoutinePage } from "./routes/routine";
import { handleSetup } from "./routes/setup";
import { handlePush, handlePull, handleCleanupRoutines, handleManualComplete } from "./routes/sync";
import { handleWebhookEvent, handleWebhookRegister, handleWebhookUnregister } from "./routes/webhooks";
import { handleSkillAssessment } from "./routes/skill-assessment";
import { handleLogBenchmark } from "./routes/benchmarks";
import { handleAdvancePhase } from "./routes/advance-phase";

import defaultProgramJson from "../programs/mobility-joint-restoration.json";

const APP_NAME = "Hevy Planner";

// ──────────────────────────────────────────────────────────────────
// Local helpers (router-only concerns)
// ──────────────────────────────────────────────────────────────────

function isSSERequest(request: Request): boolean {
  const accept = request.headers.get("accept") || "";
  return accept.includes("text/event-stream");
}

type PageName = "today" | "progress" | "program";

function getSessionActor(env: Env, userId: string, page: PageName): DurableObjectStub {
  const id = env.SESSION_ACTOR.idFromName(`${userId}:${page}`);
  return env.SESSION_ACTOR.get(id);
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

function redirect(location: string, status = 303): Response {
  return new Response(null, { status, headers: { location } });
}

async function broadcastEvents(env: Env, userId: string, page: PageName, events: import("./actor/session-actor").SseEvent[]): Promise<void> {
  const actor = getSessionActor(env, userId, page);
  await actor.fetch(new Request("https://actor/broadcast", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(events),
  }));
}

async function broadcastError(env: Env, userId: string, page: PageName, message: string): Promise<void> {
  await broadcastEvents(env, userId, page, [{ type: "error", message }]);
}

async function triggerReproject(env: Env, userId: string, page: PageName, tz?: string): Promise<void> {
  const actor = getSessionActor(env, userId, page);
  const url = new URL("https://actor/reproject");
  url.searchParams.set("userId", userId);
  url.searchParams.set("page", page);
  if (tz) url.searchParams.set("tz", tz);
  await actor.fetch(new Request(url.toString()));
}

/** Handle the common mutation pattern: reproject on 202, broadcast error on failure. */
async function handleMutation(
  response: Response,
  env: Env,
  userId: string,
  page: PageName,
  tz?: string,
  fallbackMsg = "Request failed"
): Promise<Response> {
  if (response.status === 202) {
    await triggerReproject(env, userId, page, tz);
  } else if (!response.ok) {
    const msg = await response.clone().text();
    await broadcastError(env, userId, page, msg || fallbackMsg);
  }
  return response;
}

/** Load the subtitle from the active program, or undefined on failure. */
async function loadSubtitle(db: D1Database, userId: string): Promise<string | undefined> {
  try {
    const { program } = await loadProgramForSubtitle(db, userId);
    return program.meta.subtitle;
  } catch {
    return undefined;
  }
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
        if (isSSERequest(request)) {
          const actor = getSessionActor(env, auth.userId, "today");
          const connectUrl = new URL("https://actor/connect");
          connectUrl.searchParams.set("userId", auth.userId);
          connectUrl.searchParams.set("page", "today");
          if (tz) connectUrl.searchParams.set("tz", tz);
          return actor.fetch(new Request(connectUrl.toString()));
        }

        const user = await getUser(env.DB, auth.userId);
        const subtitle = user ? await loadSubtitle(env.DB, auth.userId) : "Setup";
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
          const actor = getSessionActor(env, auth.userId, "progress");
          const connectUrl = new URL("https://actor/connect");
          connectUrl.searchParams.set("userId", auth.userId);
          connectUrl.searchParams.set("page", "progress");
          if (tz) connectUrl.searchParams.set("tz", tz);
          return actor.fetch(new Request(connectUrl.toString()));
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
          const actor = getSessionActor(env, auth.userId, "program");
          const connectUrl = new URL("https://actor/connect");
          connectUrl.searchParams.set("userId", auth.userId);
          connectUrl.searchParams.set("page", "program");
          if (tz) connectUrl.searchParams.set("tz", tz);
          return actor.fetch(new Request(connectUrl.toString()));
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
        const body = await buildRoutinePage(env, auth.userId, routineId);
        return htmlResponse(
          htmlShell({
            title: "Routine",
            activeTab: "today",
            body: `<div id="content">${body}</div>`,
          })
        );
      }

      // ── POST /api/validate-program ─────────────────────────────
      if (method === "POST" && path === "/api/validate-program") {
        const result = await handleValidateProgram(request);
        await broadcastEvents(env, auth.userId, "today", result.events);
        return new Response(null, { status: result.status });
      }

      // ── POST /api/validate-import-program ──────────────────────
      if (method === "POST" && path === "/api/validate-import-program") {
        const result = await handleValidateImportProgram(request);
        await broadcastEvents(env, auth.userId, "program", result.events);
        return new Response(null, { status: result.status });
      }

      // ── POST /api/import-program ────────────────────────────────
      if (method === "POST" && path === "/api/import-program") {
        return handleMutation(await handleImportProgram(request, env, auth.userId, tz), env, auth.userId, "program", tz, "Import failed");
      }

      // ── POST /api/setup/:templateId ─────────────────────────────
      const setupMatch = path.match(/^\/api\/setup\/([^/]+)$/);
      if (method === "POST" && (path === "/api/setup" || setupMatch)) {
        const urlTemplateId = setupMatch ? decodeURIComponent(setupMatch[1]) : undefined;
        return handleMutation(await handleSetup(request, env, auth.userId, urlTemplateId, tz), env, auth.userId, "today", tz, "Setup failed");
      }

      // ── POST /api/push-hevy/:id ────────────────────────────────
      const pushMatch = path.match(/^\/api\/push-hevy\/([^/]+)$/);
      if (method === "POST" && pushMatch) {
        const routineId = decodeURIComponent(pushMatch[1]);
        return handleMutation(await handlePush(env, auth.userId, routineId), env, auth.userId, "today", tz, "Push failed");
      }

      // ── POST /api/pull ─────────────────────────────────────────
      if (method === "POST" && path === "/api/pull") {
        return handleMutation(await handlePull(env, auth.userId, tz), env, auth.userId, "today", tz, "Sync failed");
      }

      // ── POST /api/cleanup-routines ───────────────────────────────
      if (method === "POST" && path === "/api/cleanup-routines") {
        return await handleCleanupRoutines(env, auth.userId);
      }

      // ── POST /api/complete/:id ─────────────────────────────────
      const completeMatch = path.match(/^\/api\/complete\/([^/]+)$/);
      if (method === "POST" && completeMatch) {
        const itemId = parseInt(completeMatch[1], 10);
        return handleMutation(await handleManualComplete(env, auth.userId, itemId, tz), env, auth.userId, "today", tz, "Complete failed");
      }

      // ── POST /api/webhooks/register ────────────────────────────
      if (method === "POST" && path === "/api/webhooks/register") {
        return handleMutation(await handleWebhookRegister(request, env, auth.userId, tz), env, auth.userId, "today", tz, "Webhook registration failed");
      }

      // ── POST /api/webhooks/unregister ──────────────────────────
      if (method === "POST" && path === "/api/webhooks/unregister") {
        return handleMutation(await handleWebhookUnregister(env, auth.userId, tz), env, auth.userId, "today", tz, "Webhook removal failed");
      }

      // ── POST /api/switch-program/:id ───────────────────────────
      let switchMatch: RegExpMatchArray | null;
      if (method === "POST" && (switchMatch = path.match(/^\/api\/switch-program\/(\d+)$/))) {
        return handleMutation(await handleSwitchProgram(env, auth.userId, parseInt(switchMatch[1], 10), tz), env, auth.userId, "program", tz, "Switch failed");
      }

      // ── POST /api/delete-program/:id ───────────────────────────
      let deleteMatch: RegExpMatchArray | null;
      if (method === "POST" && (deleteMatch = path.match(/^\/api\/delete-program\/(\d+)$/))) {
        return handleMutation(await handleDeleteProgram(env, auth.userId, parseInt(deleteMatch[1], 10)), env, auth.userId, "program", tz, "Delete failed");
      }

      // ── POST /api/skill-assessment/:id ─────────────────────────
      const assessMatch = path.match(/^\/api\/skill-assessment\/([a-zA-Z0-9_-]+)$/);
      if (method === "POST" && assessMatch) {
        const skillId = decodeURIComponent(assessMatch[1]);
        return handleMutation(await handleSkillAssessment(request, env, auth.userId, skillId), env, auth.userId, "progress", tz, "Assessment failed");
      }

      // ── POST /api/log-benchmark/:id ─────────────────────────────
      const benchmarkMatch = path.match(/^\/api\/log-benchmark\/([^/]+)$/);
      if (method === "POST" && benchmarkMatch) {
        const benchmarkId = decodeURIComponent(benchmarkMatch[1]);
        return handleMutation(await handleLogBenchmark(request, env, auth.userId, benchmarkId, tz), env, auth.userId, "progress", tz, "Log failed");
      }

      // ── POST /api/advance-phase/:phaseId ──────────────────────────
      const advanceMatch = path.match(/^\/api\/advance-phase\/([^/]+)$/);
      if (method === "POST" && advanceMatch) {
        const phaseId = decodeURIComponent(advanceMatch[1]);
        return handleMutation(await handleAdvancePhase(env, auth.userId, phaseId), env, auth.userId, "progress", tz, "Phase advance failed");
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

export type { Env };
export { SessionActor } from "./actor/session-actor";
