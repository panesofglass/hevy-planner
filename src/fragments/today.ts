// ──────────────────────────────────────────────────────────────────
// Today page fragments — CARs card, hero routine, completed, upcoming
// ──────────────────────────────────────────────────────────────────

import type { Routine, QueueItemRow } from "../types";
import type { UpcomingItem } from "../domain/reflow";
import type { HevyWorkoutExercise, ActualSet } from "../domain/workout-compare";
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
    : `<button class="btn btn-blue" data-on:click="@post('/api/push-hevy/${escapeAttr(routine.id)}')" data-indicator:_pushingDaily data-attr:disabled="$_pushingDaily">
  <span data-show="!$_pushingDaily">Push to Hevy</span>
  <span data-show="$_pushingDaily">Pushing\u2026</span>
</button>`;

  const labelColor = escapeAttr(routine.color ?? "var(--green)");
  const label = escapeHtml(routine.isDaily ? "Daily" : routine.title);

  return `<div class="card">
  <div class="card-label" style="color: ${labelColor}">${label}</div>
  <div class="card-title">${escapeHtml(routine.title)}</div>
  <div class="card-subtitle">${escapeHtml(subtitle)}</div>
  <div style="display:flex; gap:8px; margin-top:14px">
    ${hevyButton}
    <a href="/routine/${encodeURIComponent(routine.id)}" class="btn btn-ghost">Details</a>
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
    : `<button class="btn btn-blue" data-on:click="@post('/api/push-hevy/${escapeAttr(queueItem.routine_id)}')" data-indicator:_pushingHero data-attr:disabled="$_pushingHero">
  <span data-show="!$_pushingHero">Push to Hevy</span>
  <span data-show="$_pushingHero">Pushing\u2026</span>
</button>`;

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

// ──────────────────────────────────────────────────────────────────
// Workout data helpers
// ──────────────────────────────────────────────────────────────────

/**
 * Format a single set as a compact string, e.g. "50kg × 8", "45 sec", "8 reps".
 */
function formatSet(set: ActualSet): string {
  if (set.duration_seconds != null) {
    const secs = set.duration_seconds;
    if (secs >= 60 && secs % 60 === 0) {
      return `${secs / 60} min`;
    }
    return `${secs} sec`;
  }
  if (set.weight_kg != null && set.weight_kg > 0 && set.reps != null) {
    return `${set.weight_kg}kg \u00d7 ${set.reps}`;
  }
  if (set.reps != null) {
    return `${set.reps} reps`;
  }
  return "1 set";
}

/**
 * Render one exercise's sets as a compact inline string.
 * e.g. "45kg × 8, 50kg × 6, 50kg × 5"
 */
function formatSetsInline(sets: ActualSet[]): string {
  if (sets.length === 0) return "";
  return sets.map(formatSet).join(", ");
}

/**
 * Parse hevy_workout_data JSON, returning an empty array on failure.
 */
function parseWorkoutData(raw: string | null): HevyWorkoutExercise[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as HevyWorkoutExercise[];
  } catch {
    return [];
  }
}

/**
 * Render the workout detail block for a completed item.
 * Returns an empty string if there is no stored workout data.
 */
function workoutDetailBlock(hevy_workout_data: string | null): string {
  const exercises = parseWorkoutData(hevy_workout_data);
  if (exercises.length === 0) return "";

  const totalSets = exercises.reduce((sum, e) => sum + e.sets.length, 0);
  const summary = `${exercises.length} exercise${exercises.length !== 1 ? "s" : ""}, ${totalSets} set${totalSets !== 1 ? "s" : ""}`;

  const exerciseRows = exercises
    .map((ex) => {
      const setsLine = formatSetsInline(ex.sets);
      return `<div class="workout-exercise">
  <span class="workout-ex-name">${escapeHtml(ex.title)}</span>
  ${setsLine ? `<span class="workout-ex-sets">${escapeHtml(setsLine)}</span>` : ""}
</div>`;
    })
    .join("\n");

  return `<details class="workout-details">
  <summary class="workout-summary">${escapeHtml(summary)}</summary>
  <div class="workout-exercises">
${exerciseRows}
  </div>
