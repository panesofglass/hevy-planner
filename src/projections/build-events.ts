import type { SseEvent } from "../actor/session-actor";

/**
 * Convert an array of HTML fragment strings into SseEvent[].
 * The first fragment becomes a "patch" event (replaces #content),
 * subsequent fragments become "append" events (added to #content).
 */
export function buildContentEvents(fragments: string[]): SseEvent[] {
  return fragments.map((html, i): SseEvent =>
    i === 0
      ? { type: "patch", html: `<div id="content">${html}</div>` }
      : { type: "append", target: "#content", html }
  );
}
