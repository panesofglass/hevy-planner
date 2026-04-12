// ──────────────────────────────────────────────────────────────────
// SessionActor — Durable Object that holds SSE connections and
// broadcasts HTML fragments to all connected clients.
//
// Pure message bus: no domain logic, no D1 mutations. The SDK is
// only used here — route handlers never import it.
// ──────────────────────────────────────────────────────────────────

import { ServerSentEventGenerator } from "@starfederation/datastar-sdk/web";
import type { Env } from "../types";
import { buildTodayEvents } from "../projections/today";
import { buildProgressEvents } from "../projections/progress";
import { buildProgramEvents } from "../projections/program";

// ── SSE events ──────────────────────────────────────────────────
// Handlers send these. The DO decides how to render them via the SDK.

export type SseEvent =
  | { type: "patch"; html: string }
  | { type: "append"; target: string; html: string }
  | { type: "remove"; target: string }
  | { type: "signals"; json: string; onlyIfMissing?: boolean }
  | { type: "error"; html: string };

// ── Durable Object ──────────────────────────────────────────────

export class SessionActor implements DurableObject {
  private streams: Set<ServerSentEventGenerator> = new Set();
  private state: DurableObjectState;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/connect") {
      return this.handleConnect(url);
    }

    if (url.pathname === "/reproject") {
      return this.handleReproject(url);
    }

    if (url.pathname === "/broadcast") {
      return this.handleBroadcast(request);
    }

    return new Response("Not found", { status: 404 });
  }

  // ── Page dispatch ────────────────────────────────────────────

  private async buildEventsForPage(page: string, db: D1Database, userId: string, tz?: string): Promise<SseEvent[]> {
    switch (page) {
      case "today":
        return buildTodayEvents(db, userId, tz);
      case "progress":
        return buildProgressEvents(db, userId, tz);
      case "program":
        return buildProgramEvents(db, userId);
      default:
        throw new Error(`Unknown page: ${page}`);
    }
  }

  // ── Broadcast helper ────────────────────────────────────────

  private broadcastToAll(events: SseEvent[]): void {
    const snapshot = [...this.streams];
    for (const event of events) {
      for (const sse of snapshot) {
        try {
          this.writeSseEvent(sse, event);
        } catch (err) {
          if (err instanceof TypeError) {
            this.streams.delete(sse);
          } else {
            throw err;
          }
        }
      }
    }
  }

  // ── SSE connection ──────────────────────────────────────────

  private handleConnect(url: URL): Response {
    let sseRef: ServerSentEventGenerator | null = null;

    return ServerSentEventGenerator.stream(
      async (sse) => {
        sseRef = sse;

        // Project initial page state from D1
        const userId = url.searchParams.get("userId");
        const page = url.searchParams.get("page") || "today";
        const tz = url.searchParams.get("tz") || undefined;
        if (!userId) {
          throw new Error("handleConnect called without userId");
          return;
        }

        const events = await this.buildEventsForPage(page, this.env.DB, userId, tz);
        for (const event of events) {
          this.writeSseEvent(sse, event);
        }

        // Add to broadcast set after initial projection completes
        this.streams.add(sse);
      },
      {
        keepalive: true,
        onAbort: () => {
          if (sseRef) {
            this.streams.delete(sseRef);
          }
        },
      },
    );
  }

  // ── Reproject ───────────────────────────────────────────────
  // Re-render page state from D1 and push to all connected streams.

  private async handleReproject(url: URL): Promise<Response> {
    const userId = url.searchParams.get("userId");
    const page = url.searchParams.get("page") || "today";
    const tz = url.searchParams.get("tz") || undefined;

    if (!userId) {
      return new Response("userId required", { status: 400 });
    }

    const events = await this.buildEventsForPage(page, this.env.DB, userId, tz);
    this.broadcastToAll(events);

    return new Response(null, { status: 204 });
  }

  // ── Broadcast ───────────────────────────────────────────────

  private async handleBroadcast(request: Request): Promise<Response> {
    let events: SseEvent[];
    try {
      events = await request.json();
    } catch {
      return new Response("Bad request", { status: 400 });
    }
    if (!Array.isArray(events)) {
      return new Response("Expected array", { status: 400 });
    }

    this.broadcastToAll(events);

    return new Response(null, { status: 204 });
  }

  // ── SDK dispatch ────────────────────────────────────────────
  // All Datastar SDK usage is confined to this method.

  private writeSseEvent(sse: ServerSentEventGenerator, event: SseEvent): void {
    switch (event.type) {
      case "patch":
        sse.patchElements(event.html);
        break;
      case "append":
        sse.patchElements(event.html, { selector: event.target, mode: "append" });
        break;
      case "remove":
        sse.removeElements(event.target);
        break;
      case "signals":
        sse.patchSignals(event.json, {
          onlyIfMissing: event.onlyIfMissing,
        });
        break;
      case "error":
        sse.patchElements(event.html, { selector: "#content", mode: "prepend" });
        break;
      default: {
        const _exhaustive: never = event;
        throw new Error(`Unknown SSE event type: ${(_exhaustive as SseEvent).type}`);
      }
    }
  }
}
