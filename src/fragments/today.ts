// ──────────────────────────────────────────────────────────────────
// Today page fragments — CARs card, hero session, completed, upcoming
// ──────────────────────────────────────────────────────────────────

import type { Session, QueueItemRow } from "../types";
import type { UpcomingItem } from "../domain/reflow";

/**
 * Daily CARs card — always shown at the top of Today.
 * Green accent label, exercise count, Push to Hevy + Details.
 */
export function carsCard(session: Session): string {
  const count = session.exercises.length;
  const subtitle = session.subtitle ?? `${count} exercises`;

  return `<div class="card">
  <div class="card-label" style="color: var(--green)">Daily</div>
  <div class="card-title">${escapeHtml(session.title)}</div>
  <div class="card-subtitle">${escapeHtml(subtitle)}</div>
  <div style="display:flex; gap:8px; margin-top:14px">
    <button class="btn btn-blue" data-on-click="$$post('/api/push-hevy/daily')">Push to Hevy</button>
    <a href="/session/daily" class="btn btn-ghost">Details</a>
  </div>
</div>`;
}

/**
 * Hero session card — the next main session from the queue.
 * Blue accent label, description preview, Push to Hevy + Details.
 */
export function heroSessionCard(session: Session, queueItem: QueueItemRow): string {
  const count = session.exercises.length;
  const subtitle = session.subtitle ?? `${count} exercises`;
  const desc = session.description
    ? `<div class="card-desc">${escapeHtml(truncate(session.description, 120))}</div>`
    : "";

  return `<div class="card">
  <div class="card-label" style="color: var(--blue)">Next Session</div>
  <div class="card-title">${escapeHtml(session.title)}</div>
  <div class="card-subtitle">${escapeHtml(subtitle)}</div>
  ${desc}
  <div style="display:flex; gap:8px; margin-top:14px">
    <button class="btn btn-blue" data-on-click="$$post('/api/push-hevy/${escapeAttr(queueItem.session_id)}')">Push to Hevy</button>
    <a href="/session/${escapeAttr(session.id)}" class="btn btn-ghost">Details</a>
  </div>
</div>`;
}

/**
 * Completed section — items finished earlier today.
 * Shown with strikethrough text and a green checkmark.
 */
export function completedSection(items: Array<{ title: string }>): string {
  if (items.length === 0) return "";

  const rows = items
    .map(
      (item) =>
        `<div class="completed-item">
  <span class="completed-title">${escapeHtml(item.title)}</span>
  <span class="completed-check">&#10003;</span>
</div>`
    )
    .join("\n");

  return `<div class="section-header">Completed Today</div>
<div class="card">
${rows}
</div>`;
}

/**
 * Upcoming section — next sessions in queue with colored dots and spacers.
 */
export function upcomingSection(items: UpcomingItem[]): string {
  if (items.length === 0) return "";

  const rows = items
    .map((item) => {
      if (item.type === "spacer") {
        return `<div class="upcoming-item upcoming-spacer">
  <div class="upcoming-dot" style="background: var(--text-tertiary)"></div>
  <span class="upcoming-title">${escapeHtml(item.title)}</span>
</div>`;
      }

      const dotColor = item.color ?? "var(--blue)";
      const countLabel = item.exerciseCount
        ? `<span class="upcoming-count">${item.exerciseCount} exercises</span>`
        : "";

      return `<div class="upcoming-item">
  <div class="upcoming-dot" style="background: ${dotColor}"></div>
  <span class="upcoming-title">${escapeHtml(item.title)}</span>
  ${countLabel}
</div>`;
    })
    .join("\n");

  return `<div class="section-header">Coming Up</div>
<div class="card">
${rows}
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

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max).replace(/\s+\S*$/, "") + "\u2026";
}
