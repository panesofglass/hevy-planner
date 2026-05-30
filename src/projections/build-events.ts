import type { SseEvent } from "../actor/session-actor";

/**
 * Convert an array of HTML fragment strings into a single patch SseEvent.
 * All fragments are joined inside one <div id="content"> and sent as one
 * atomic Datastar patch — no append race conditions.
 */
export function buildContentEvents(fragments: string[]): SseEvent[] {
  return [{ type: "patch", html: `<div id="content">${fragments.join("\n")}</div>` }];
}
