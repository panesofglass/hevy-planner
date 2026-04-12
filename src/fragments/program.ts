// ──────────────────────────────────────────────────────────────────
// Program page fragments — overview, progressions, routines,
// foundations, resources, BODi, import
// ──────────────────────────────────────────────────────────────────

import type { Program, Progression, Foundation, Resource, BodiIntegration, BodiRecommendedProgram, BodiHybridSchedule, BodiIntegrationRule, UserRow, WeekTemplate, ProgramRow } from "../types";
import { escapeHtml, escapeAttr } from "../utils/html";
import { findActiveProgression } from "../domain/schedule";
import { renderTemplateGrid } from "./template-grid";

// ── Program overview card ──────────────────────────────────────────

export function programOverview(program: Program, user: UserRow | null, week: number | null): string {
  const template = user
    ? program.weekTemplates.find((t) => t.id === user.template_id)
    : undefined;

  const phase = week != null ? findActiveProgression(week, program.progressions) : undefined;
  const exerciseCount = program.exerciseTemplates.length;
  const routineCount = program.routines.filter((r) => !r.isDaily).length;

  // Stats row
  const stats: string[] = [];
  if (week != null) stats.push(`<div class="stat-item"><div class="stat-value">${week}</div><div class="stat-label">Week</div></div>`);
  stats.push(`<div class="stat-item"><div class="stat-value">${routineCount}</div><div class="stat-label">Routines</div></div>`);
  stats.push(`<div class="stat-item"><div class="stat-value">${exerciseCount}</div><div class="stat-label">Exercises</div></div>`);
  if (template) {
    const daysPerWeek = template.days.filter((d) => d.routineIDs && d.routineIDs.length > 0).length;
    stats.push(`<div class="stat-item"><div class="stat-value">${daysPerWeek}</div><div class="stat-label">Days/Wk</div></div>`);
  }

  const statsRow = `<div style="display:flex;gap:4px;margin-top:12px">${stats.join("")}</div>`;

  // Phase badge
  const phaseBadge = phase
    ? `<div style="display:inline-block;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--green);background:rgba(48,209,88,0.1);padding:4px 10px;border-radius:6px;margin-top:10px">${escapeHtml(phase.phaseName)}${phase.weekRange ? ` \u00B7 ${escapeHtml(phase.weekRange)}` : ""}</div>`
    : "";

  return `<div class="card">
  <div class="card-label" style="color:var(--blue)">Program</div>
  <div class="card-title">${escapeHtml(program.meta.title)}</div>
  ${program.meta.description ? `<div class="card-desc">${escapeHtml(program.meta.description)}</div>` : ""}
  ${phaseBadge}
  ${statsRow}
</div>`;
}

// ── Progressions timeline ──────────────────────────────────────────

export function progressionsSection(progressions: Progression[], currentWk: number | null): string {
  if (progressions.length === 0) return "";

  const sorted = [...progressions].sort((a, b) => (a.weekStart ?? 0) - (b.weekStart ?? 0));

  const items = sorted.map((p) => {
    const isCurrent = currentWk != null && p.weekStart != null && p.weekEnd != null
      && currentWk >= p.weekStart && currentWk <= p.weekEnd;
    const isPast = currentWk != null && p.weekEnd != null && currentWk > p.weekEnd;
    const dotColor = isCurrent ? "var(--green)" : isPast ? "var(--blue)" : "var(--text-tertiary)";
    const cls = isCurrent ? " roadmap-current" : "";

    return `<div class="roadmap-item${cls}">
  <div class="roadmap-indicator" style="background:${dotColor}"></div>
  <div>
    <div class="roadmap-name">${escapeHtml(p.phaseName)}</div>
    ${p.weekRange ? `<div class="roadmap-weeks">${escapeHtml(p.weekRange)}</div>` : ""}
    ${p.focus ? `<div class="roadmap-summary">${escapeHtml(p.focus)}</div>` : ""}
  </div>
</div>`;
  }).join("\n");

  return `<h2 class="section-header">Phases</h2>
<div class="card">
${items}
</div>`;
}

// ── Routines list with exercise counts ─────────────────────────────

