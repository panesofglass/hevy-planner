// ──────────────────────────────────────────────────────────────────
// Today page fragments — CARs card, hero routine, completed, upcoming
// ──────────────────────────────────────────────────────────────────

import type { Routine, QueueItemRow } from "../types";
import type { UpcomingItem } from "../domain/reflow";
import { escapeHtml, escapeAttr, truncate } from "../utils/html";

/**
 * Daily CARs card — always shown at the top of Today.
 * Green accent label, exercise count, Push to Hevy + Details.
 */
export function carsCard(routine: Routine, hevyRoutineId?: string): string {
  const count = routine.exercises.length;
  const subtitle = routine.subtitle ?? `${count} exercises`;

  const hevyButton = hevyRoutineId
    ? `<a href="https://hevy.com/routine/${escapeAttr(hevyRoutineId)}" target="_blank" class="btn btn-blue">Open in Hevy</a>`
    : `<button class="btn btn-blue" data-on:click="@post('/api/push-hevy/daily')">Push to Hevy</button>`;

  return `<div class="card">
  <div class="card-label" style="color: var(--green)">Daily</div>
  <div class="card-title">${escapeHtml(routine.title)}</div>
  <div class="card-subtitle">${escapeHtml(subtitle)}</div>
  <div style="display:flex; gap:8px; margin-top:14px">
    ${hevyButton}
    <a href="/routine/daily" class="btn btn-ghost">Details</a>
  </div>
</div>`;
}

/**
 * Hero routine card — the next main routine from the queue.
 * Blue accent label, description preview, Push to Hevy + Details.
 */
export function heroRoutineCard(routine: Routine, queueItem: QueueItemRow): string {
  const count = routine.exercises.length;
  const subtitle = routine.subtitle ?? `${count} exercises`;
  const desc = routine.description
    ? `<div class="card-desc">${escapeHtml(truncate(routine.description, 120))}</div>`
    : "";

  const hevyButton = queueItem.hevy_routine_id
    ? `<a href="https://hevy.com/routine/${escapeAttr(queueItem.hevy_routine_id)}" target="_blank" class="btn btn-blue">Open in Hevy</a>`
    : `<button class="btn btn-blue" data-on:click="@post('/api/push-hevy/${escapeAttr(queueItem.routine_id)}')">Push to Hevy</button>`;

  return `<div class="card">
  <div class="card-label" style="color: var(--blue)">Next Session</div>
  <div class="card-title">${escapeHtml(routine.title)}</div>
  <div class="card-subtitle">${escapeHtml(subtitle)}</div>
  ${desc}
  <div style="display:flex; gap:8px; margin-top:14px">
    ${hevyButton}
    <a href="/routine/${escapeAttr(routine.id)}" class="btn btn-ghost">Details</a>
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

