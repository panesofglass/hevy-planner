// ──────────────────────────────────────────────────────────────────
// Shared template grid fragment — used by setup and import flows
// ──────────────────────────────────────────────────────────────────

import type { WeekTemplate } from "../types";
import { escapeHtml } from "../utils/html";

/**
 * Render a sorted grid of week-template cards.
 *
 * @param templates  - the week templates to display
 * @param cardAttrs  - a function that returns extra HTML attributes for each
 *                    card element (e.g. data-on:click handlers), keyed by
 *                    template id
 */
export function renderTemplateGrid(
  templates: WeekTemplate[],
  cardAttrs: (templateId: string) => string
): string {
  const sorted = [...templates].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const cards = sorted
    .map(
      (t) =>
        `<div class="template-card" ${cardAttrs(t.id)}>
  <div class="template-name">${escapeHtml(t.name)}</div>
  ${t.description ? `<div class="template-desc">${escapeHtml(t.description)}</div>` : ""}
</div>`
    )
    .join("\n    ");
  return `<div class="template-grid">\n    ${cards}\n    </div>`;
}
