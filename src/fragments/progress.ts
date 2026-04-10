// ──────────────────────────────────────────────────────────────────
// Progress page fragments — skills, roadmap, benchmarks
// ──────────────────────────────────────────────────────────────────

import type { Skill, RoadmapPhase, Benchmark, BenchmarkResultRow } from "../types";
import { escapeHtml, escapeAttr } from "../utils/html";
import { evaluateGateTests, isRetestDue, formatTrend } from "../domain/benchmarks";

/**
 * Render a single skill card. Used by skillCards() for the full list,
 * and by the POST handler to patch a single card via SSE.
 */
export function skillCardHtml(
  skill: Skill,
  expanded: boolean,
  assessments?: Map<string, string>
): string {
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
  const hasCurrentState = !!currentStateText;
  const currentStateHtml = hasCurrentState
    ? `<div class="skill-current-state" id="assess-${escapeAttr(skill.id)}">
  <div class="current-state-label">Where You Are</div>
  <div class="current-state-text">${escapeHtml(currentStateText)}</div>
</div>`
    : "";

  const editSignal = `editing_${signalName}`;
  const textSignal = `assess_${signalName}`;
  const jsText = JSON.stringify(currentStateText ?? "");

  const editHtml = hasCurrentState
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

  const editSignalsAttr = hasCurrentState
    ? ` data-signals:${editSignal}="false" data-signals:${textSignal}="${escapeAttr(jsText)}"`
    : "";

  return `<div class="skill-card" data-signals:${signalName}="${expanded}"${editSignalsAttr}>
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
}

/**
 * Skill cards — expandable cards with icon, name, timeline, priority badge.
 * The first card is expanded by default; others are collapsed.
 * Uses Datastar signals for expand/collapse toggling.
 */
export function skillCards(skills: Skill[], assessments?: Map<string, string>): string {
  if (skills.length === 0) return "";
  const cards = skills.map((skill, index) => skillCardHtml(skill, index === 0, assessments));
  return `<div class="section-header">Skills</div>\n${cards.join("\n")}`;
}

/**
 * Roadmap section — phase list with current phase highlighted and gate test checklist.
 */
export function roadmapSection(
  phases: RoadmapPhase[],
  results: BenchmarkResultRow[],
  benchmarks: Benchmark[]
): string {
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

      let gateHtml = "";
      if (phase.gateTests && phase.gateTests.length > 0) {
        const evaluation = evaluateGateTests(phase.gateTests, results);
        const gateItems = evaluation.tests
          .map((t) => {
            const name =
              benchmarks.find((bm) => bm.id === t.benchmarkId)?.name ?? t.benchmarkId;
            const icon = t.passed ? "\u2713" : "\u2717";
            const itemCls = t.passed ? "gate-passed" : "gate-not-passed";
            return `<div class="gate-item ${itemCls}">${icon} ${escapeHtml(name)}</div>`;
          })
          .join("\n");

        const allPassedBadge = evaluation.allPassed
          ? `<div class="gate-all-passed">All gates passed</div>`
          : "";

        gateHtml = `<div class="gate-checklist">
${gateItems}
${allPassedBadge}
</div>`;
      }

      return `<div class="roadmap-item${cls}">
  <div class="roadmap-indicator" style="background:${dotColor}"></div>
  <div>
    <div class="roadmap-name">${escapeHtml(phase.name)}</div>
    ${phase.weeks ? `<div class="roadmap-weeks">${escapeHtml(phase.weeks)}</div>` : ""}
    ${phase.summary ? `<div class="roadmap-summary">${escapeHtml(phase.summary)}</div>` : ""}
    ${gateHtml}
  </div>
</div>`;
    })
    .join("\n");

  return `<div class="section-header">Roadmap</div>
<div class="card">
${items}
</div>`;
}

/** Render a single benchmark card with results, trend, and log form. */
export function benchmarkCard(
  b: Benchmark,
  results: BenchmarkResultRow[],
  today: string
): string {
  const leftResults = results.filter((r) => r.side === "left");
  const rightResults = results.filter((r) => r.side === "right");
  const nullSideResults = results.filter((r) => r.side === null);
  const hasBilateral = leftResults.length > 0 || rightResults.length > 0;

  const latestResult =
    results.length > 0
      ? results.reduce((a, c) => (a.tested_at > c.tested_at ? a : c))
      : null;

  const retestDue = isRetestDue(latestResult?.tested_at ?? null, b.frequencyDays, today);

  const daysAgo =
    latestResult != null
      ? Math.floor(
          (new Date(today).getTime() - new Date(latestResult.tested_at).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

  // Trend display
  let trendHtml: string;
  if (hasBilateral) {
    const leftTrend = formatTrend(leftResults);
    const rightTrend = formatTrend(rightResults);
    trendHtml = `<div class="benchmark-trend">L: ${escapeHtml(leftTrend)}</div>
<div class="benchmark-trend">R: ${escapeHtml(rightTrend)}</div>`;
  } else {
    trendHtml = `<div class="benchmark-trend">${escapeHtml(formatTrend(nullSideResults))}</div>`;
  }

  const retestHtml = retestDue
    ? `<div class="benchmark-retest">Due for retest</div>`
    : "";

  const lastTestedHtml =
    daysAgo != null
      ? `<div class="benchmark-last-tested">Last tested: ${daysAgo} day${daysAgo !== 1 ? "s" : ""} ago</div>`
      : "";

  // Show side selector if already has bilateral results or target mentions "each side"
  const showSideSelector = hasBilateral || (b.target != null && /each side/i.test(b.target));

  // Log form — Datastar signals for toggle, $$post for SSE form submission
  const sig = `bench_${b.id.replace(/[^a-zA-Z0-9]/g, "_")}`;

  const formHtml = `<div data-signals-${sig}_open="false">
  <button class="btn btn-sm" data-on-click="$${sig}_open = !$${sig}_open">Log Result</button>
  <form data-show="$${sig}_open"
        data-on-submit__prevent="$$post('/api/log-benchmark/${escapeAttr(b.id)}')"
        style="margin-top:8px">
    <input type="text" name="value" placeholder="${escapeAttr(b.unit ?? "Value")}" required style="width:100%;margin-bottom:4px">
    ${showSideSelector ? `<select name="side" style="width:100%;margin-bottom:4px">
      <option value="">No side</option>
      <option value="left">Left</option>
      <option value="right">Right</option>
    </select>` : ""}
    <label style="display:flex;align-items:center;gap:4px;margin-bottom:4px">
      <input type="checkbox" name="passed" value="true"> Target met
    </label>
    <input type="text" name="notes" placeholder="Notes (optional)" style="width:100%;margin-bottom:4px">
    <button type="submit" class="btn btn-sm btn-primary">Save</button>
  </form>
</div>`;

  return `<div class="benchmark-item" id="benchmark-${escapeAttr(b.id)}">
  <div class="benchmark-name">${escapeHtml(b.name)}</div>
  ${b.target ? `<div class="benchmark-target">${escapeHtml(b.target)}</div>` : ""}
  ${trendHtml}
  ${lastTestedHtml}
  ${retestHtml}
  ${formHtml}
</div>`;
}

/**
 * Benchmarks section — list with name, target, trend, retest indicator, and log form.
 */
export function benchmarksSection(
  benchmarks: Benchmark[],
  results: BenchmarkResultRow[],
  today: string
): string {
  if (benchmarks.length === 0) return "";

  const items = benchmarks
    .map((b) => {
      const benchResults = results.filter((r) => r.benchmark_id === b.id);
      return benchmarkCard(b, benchResults, today);
    })
    .join("\n");

  return `<div class="section-header">Benchmarks</div>
<div class="card">
${items}
</div>`;
}
