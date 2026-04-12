import { escapeHtml } from "../utils/html";

/** Render an error card with warning icon, message, and dismiss button. */
export function errorCard(message: string): string {
  return `<div class="error-card" id="error-card" data-on:click="this.remove()">
  <span class="error-card-icon">&#9888;</span>
  <p class="error-card-message">${escapeHtml(message)}</p>
  <button class="error-card-dismiss" aria-label="Dismiss">&times;</button>
</div>`;
}
