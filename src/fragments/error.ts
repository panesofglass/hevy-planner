import { escapeHtml } from "../utils/html";

/** Render an error card with orange text, for prepending to #content. */
export function errorCard(message: string): string {
  return `<div id="error-card" class="card"><p style="color:var(--orange)">${escapeHtml(message)}</p></div>`;
}
