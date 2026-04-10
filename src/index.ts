// ──────────────────────────────────────────────────────────────────
// Worker entry point — router with content negotiation
// ──────────────────────────────────────────────────────────────────

import type { Env } from "./types";
import { getAuthenticatedUserOrDev } from "./auth/access";
import { isSSERequest } from "./sse/helpers";
import { getUser } from "./storage/queries";
import { loadProgram as loadProgramForSubtitle } from "./storage/queries";
import { htmlShell } from "./fragments/layout";
import { setupPage } from "./fragments/setup";
import { handleTodaySSE } from "./routes/today";
import { handleProgressSSE } from "./routes/progress";
import { handleProgramSSE, handleValidateProgram, handleValidateImportProgram, handleImportProgram, handleSwitchProgram, handleDeleteProgram } from "./routes/program";
import { handleRoutineSSE } from "./routes/routine";
import { handleSetup } from "./routes/setup";
import { handlePush, handlePull, handleCleanupRoutines, handleManualComplete } from "./routes/sync";
import { handleWebhookEvent, handleWebhookRegister, handleWebhookUnregister } from "./routes/webhooks";
import { handleSkillAssessment } from "./routes/skill-assessment";
import { handleLogBenchmark } from "./routes/benchmarks";

import defaultProgramJson from "../programs/mobility-joint-restoration.json";

const APP_NAME = "Hevy Planner";

// ──────────────────────────────────────────────────────────────────
// Local helpers (router-only concerns)
// ──────────────────────────────────────────────────────────────────

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
          return await handleProgressSSE(env, auth.userId, tz);
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

      // ── POST /api/switch-program/:id ───────────────────────────
      let switchMatch: RegExpMatchArray | null;
      if (method === "POST" && (switchMatch = path.match(/^\/api\/switch-program\/(\d+)$/))) {
        return await handleSwitchProgram(env, auth.userId, parseInt(switchMatch[1], 10), tz);
      }

      // ── POST /api/delete-program/:id ───────────────────────────
      let deleteMatch: RegExpMatchArray | null;
      if (method === "POST" && (deleteMatch = path.match(/^\/api\/delete-program\/(\d+)$/))) {
        return await handleDeleteProgram(env, auth.userId, parseInt(deleteMatch[1], 10));
      }

      // ── POST /api/skill-assessment/:id ─────────────────────────
      const assessMatch = path.match(/^\/api\/skill-assessment\/([a-zA-Z0-9_-]+)$/);
      if (method === "POST" && assessMatch) {
        const skillId = decodeURIComponent(assessMatch[1]);
        return await handleSkillAssessment(request, env, auth.userId, skillId);
      }

      // ── POST /api/log-benchmark/:id ─────────────────────────────
      const benchmarkMatch = path.match(/^\/api\/log-benchmark\/([^/]+)$/);
      if (method === "POST" && benchmarkMatch) {
        const benchmarkId = decodeURIComponent(benchmarkMatch[1]);
        return await handleLogBenchmark(request, env, auth.userId, benchmarkId, tz);
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