export function routinesSection(program: Program): string {
  const templateMap = new Map(program.exerciseTemplates.map((t) => [t.id, t]));

  const daily = program.routines.filter((r) => r.isDaily);
  const sessions = program.routines.filter((r) => !r.isDaily);

  function routineCard(r: typeof program.routines[0]): string {
    const color = r.color ?? "var(--blue)";
    const exCount = r.exercises.length;
    const muscleGroups = new Set<string>();
    for (const ex of r.exercises) {
      const tmpl = templateMap.get(ex.exerciseTemplateId);
      if (tmpl) muscleGroups.add(tmpl.primaryMuscleGroup.replace(/_/g, " "));
    }
    const muscles = Array.from(muscleGroups).slice(0, 4).join(", ");

    return `<a href="/routine/${encodeURIComponent(r.id)}" class="routine-list-link">
  <div class="routine-list-item">
    <div class="routine-color-bar" style="background:${escapeAttr(color)}"></div>
    <div class="routine-info">
      <div class="routine-title">${escapeHtml(r.title)}</div>
      <div class="routine-meta">${exCount} exercise${exCount !== 1 ? "s" : ""}${muscles ? ` \u00B7 ${escapeHtml(muscles)}` : ""}</div>
    </div>
    <svg class="routine-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
  </div>
</a>`;
  }

  const dailyHtml = daily.length > 0
    ? daily.map((r) => routineCard(r)).join("")
    : "";

  const sessionsHtml = sessions
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((r) => routineCard(r))
    .join("");

  let html = "";

  if (dailyHtml) {
    html += `<h2 class="section-header">Daily</h2>
<div class="card">${dailyHtml}</div>`;
  }

  if (sessionsHtml) {
    html += `<h2 class="section-header">Routines</h2>
<div class="card">${sessionsHtml}</div>`;
  }

  return html;
}

// ── Foundations ─────────────────────────────────────────────────────

export function foundationsSection(foundations: Foundation[]): string {
  if (foundations.length === 0) return "";

  const cards = foundations.map((f, index) => {
    const signalName = `found_${f.id.replace(/[^a-zA-Z0-9]/g, "_")}`;
    const expanded = index === 0;

    const stepsHtml = f.steps && f.steps.length > 0
      ? `<ol style="list-style:none;margin:0;padding:0">${f.steps.map((s) =>
          `<li style="padding:8px 0;border-top:1px solid var(--separator)">
  <div style="display:flex;gap:8px;align-items:baseline">
    ${s.step != null ? `<span style="font-size:13px;font-weight:700;color:var(--text-tertiary)">${s.step}</span>` : ""}
    <span style="font-size:14px;font-weight:600">${escapeHtml(s.name)}</span>
  </div>
  <div style="font-size:13px;color:var(--text-secondary);line-height:1.45;margin-top:4px;padding-left:${s.step != null ? "22px" : "0"}">${escapeHtml(s.instructions)}</div>
</li>`
        ).join("")}</ol>`
      : "";

    const activeWeeks = f.activeDuringWeeks
      ? `<div style="font-size:12px;color:var(--text-tertiary);margin-top:8px">Active weeks ${f.activeDuringWeeks.start}\u2013${f.activeDuringWeeks.end}</div>`
      : "";

    return `<div class="skill-card" data-signals:${signalName}="${expanded}">
  <div class="skill-header" data-on:click="$${signalName} = !$${signalName}">
    <span class="skill-name">${escapeHtml(f.title)}</span>
  </div>
  <div class="skill-body" data-show="$${signalName}">
    ${f.description ? `<div style="font-size:14px;color:var(--text-secondary);line-height:1.45;margin-bottom:12px">${escapeHtml(f.description)}</div>` : ""}
    ${stepsHtml}
    ${f.practice ? `<div style="font-size:13px;color:var(--green);margin-top:12px">${escapeHtml(f.practice)}</div>` : ""}
    ${activeWeeks}
  </div>
</div>`;
  });

  return `<h2 class="section-header">Foundations</h2>\n${cards.join("\n")}`;
}

// ── Resources ──────────────────────────────────────────────────────

