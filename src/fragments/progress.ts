// ──────────────────────────────────────────────────────────────────
// Progress page fragments — skills, roadmap, benchmarks
// ──────────────────────────────────────────────────────────────────

import type { Skill, RoadmapPhase, Benchmark } from "../types";

/**
 * Skill cards — expandable cards with icon, name, timeline, priority badge.
 * The first card is expanded by default; others are collapsed.
 * Uses Datastar signals for expand/collapse toggling.
 */
export function skillCards(skills: Skill[]): string {
  if (skills.length === 0) return "";

  const cards = skills.map((skill, index) => {
    const expanded = index === 0;
    const signalName = `skill_${skill.id.replace(/[^a-zA-Z0-9]/g, "_")}`;
    const iconBg = skill.color ? `background:${skill.color}22` : "background:rgba(255,255,255,0.06)";
    const iconColor = skill.color ?? "var(--text)";
    const priorityLabel = skill.priority != null ? `#${skill.priority}` : "";

    const milestonesHtml =
      skill.milestones && skill.milestones.length > 0
        ? `<ul class="milestone-list">${skill.milestones
            .map(
              (m) =>
                `<li class="milestone-item">
  <div class="milestone-dot" style="background:${skill.color ?? "var(--blue)"}"></div>
  <div>
    <div class="milestone-name">${escapeHtml(m.name)}</div>
    ${m.description ? `<div class="milestone-desc">${escapeHtml(m.description)}</div>` : ""}
    ${m.targetWeek != null ? `<div class="milestone-week">Week ${m.targetWeek}</div>` : ""}
  </div>
</li>`
            )
            .join("")}</ul>`
        : "";

    return `<div class="skill-card" data-signals:${signalName}="${expanded}">
  <div class="skill-header" data-on:click="$${signalName} = !$${signalName}">
    <div class="skill-icon" style="${iconBg}; color:${iconColor}">${skill.icon ?? ""}</div>
    <span class="skill-name">${escapeHtml(skill.name)}</span>
    ${priorityLabel ? `<span class="skill-priority">${escapeHtml(priorityLabel)}</span>` : ""}
  </div>
  <div class="skill-body" data-show="$${signalName}">
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
      const dotColor = isCompleted
        ? "var(--green)"
        : isCurrent
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

// ── Helpers ──

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
