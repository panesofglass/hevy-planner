// ──────────────────────────────────────────────────────────────────
// SessionActor — Durable Object that holds SSE connections and
// broadcasts HTML fragments to all connected clients.
//
// This is a message bus with a stream attached. It does NOT contain
// domain logic or mutate D1 — it just holds SSE connections and
// forwards broadcasts.
// ──────────────────────────────────────────────────────────────────

import { ServerSentEventGenerator } from "@starfederation/datastar-sdk/web";
import type { Env } from "../types";

export interface BroadcastMessage {
  type: "patch-elements";
  html: string;
  selector?: string;
  mode?: string;
}

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

  private handleConnect(_request: Request): Response {
    // Each connected client gets an SSE stream held open via keepalive.
    // The stream stays open until the client disconnects, which triggers
    // the ReadableStream cancel callback -> onAbort -> cleanup.
    let sseRef: ServerSentEventGenerator | null = null;

    return ServerSentEventGenerator.stream(
      (sse) => {
        sseRef = sse;
        this.streams.add(sse);
        // TODO Task 4: project initial state from D1 here
        // With keepalive: true, the stream stays open after onStart returns.
        // No need for a polling loop — the SDK holds the connection.
      },
      {
        keepalive: true,
        onAbort: () => {
          // Client disconnected — remove from the active set
          if (sseRef) {
            this.streams.delete(sseRef);
          }
        },
      },
    );
  }

  private async handleBroadcast(request: Request): Promise<Response> {
    const messages: BroadcastMessage[] = await request.json();

    for (const msg of messages) {
      for (const sse of this.streams) {
        try {
          sse.patchElements(msg.html, {
            selector: msg.selector,
            mode: msg.mode as any,
          });
        } catch {
          // Stream closed — remove from active set
          this.streams.delete(sse);
        }
      }
    }

    return new Response(null, { status: 204 });
  }
}
