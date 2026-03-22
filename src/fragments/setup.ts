// ──────────────────────────────────────────────────────────────────
// Setup page — first-run: API key, start date, template selection
// ──────────────────────────────────────────────────────────────────

import type { WeekTemplate } from "../types";
import { escapeHtml, escapeAttr } from "../utils/html";

/**
 * First-run setup page. Collects:
 * - Hevy API key (password field)
 * - Start date (date picker, defaults to today)
 * - Week template selection (clicking a card submits the form)
 *
 * The form POSTs to /api/setup with { apiKey, startDate, templateId }.
 */
export function setupPage(templates: WeekTemplate[]): string {
  // Default date is set client-side to avoid UTC/local timezone mismatch
  const today = "";

  const sorted = [...templates].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );

  const templateCards = sorted
    .map(
      (t) =>
        `<div class="template-card" data-on:click="@post('/api/setup/${escapeAttr(t.id)}')">
  <div class="template-name">${escapeHtml(t.name)}</div>
  ${t.description ? `<div class="template-desc">${escapeHtml(t.description)}</div>` : ""}
</div>`
    )
    .join("\n    ");

  return `<div class="setup-container" data-signals:api-key="''" data-signals:start-date="new Date().toLocaleDateString('en-CA')" data-signals:template-id="''">
  <div style="text-align:center; margin-bottom:32px">
    <h2 class="card-title" style="font-size:24px">Welcome</h2>
    <p class="card-subtitle" style="margin-top:4px">Connect your Hevy account and pick a schedule.</p>
  </div>

  <div class="form-group">
    <label class="form-label" for="apiKey">Hevy API Key</label>
    <input
      id="apiKey"
      type="password"
      class="form-input"
      placeholder="Enter your Hevy API key"
      autocomplete="off"
      data-bind:api-key
    />
  </div>

  <div class="form-group">
    <label class="form-label" for="startDate">Start Date</label>
    <input
      id="startDate"
      type="date"
      class="form-input"
      data-bind:start-date
    />
  </div>

  <div class="form-group">
    <label class="form-label">Choose Your Schedule</label>
    <div class="template-grid">
    ${templateCards}
    </div>
  </div>
</div>`;
}

