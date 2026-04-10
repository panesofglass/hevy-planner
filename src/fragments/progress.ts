// ──────────────────────────────────────────────────────────────────
// Progress page fragments — skills, roadmap, benchmarks
// ──────────────────────────────────────────────────────────────────

import type { Skill, RoadmapPhase, Benchmark } from "../types";
import { escapeHtml, escapeAttr } from "../utils/html";

/**
 * Skill cards — expandable cards with icon, name, timeline, priority badge.
 * The first card is expanded by default; others are collapsed.
 * Uses Datastar signals for expand/collapse toggling.
 */
export function skillCards(skills: Skill[], assessments?: Map<string, string>): string {
  if (skills.length === 0) return "";

  const cards = skills.map((skill, index) => {
    const expanded = index === 0;
    const signalName = `skill_${skill.id.replace(/[^a-zA-Z0-9]/g, "_")}`;
    const iconBg = skill.color ? `background:${escapeAttr(skill.color)}22` : "background:rgba(255,255,255,0.06)";
    const iconColor = escapeAttr(skill.color ?? "var(--text)");
    const priorityLabel = skill.priority != null ? `#${skill.priority}` : "";

    const milestonesHtml =
      skill.milestones && skill.milestones.length > 0
        ? `<ul class="milestone-list">${skill.milestones
            .map(
              (m) =>
                `<li class="milestone-item">
  <div class="milestone-dot" style="background:${escapeAttr(skill.color ?? "var(--blue)")}"></div>
  <div>
    <div class="milestone-name">${escapeHtml(m.name)}</div>
    ${m.description ? `<div class="milestone-desc">${escapeHtml(m.description)}</div>` : ""}
    ${m.targetWeek != null ? `<div class="milestone-week">Week ${m.targetWeek}</div>` : ""}
  </div>
</li>`
            )
            .join("")}</ul>`
        : "";

    const currentStateText = assessments?.get(skill.id) ?? skill.currentState;
    const currentStateHtml = currentStateText
      ? `<div class="skill-current-state" id="assess-${escapeAttr(skill.id)}">
  <div class="current-state-label">Where You Are</div>
  <div class="current-state-text">${escapeHtml(currentStateText)}</div>
</div>`
      : "";

    const editSignal = `editing_${signalName}`;
    const textSignal = `assess_${signalName}`;
    const jsText = JSON.stringify(currentStateText ?? "");

    const editHtml = currentStateText != null
      ? `<div class="skill-edit-row" data-show="!$${editSignal}">
  <button class="btn-link" data-on:click="$${editSignal} = true">Edit</button>
</div>
<div class="skill-edit-form" data-show="$${editSignal}">
  <textarea class="form-input" rows="3" data-bind:${textSignal}></textarea>
  <div class="skill-edit-actions">
    <button class="btn btn-blue btn-sm" data-on:click="@post('/api/skill-assessment/${escapeAttr(skill.id)}')">Save</button>
    <button class="btn btn-ghost btn-sm" data-on:click="$${editSignal} = false">Cancel</button>
  </div>
</div>`
      : "";

    return `<div class="skill-card" data-signals:${signalName}="${expanded}" data-signals:${editSignal}="false" data-signals:${textSignal}="${escapeAttr(jsText)}">
  <div class="skill-header" data-on:click="$${signalName} = !$${signalName}">
    <div class="skill-icon" style="${iconBg}; color:${iconColor}">${escapeHtml(skill.icon ?? "")}</div>
    <span class="skill-name">${escapeHtml(skill.name)}</span>
    ${priorityLabel ? `<span class="skill-priority">${escapeHtml(priorityLabel)}</span>` : ""}
  </div>
  <div class="skill-body" data-show="$${signalName}">
    ${currentStateHtml}
    ${editHtml}
    ${skill.timeline ? `<div class="skill-timeline">${escapeHtml(skill.timeline)}</div>` : ""}
    ${milestonesHtml}
  </div>
</div>`;
  });

  return `<div class="section-header">Skills</div>\n${cards.join("\n")}`;
}

/**
 * Roadmap section — static phase list with current phase highlighted.
 */
export function roadmapSection(phases: RoadmapPhase[]): string {
  if (phases.length === 0) return "";

  const sorted = [...phases].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const items = sorted
    .map((phase) => {
      const isCurrent = phase.status === "current";
      const isCompleted = phase.status === "completed";
      const cls = isCurrent ? " roadmap-current" : "";
      const dotColor = isCurrent
        ? "var(--blue)"
        : isCompleted
          ? "var(--green)"
          : "var(--text-tertiary)";

      return `<div class="roadmap-item${cls}">
  <div class="roadmap-indicator" style="background:${dotColor}"></div>
  <div>
    <div class="roadmap-name">${escapeHtml(phase.name)}</div>
    ${phase.weeks ? `<div class="roadmap-weeks">${escapeHtml(phase.weeks)}</div>` : ""}
    ${phase.summary ? `<div class="roadmap-summary">${escapeHtml(phase.summary)}</div>` : ""}
  </div>
</div>`;
    })
    .join("\n");

  return `<div class="section-header">Roadmap</div>
<div class="card">
${items}
</div>`;
}

/**
 * Benchmarks section — static list with name, target, how-to.
 */
export function benchmarksSection(benchmarks: Benchmark[]): string {
  if (benchmarks.length === 0) return "";

  const items = benchmarks
    .map(
      (b) =>
        `<div class="benchmark-item">
  <div class="benchmark-name">${escapeHtml(b.name)}</div>
  ${b.target ? `<div class="benchmark-target">${escapeHtml(b.target)}</div>` : ""}
  <div class="benchmark-howto">${escapeHtml(b.howTo)}</div>
</div>`
    )
    .join("\n");

  return `<div class="section-header">Benchmarks</div>
<div class="card">
${items}
</div>`;
}

