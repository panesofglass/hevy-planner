// ──────────────────────────────────────────────────────────────────
// Setup page — first-run: upload program, API key, start date
// ──────────────────────────────────────────────────────────────────

import type { WeekTemplate } from "../types";
import { escapeHtml, escapeAttr } from "../utils/html";

/**
 * First-run setup page. Shows:
 * - File upload for program JSON (with starter download link)
 * - Hevy API key input
 * - Start date picker
 * - Validate button (POSTs for template preview)
 *
 * Template selection appears in #validation-result after validation.
 */
export function setupPage(): string {
  return `<div class="setup-container" data-signals:api-key="''" data-signals:start-date="new Date().toLocaleDateString('en-CA')" data-signals:program-json="''">
  <div style="text-align:center; margin-bottom:32px">
    <h2 class="card-title" style="font-size:24px">Welcome</h2>
    <p class="card-subtitle" style="margin-top:4px">Upload a program, connect Hevy, and pick a schedule.</p>
  </div>

  <div class="form-group">
    <label class="form-label">Program File</label>
    <input type="file" accept=".json" id="programFile" class="form-input"
      data-on:change="
        const f = evt.target.files[0];
        if (!f) return;
        f.text().then(t => {
          const el = document.getElementById('programData');
          el.value = t;
          el.dispatchEvent(new Event('input', {bubbles: true}));
        });
      " />
    <input type="text" id="programData" data-bind:program-json style="display:none" />
    <p style="font-size:13px; color:var(--text-tertiary); margin-top:8px">
      Need a program? <a href="/programs/default.json" style="color:var(--blue)" download>Download the starter program</a>
    </p>
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

  <div style="margin-bottom:20px">
    <button class="btn btn-blue btn-block" data-on:click="@post('/api/validate-program')">
      Validate &amp; Preview
    </button>
  </div>

  <div id="validation-result"></div>
</div>`;
}

/**
 * SSE fragment: week template selection cards.
 * Shown inside #validation-result after successful program validation.
 */
export function templateSelectionFragment(templates: WeekTemplate[]): string {
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

  return `<div class="form-group">
  <label class="form-label">Choose Your Schedule</label>
  <div class="template-grid">
    ${templateCards}
  </div>
</div>`;
}