export function resourcesSection(resources: Resource[]): string {
  if (resources.length === 0) return "";

  const grouped = new Map<string, Resource[]>();
  for (const r of resources) {
    const cat = r.category ?? "General";
    const list = grouped.get(cat) ?? [];
    list.push(r);
    grouped.set(cat, list);
  }

  const sections = Array.from(grouped.entries()).map(([category, items]) => {
    const itemsHtml = items.map((r) => {
      const inner = r.url
        ? `<a href="${escapeAttr(r.url)}" target="_blank" rel="noopener" style="font-size:15px;font-weight:600;color:var(--blue);text-decoration:none">${escapeHtml(r.title)}</a>`
        : `<div style="font-size:15px;font-weight:600">${escapeHtml(r.title)}</div>`;
      return `<div style="padding:10px 0;border-top:1px solid var(--separator)">
  ${inner}
  ${r.description ? `<div style="font-size:13px;color:var(--text-secondary);line-height:1.45;margin-top:2px">${escapeHtml(r.description)}</div>` : ""}
</div>`;
    }).join("");

    return `<div style="font-size:13px;font-weight:600;color:var(--text-tertiary);margin-bottom:4px">${escapeHtml(category)}</div>${itemsHtml}`;
  }).join("");

  return `<h2 class="section-header">Resources</h2>
<div class="card">
${sections}
</div>`;
}

// ── BODi Integration ───────────────────────────────────────────────

export function bodiSection(items: BodiIntegration[]): string {
  if (items.length === 0) return "";

  let html = "";

  for (const b of items) {
    // Section header + description
    html += `<h2 class="section-header">BODi Integration</h2>`;
    if (b.description) {
      html += `<div class="card"><div style="font-size:14px;color:var(--text-secondary);line-height:1.5">${escapeHtml(b.description)}</div></div>`;
    }

    // Recommended programs
    if (b.recommendedPrograms && b.recommendedPrograms.length > 0) {
      html += bodiRecommendedProgramsHtml(b.recommendedPrograms);
    }

    // Hybrid schedules
    if (b.hybridSchedules && b.hybridSchedules.length > 0) {
      html += bodiHybridSchedulesHtml(b.hybridSchedules);
    }

    // Integration rules
    if (b.integrationRules && b.integrationRules.length > 0) {
      html += bodiIntegrationRulesHtml(b.integrationRules);
    }

    // Legacy flat fields (backward compat)
    if (!b.recommendedPrograms && !b.hybridSchedules && !b.integrationRules) {
      html += `<div class="card">
  <div style="font-size:15px;font-weight:600">${escapeHtml(b.title)}</div>
  ${b.schedule ? `<div style="font-size:13px;color:var(--blue);margin-top:4px">${escapeHtml(b.schedule)}</div>` : ""}
  ${b.notes ? `<div style="font-size:13px;color:var(--text-tertiary);margin-top:4px">${escapeHtml(b.notes)}</div>` : ""}
</div>`;
    }
  }

  return html;
}

function bodiRecommendedProgramsHtml(programs: BodiRecommendedProgram[]): string {
  const cards = programs.map((p) => {
    const labelColor = p.fitLabelColor ?? "var(--blue)";
    const badge = p.fitLabel
      ? `<span style="display:inline-block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${escapeAttr(labelColor)};background:${escapeAttr(labelColor)}1a;padding:2px 8px;border-radius:4px">${escapeHtml(p.fitLabel)}</span>`
      : "";

    const meta: string[] = [];
    if (p.trainer) meta.push(escapeHtml(p.trainer));
    if (p.duration) meta.push(escapeHtml(p.duration));
    const metaLine = meta.length > 0
      ? `<div style="font-size:12px;color:var(--text-tertiary);margin-top:2px">${meta.join(" \u00B7 ")}</div>`
      : "";

    return `<div style="padding:12px 0;border-top:1px solid var(--separator)">
  <div style="display:flex;align-items:center;gap:8px">
    <div style="font-size:15px;font-weight:600">${escapeHtml(p.name)}</div>
    ${badge}
  </div>
  ${metaLine}
  ${p.description ? `<div style="font-size:13px;color:var(--text-secondary);line-height:1.45;margin-top:6px">${escapeHtml(p.description)}</div>` : ""}
  ${p.whenToUse ? `<div style="font-size:13px;color:var(--green);line-height:1.45;margin-top:6px">${escapeHtml(p.whenToUse)}</div>` : ""}
  ${p.cautions ? `<div style="font-size:13px;color:var(--orange);line-height:1.45;margin-top:4px">${escapeHtml(p.cautions)}</div>` : ""}
</div>`;
  }).join("");

  return `<h2 class="section-header" style="font-size:13px">Recommended Programs</h2>
<div class="card">
${cards}
</div>`;
}