</details>`;
}

// ──────────────────────────────────────────────────────────────────
// Completed section
// ──────────────────────────────────────────────────────────────────

export interface CompletedItemData {
  title: string;
  hevy_workout_data: string | null;
}

/**
 * Completed section — items finished earlier today.
 * Shown with strikethrough text, a green checkmark, and expandable workout details.
 */
export function completedSection(items: CompletedItemData[]): string {
  if (items.length === 0) return "";

  const rows = items
    .map((item) => {
      const detail = workoutDetailBlock(item.hevy_workout_data);
      return `<div class="completed-item">
  <div class="completed-header">
    <span class="completed-title">${escapeHtml(item.title)}</span>
    <span class="completed-check">&#10003;</span>
  </div>
  ${detail}
</div>`;
    })
    .join("\n");

  return `<div class="section-header">Completed Today</div>
<div class="card">
${rows}
</div>`;
}

/**
 * Upcoming section — next sessions in queue with colored dots and spacers.
 */
/**
 * Sync controls — manual sync button plus auto-sync (webhook) status/toggle.
 *
 * @param callbackUrl  - non-null if a webhook subscription is active (the URL Hevy calls)
 * @param bearerToken  - decrypted bearer token, only set immediately after registration
 * @param lastSyncAt   - ISO timestamp of the most recent auto-sync, if any
 * @param tz           - IANA timezone for formatting lastSyncAt (defaults to UTC)
 */
export function syncButton(callbackUrl?: string | null, bearerToken?: string | null, lastSyncAt?: string | null, tz?: string): string {
  const manualSync = `<button class="btn btn-ghost" data-on:click="@post('/api/pull')" style="font-size:13px" data-indicator:_syncing data-attr:disabled="$_syncing">
    <span data-show="!$_syncing">Sync from Hevy</span>
    <span data-show="$_syncing">Syncing\u2026</span>
  </button>`;

  if (callbackUrl && bearerToken) {
    // Just registered — show credentials for the user to paste into Hevy
    return `<div class="sync-section">
  <div class="sync-status">
    <span class="sync-status-label">&#9679; Auto-sync enabled</span>
    <button class="btn btn-ghost btn-sm" data-on:click="@post('/api/webhooks/unregister')" data-indicator:_unregistering data-attr:disabled="$_unregistering">
      <span data-show="!$_unregistering">Disable</span>
      <span data-show="$_unregistering">Disabling\u2026</span>
    </button>
  </div>
  <div class="sync-credentials">
    <div class="sync-credentials-hint">Paste these into <a href="https://hevy.com/settings?developer" target="_blank" style="color:var(--blue)">Hevy developer settings</a>:</div>
    <div style="margin-bottom:6px">
      <div class="sync-credential-label">Callback URL</div>
      <code class="sync-credential-value">${escapeHtml(callbackUrl)}</code>
    </div>
    <div>
      <div class="sync-credential-label">Bearer token</div>
      <code class="sync-credential-value">${escapeHtml(bearerToken)}</code>
    </div>
  </div>
  <div class="sync-actions">
    ${manualSync}
  </div>
</div>`;
  }

  if (callbackUrl) {
    // Already registered — show status only
    const statusLabel = lastSyncAt
      ? `<div class="sync-last-synced">Last synced: ${escapeHtml(new Date(lastSyncAt).toLocaleString("en-US", { timeZone: tz ?? "UTC" }))}</div>`
      : `<div class="sync-last-synced">Waiting for first sync from Hevy&hellip;</div>`;

    return `<div class="sync-section">
  <div class="sync-status">
    <span class="sync-status-label">&#9679; Auto-sync enabled</span>
    <button class="btn btn-ghost btn-sm" data-on:click="@post('/api/webhooks/unregister')" data-indicator:_unregistering data-attr:disabled="$_unregistering">
      <span data-show="!$_unregistering">Disable</span>
      <span data-show="$_unregistering">Disabling\u2026</span>
    </button>
  </div>
  ${statusLabel}
  <div class="sync-actions">
    ${manualSync}
  </div>
</div>`;
  }

  return `<div class="sync-section">
  <div style="margin-bottom:8px">
    <button class="btn btn-ghost" data-on:click="@post('/api/webhooks/register')" data-indicator:_registering data-attr:disabled="$_registering" style="font-size:13px">
      <span data-show="!$_registering">Enable auto-sync</span>
      <span data-show="$_registering">Enabling\u2026</span>
    </button>
  </div>
  ${manualSync}
</div>`;
}

export function upcomingSection(items: UpcomingItem[]): string {
  if (items.length === 0) {
    return `<div class="section-header">Coming Up</div>
<div class="card">
  <p class="empty-state">No upcoming sessions in queue</p>
</div>`;
  }

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
