// ──────────────────────────────────────────────────────────────────
// SessionActor — Durable Object that holds SSE connections and
// broadcasts HTML fragments to all connected clients.
//
// Pure message bus: no domain logic, no D1 mutations. The SDK is
// only used here — route handlers never import it.
// ──────────────────────────────────────────────────────────────────

import { ServerSentEventGenerator } from "@starfederation/datastar-sdk/web";
import type { Env } from "../types";

// ── SSE events ──────────────────────────────────────────────────
// Handlers send these. The DO decides how to render them via the SDK.

export type SseEvent =
  | { type: "patch"; html: string }
  | { type: "append"; target: string; html: string }
  | { type: "remove"; target: string }
  | { type: "signals"; json: string; onlyIfMissing?: boolean };

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
      return this.handleConnect(request);
    }

    if (url.pathname === "/broadcast") {
      return this.handleBroadcast(request);
    }

    return new Response("Not found", { status: 404 });
  }

  // ── SSE connection ──────────────────────────────────────────

  private handleConnect(_request: Request): Response {
    let sseRef: ServerSentEventGenerator | null = null;

    return ServerSentEventGenerator.stream(
      (sse) => {
        sseRef = sse;
        this.streams.add(sse);
        // TODO: project initial state from D1 on connect
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
      default: {
        const _exhaustive: never = event;
        throw new Error(`Unknown SSE event type: ${(_exhaustive as SseEvent).type}`);
      }
    }
  }
}