function bodiHybridSchedulesHtml(schedules: BodiHybridSchedule[]): string {
  const sections = schedules.map((sched, index) => {
    const signalName = `bodi_sched_${index}`;

    const rows = sched.days.map((d) => {
      const cells: string[] = [];
      cells.push(`<div style="font-size:13px;font-weight:600;min-width:80px">${escapeHtml(d.day)}</div>`);

      const sessions: string[] = [];
      if (d.mobilitySession) sessions.push(`<span style="color:var(--green)">${escapeHtml(d.mobilitySession)}</span>`);
      if (d.bodiSession) sessions.push(`<span style="color:var(--blue)">${escapeHtml(d.bodiSession)}</span>`);
      if (sessions.length === 0 && d.notes) sessions.push(`<span style="color:var(--text-tertiary)">${escapeHtml(d.notes)}</span>`);

      cells.push(`<div style="font-size:13px;flex:1">${sessions.join(`<span style="color:var(--text-tertiary)"> + </span>`)}</div>`);

      if (sessions.length > 0 && d.notes) {
        cells.push(`<div style="font-size:12px;color:var(--text-tertiary);max-width:200px;text-align:right">${escapeHtml(d.notes)}</div>`);
      }

      return `<div style="display:flex;align-items:baseline;gap:12px;padding:8px 0;border-top:1px solid var(--separator)">${cells.join("")}</div>`;
    }).join("");

    return `<div class="skill-card" data-signals:${signalName}="${index === 0}">
  <div class="skill-header" data-on:click="$${signalName} = !$${signalName}">
    <span class="skill-name">${escapeHtml(sched.name)}</span>
  </div>
  <div class="skill-body" data-show="$${signalName}">
    ${sched.description ? `<div style="font-size:13px;color:var(--text-secondary);line-height:1.45;margin-bottom:8px">${escapeHtml(sched.description)}</div>` : ""}
    ${rows}
  </div>
</div>`;
  }).join("\n");

  return `<h2 class="section-header" style="font-size:13px">Hybrid Schedules</h2>\n${sections}`;
}

function bodiIntegrationRulesHtml(rules: BodiIntegrationRule[]): string {
  const sorted = [...rules].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));

  const categoryColors: Record<string, string> = {
    ordering: "var(--blue)",
    safety: "var(--orange)",
    timing: "var(--green)",
  };

  const items = sorted.map((r) => {
    const catColor = r.category ? (categoryColors[r.category] ?? "var(--text-tertiary)") : "var(--text-tertiary)";
    const catBadge = r.category
      ? `<span style="display:inline-block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${catColor};margin-right:6px">${escapeHtml(r.category)}</span>`
      : "";

    return `<div style="padding:8px 0;border-top:1px solid var(--separator);display:flex;align-items:baseline;gap:8px">
  <div style="font-size:13px;font-weight:700;color:var(--text-tertiary);min-width:18px">${r.priority ?? ""}</div>
  <div style="flex:1">
    ${catBadge}<span style="font-size:13px;line-height:1.45">${escapeHtml(r.rule)}</span>
  </div>
</div>`;
  }).join("");

  return `<h2 class="section-header" style="font-size:13px">Integration Rules</h2>
<div class="card">
${items}
</div>`;
}

// ── Program Library section ──────────────────────────────────────────

/**
 * Lists all programs in the user's library with switch/delete actions.
 * Only shown when more than one program exists.
 */
export function programLibrarySection(programs: ProgramRow[]): string {
  const items = programs.map((p) => {
    const parsed = (() => {
      try {
        return JSON.parse(p.json_data) as { meta?: { title?: string; subtitle?: string } };
      } catch {
        return null;
      }
    })();
    const title = parsed?.meta?.title ?? `Program #${p.id}`;
    const subtitle = parsed?.meta?.subtitle;
    const isActive = p.is_active === 1;
    const uploadedDate = p.created_at.slice(0, 10);

    const activeBadge = isActive
      ? `<span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--green);background:rgba(48,209,88,0.12);padding:2px 8px;border-radius:4px;margin-left:8px">Active</span>`
      : "";

    const actions = isActive
      ? ""
      : `<div style="display:flex;gap:8px;margin-top:8px">
  <button class="btn btn-blue" style="font-size:12px;padding:4px 14px;height:auto"
    data-on:click="@post('/api/switch-program/${p.id}')"
    data-indicator:_switching data-attr:disabled="$_switching">
    <span data-show="!$_switching">Switch To</span>
    <span data-show="$_switching">Switching\u2026</span>
  </button>
  <button class="btn" style="font-size:12px;padding:4px 14px;height:auto;color:var(--orange);border-color:var(--orange)"
    data-on:click="@post('/api/delete-program/${p.id}')"
    data-indicator:_deleting data-attr:disabled="$_deleting">
    <span data-show="!$_deleting">Delete</span>
    <span data-show="$_deleting">Deleting\u2026</span>
  </button>
</div>`;

    return `<div style="padding:12px 0;${isActive ? "" : "opacity:0.75"}">
  <div style="display:flex;align-items:center">
    <span style="font-size:15px;font-weight:600">${escapeHtml(title)}</span>
    ${activeBadge}
  </div>
  ${subtitle ? `<div style="font-size:13px;color:var(--text-secondary);margin-top:2px">${escapeHtml(subtitle)}</div>` : ""}
  <div style="font-size:12px;color:var(--text-tertiary);margin-top:2px">Imported ${escapeHtml(uploadedDate)}</div>
  ${actions}
</div>`;
  }).join(`<div style="border-top:1px solid var(--separator)"></div>`);

  return `<h2 class="section-header">Program Library</h2>
<div class="card">
${items}
</div>`;
}

