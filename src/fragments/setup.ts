// ──────────────────────────────────────────────────────────────────
// Setup page — first-run: API key, start date, template selection
// ──────────────────────────────────────────────────────────────────

import type { WeekTemplate } from "../types";

/**
 * First-run setup page. Collects:
 * - Hevy API key (password field)
 * - Start date (date picker, defaults to today)
 * - Week template selection (clicking a card submits the form)
 *
 * The form POSTs to /api/setup with { apiKey, startDate, templateId }.
 */
export function setupPage(templates: WeekTemplate[]): string {
  const today = new Date().toISOString().slice(0, 10);

  const sorted = [...templates].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );

  const templateCards = sorted
    .map(
      (t) =>
        `<div class="template-card" data-on-click="$templateId = '${escapeAttr(t.id)}'; $$post('/api/setup')">
  <div class="template-name">${escapeHtml(t.name)}</div>
  ${t.description ? `<div class="template-desc">${escapeHtml(t.description)}</div>` : ""}
</div>`
    )
    .join("\n    ");

  return `<div class="setup-container" data-signals-apiKey="''" data-signals-startDate="'${today}'" data-signals-templateId="''">
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
      data-bind-apiKey
    />
  </div>

  <div class="form-group">
    <label class="form-label" for="startDate">Start Date</label>
    <input
      id="startDate"
      type="date"
      class="form-input"
      data-bind-startDate
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

// ── Helpers ──

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str: string): string {
  return str.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return c;
    }
  });
}
