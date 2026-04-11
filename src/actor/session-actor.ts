// ──────────────────────────────────────────────────────────────────
// SessionActor — Durable Object that holds SSE connections and
// broadcasts HTML fragments to all connected clients.
//
// This is a message bus with a stream attached. It does NOT contain
// domain logic or mutate D1 — it just holds SSE connections and
// forwards broadcasts. The SDK is only used here.
//
// Pattern: ~/Code/tic-tac-toe/src/TicTacToe.Web/SseBroadcast.fs
// ──────────────────────────────────────────────────────────────────

import { ServerSentEventGenerator } from "@starfederation/datastar-sdk/web";
import type { Env } from "../types";

// ── Domain-oriented SSE events ──────────────────────────────────
// Handlers send these. The DO decides how to render them via the SDK.
// Modeled after F# SseEvent discriminated union.

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
        // TODO Task 4: project initial state from D1 here
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
            // Stream closed — remove from active set
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
        sse.patchElements("", { selector: event.target, mode: "remove" });
        break;
      case "signals":
        sse.patchSignals(event.json, {
          onlyIfMissing: event.onlyIfMissing,
        });
        break;
    }
  }
}
