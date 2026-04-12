// ──────────────────────────────────────────────────────────────────
// Progress page fragments — skills, roadmap, benchmarks
// ──────────────────────────────────────────────────────────────────

import type { Skill, RoadmapPhase, Benchmark, BenchmarkResultRow } from "../types";
import { escapeHtml, escapeAttr } from "../utils/html";
import { evaluateGateTests, isRetestDue, formatTrend } from "../domain/benchmarks";
import { resolvePhaseStatuses, filterResultsSince } from "../domain/phases";

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
    <button class="btn btn-blue btn-sm" data-on:click="@post('/api/skill-assessment/${escapeAttr(skill.id)}')" data-indicator:_savingAssess data-attr:disabled="$_savingAssess">
      <span data-show="!$_savingAssess">Save</span>
      <span data-show="$_savingAssess">Saving\u2026</span>
    </button>
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
  if (skills.length === 0) {
    return `<h2 class="section-header">Skills</h2>
<div class="card">
  <p class="empty-state">No skills defined in this program</p>
</div>`;
  }
  const cards = skills.map((skill, index) => skillCardHtml(skill, index === 0, assessments));
  return `<h2 class="section-header">Skills</h2>\n${cards.join("\n")}`;
}

/**
 * Roadmap section — phase list with current phase highlighted and gate test checklist.
 * Gate evaluation for the current phase uses only results logged after phaseAdvancedAt
 * (if set). For Phase 1 (no advancement), all results are used.
 */