// ── Import Program section ──────────────────────────────────────────

/**
 * Collapsible "Import New Program" section shown at the bottom of the
 * Program page. Mirrors the setup page upload/validate flow but posts
 * to /api/validate-import-program and /api/import-program.
 *
 * Signals used (all scoped to this element via data-signals):
 *   $importOpen        — whether the section is expanded
 *   $importProgramJson — the uploaded JSON string (Datastar converts kebab to camelCase)
 *   $importTemplateId  — the selected week template ID
 */
export function importProgramSection(): string {
  return `<div data-signals:import-open="false" data-signals:import-program-json="''" data-signals:import-template-id="''">
  <h2 class="section-header" style="display:flex;align-items:center;justify-content:space-between">
    <span>Import Program</span>
    <button
      class="btn btn-blue"
      style="font-size:12px;padding:4px 12px;height:auto"
      data-on:click="$importOpen = !$importOpen"
    >
      <span data-text="$importOpen ? 'Cancel' : 'Upload JSON'">Upload JSON</span>
    </button>
  </h2>

  <div data-show="$importOpen">
    <div class="card" style="margin-bottom:12px">
      <div class="form-group" style="margin-bottom:16px">
        <label class="form-label">Program JSON File</label>
        <input type="file" accept=".json" class="form-input"
          data-on:change="
            const f = evt.target.files[0];
            if (!f) return;
            f.text().then(t => {
              const el = document.getElementById('importProgramData');
              el.value = t;
              el.dispatchEvent(new Event('input', {bubbles: true}));
              $importTemplateId = '';
              document.getElementById('import-validation-result').innerHTML = '';
            });
          " />
        <input type="text" id="importProgramData" data-bind:import-program-json style="display:none" />
      </div>
      <button
        class="btn btn-blue btn-block"
        data-on:click="@post('/api/validate-import-program')"
        data-indicator:_validating
        data-attr:disabled="$_validating"
      >
        <span data-show="!$_validating">Validate &amp; Preview</span>
        <span data-show="$_validating">Validating\u2026</span>
      </button>
    </div>

    <div id="import-validation-result"></div>

    <div data-show="$importTemplateId !== ''" style="margin-top:12px">
      <button
        class="btn btn-blue btn-block"
        data-on:click="@post('/api/import-program')"
        data-indicator:_importing
        data-attr:disabled="$_importing"
      >
        <span data-show="!$_importing">Apply Program</span>
        <span data-show="$_importing">Importing\u2026</span>
      </button>
    </div>
  </div>
</div>`;
}

/**
 * SSE fragment: week template selection cards for the import flow.
 * Rendered inside #import-validation-result after successful validation.
 * Clicking a card sets $importTemplateId and shows the Apply button.
 */
export function importTemplateSelectionFragment(templates: WeekTemplate[]): string {
  const grid = renderTemplateGrid(
    templates,
    (id) =>
      `data-on:click="$importTemplateId = '${escapeAttr(id)}'" data-class:selected="$importTemplateId === '${escapeAttr(id)}'"`,
  );

  return `<div class="card" style="margin-bottom:0">
  <div class="form-group" style="margin-bottom:0">
    <label class="form-label">Choose Schedule</label>
    ${grid}
  </div>
</div>`;
}
