import { sseResponse, patchElements } from "../sse/helpers";
import { escapeHtml } from "./html";

/**
 * Return an SSE response that patches an error card into the given selector.
 * Always HTML-escapes the message, so callers should pass the raw string.
 */
export function sseErrorCard(
  msg: string,
  selector = "#content",
  mode: "inner" | "prepend" | "append" = "prepend"
): Response {
  return sseResponse(
    patchElements(
      `<div class="card"><p style="color:var(--orange)">${escapeHtml(msg)}</p></div>`,
      { selector, mode }
    )
  );
}