export function roadmapSection(
  phases: RoadmapPhase[],
  results: BenchmarkResultRow[],
  benchmarks: Benchmark[],
  currentPhaseId: string | null,
  phaseAdvancedAt?: string | null
): string {
  if (phases.length === 0) return "";

  const resolved = resolvePhaseStatuses(phases, currentPhaseId);
  const currentPhaseResults = filterResultsSince(results, phaseAdvancedAt);
  const benchmarkById = new Map(benchmarks.map((b) => [b.id, b]));

  const items = resolved
    .map((phase) => {
      const isCurrent = phase.status === "current";
      const isCompleted = phase.status === "completed";
      const isFuture = phase.status === "future";
      const cls = isCurrent ? " roadmap-current" : isCompleted ? " completed" : "";
      const dotColor = isCurrent
        ? "var(--blue)"
        : isCompleted
          ? "var(--green)"
          : "var(--text-tertiary)";

      let gateHtml = "";
      if (phase.gateTests && phase.gateTests.length > 0) {
        // Use filtered results for current phase, all results for completed phases
        const evalResults = isCurrent ? currentPhaseResults : results;
        const evaluation = isFuture ? null : evaluateGateTests(phase.gateTests, evalResults);
        const gateItems = phase.gateTests
          .map((gateId) => {
            const name = benchmarkById.get(gateId)?.name ?? gateId;
            if (isFuture) {
              return `<div class="gate-item">${escapeHtml(name)}</div>`;
            }
            const test = evaluation!.tests.find((t) => t.benchmarkId === gateId);
            const icon = test?.passed ? "\u2713" : "\u2717";
            const itemCls = test?.passed ? "gate-passed" : "gate-not-passed";
            return `<div class="gate-item ${itemCls}">${icon} ${escapeHtml(name)}</div>`;
          })
          .join("\n");

        let allPassedBadge = "";
        if (evaluation?.allPassed && isCurrent) {
          allPassedBadge = `<div class="gate-all-passed">All gates passed \u2014 ready to advance</div>
<form data-on:submit__prevent="@post('/api/advance-phase/${escapeAttr(phase.id)}')" style="margin-top:8px">
  <button type="submit" class="btn btn-sm btn-primary" data-indicator:_advancing data-attr:disabled="$_advancing">
    <span data-show="!$_advancing">Advance to Next Phase</span>
    <span data-show="$_advancing">Advancing\u2026</span>
  </button>
</form>`;
        } else if (evaluation?.allPassed && isCompleted) {
          allPassedBadge = `<div class="gate-all-passed">All gates passed</div>`;
        }

        gateHtml = `<div class="gate-checklist">
${gateItems}
${allPassedBadge}
</div>`;
      }

      return `<div class="roadmap-item${cls}"><div class="roadmap-indicator" style="background:${dotColor}"></div><div><div class="roadmap-name">${escapeHtml(phase.name)}</div>
    ${phase.weeks ? `<div class="roadmap-weeks">${escapeHtml(phase.weeks)}</div>` : ""}
    ${phase.summary ? `<div class="roadmap-summary">${escapeHtml(phase.summary)}</div>` : ""}
    ${gateHtml}
  </div>
</div>`;
    })
    .join("\n");

  const allCompleted = resolved.every((p) => p.status === "completed");
  const completeBadge = allCompleted
    ? `<div class="gate-all-passed" style="margin-top:12px">Program complete</div>`
    : "";

  return `<div id="roadmap-section"><h2 class="section-header">Roadmap</h2>
<div class="card">
${items}
${completeBadge}
</div></div>`;
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

  let retestHtml = "";
  if (retestDue) {
    retestHtml = `<div class="benchmark-retest">Due for retest</div>`;
  } else if (b.frequencyDays && latestResult) {
    const daysSince = daysAgo ?? 0;
    const daysUntil = b.frequencyDays - daysSince;
    if (daysUntil > 0) {
      retestHtml = `<div class="benchmark-retest-info">Retest due in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}</div>`;
    }
  }

  const lastTestedHtml =
    daysAgo != null
      ? `<div class="benchmark-last-tested">Last tested: ${daysAgo} day${daysAgo !== 1 ? "s" : ""} ago</div>`
      : "";

  // Show side selector if already has bilateral results or target mentions "each side"
  const showSideSelector = hasBilateral || (b.target != null && /each side/i.test(b.target));

  // Log form — Datastar signals for toggle, $$post for SSE form submission
  const sig = `bench_${b.id.replace(/[^a-zA-Z0-9]/g, "_")}`;

  const formHtml = `<div data-signals:${sig}_open="false">
  <button class="btn btn-sm" data-on:click="$${sig}_open = !$${sig}_open">Log Result</button>
  <form data-show="$${sig}_open"
        data-on:submit__prevent="@post('/api/log-benchmark/${escapeAttr(b.id)}')"
        style="margin-top:8px">
    <input type="text" name="value" placeholder="${escapeAttr(b.unit ?? "Value")}" required class="form-input" style="margin-bottom:4px">
    ${showSideSelector ? `<select name="side" class="form-input" style="margin-bottom:4px">
      <option value="">No side</option>
      <option value="left">Left</option>
      <option value="right">Right</option>
    </select>` : ""}
    <label style="display:flex;align-items:center;gap:4px;margin-bottom:4px">
      <input type="checkbox" name="passed" value="true"> Target met
    </label>
    <input type="text" name="notes" placeholder="Notes (optional)" class="form-input" style="margin-bottom:4px">
    <button type="submit" class="btn btn-sm btn-primary" data-indicator:_savingBench data-attr:disabled="$_savingBench">
      <span data-show="!$_savingBench">Save</span>
      <span data-show="$_savingBench">Saving\u2026</span>
    </button>
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
  if (benchmarks.length === 0) {
    return `<h2 class="section-header">Benchmarks</h2>
<div class="card">
  <p class="empty-state">No benchmarks defined in this program</p>
</div>`;
  }

  const resultsByBenchmark = new Map<string, BenchmarkResultRow[]>();
  for (const r of results) {
    const list = resultsByBenchmark.get(r.benchmark_id) ?? [];
    list.push(r);
    resultsByBenchmark.set(r.benchmark_id, list);
  }

  const items = benchmarks
    .map((b) => benchmarkCard(b, resultsByBenchmark.get(b.id) ?? [], today))
    .join("\n");

  return `<h2 class="section-header">Benchmarks</h2>
<div class="card">
${items}
</div>`;
}
