// ──────────────────────────────────────────────────────────────────
// Routine detail page — full exercise list with coaching context
// ──────────────────────────────────────────────────────────────────

import type { Routine, ExerciseTemplate, Progression } from "../types";
import { escapeHtml, escapeAttr } from "../utils/html";

/**
 * Full routine detail page content — exercise list with numbered items,
 * sets in blue, coaching notes, video links, integration tags,
 * and a sticky Push to Hevy button.
 */
export function routineDetailPage(
  routine: Routine,
  exerciseTemplates: ExerciseTemplate[],
  currentProgression?: Progression
): string {
  const parts: string[] = [];

  const templateMap = new Map(exerciseTemplates.map((t) => [t.id, t]));

  // Back nav
  parts.push(`<a href="/" class="back-nav">&#8249; Today</a>`);

  // Routine header
  parts.push(`<div style="margin-bottom:16px">
  <h2 class="card-title" style="font-size:22px">${escapeHtml(routine.title)}</h2>
  ${routine.subtitle ? `<p class="card-subtitle">${escapeHtml(routine.subtitle)}</p>` : ""}
  ${routine.description ? `<p class="card-desc">${escapeHtml(routine.description)}</p>` : ""}
</div>`);

  // Phase coaching callout (no border-left accent)
  if (currentProgression) {
    const detailsHtml = currentProgression.details?.length
      ? `<ul class="coaching-details">${currentProgression.details.map((d) => `<li>${escapeHtml(d)}</li>`).join("")}</ul>`
      : "";

    parts.push(`<div class="coaching-callout">
  <div class="coaching-label">${escapeHtml(currentProgression.phaseName)} Phase &middot; ${escapeHtml(currentProgression.weekRange)}</div>
  ${currentProgression.focus ? `<div class="coaching-focus">${escapeHtml(currentProgression.focus)}</div>` : ""}
  ${detailsHtml}
</div>`);
  }

  // Exercise list
  parts.push(`<h2 class="section-header">Exercises (${routine.exercises.length})</h2>`);

  routine.exercises.forEach((routineExercise, index) => {
    const template = templateMap.get(routineExercise.exerciseTemplateId);

    // Title always comes from the template; fall back to ID if template missing
    const title = template?.title ?? routineExercise.exerciseTemplateId;

    const setsDisplay = routineExercise.sets;
    const notes = routineExercise.notes ?? template?.notes;

    const videoLink = template?.videoURL
      ? `<a href="${escapeAttr(template.videoURL)}" target="_blank" rel="noopener" class="exercise-video">&#9654; Watch tutorial</a>`
      : "";

    const tagsHtml =
      template?.tags && template.tags.length > 0
        ? `<div class="exercise-tags">${template.tags.map((t) => `<span class="exercise-tag">${escapeHtml(formatTag(t))}</span>`).join("")}</div>`
        : "";

    const notesHtml = notes
      ? `<div class="exercise-notes">${escapeHtml(notes)}</div>`
      : "";

    parts.push(`<div class="exercise-item">
  <div class="exercise-header">
    <span class="exercise-number">${index + 1}</span>
    <span class="exercise-name">${escapeHtml(title)}</span>
    ${setsDisplay ? `<span class="exercise-sets">${escapeHtml(setsDisplay)}</span>` : ""}
  </div>
  ${notesHtml}
  ${videoLink}
  ${tagsHtml}
</div>`);
  });

  // Sticky Push to Hevy
  parts.push(`<div class="sticky-footer">
  <button class="btn btn-blue btn-block" data-on:click="@post('/api/push-hevy/${escapeAttr(routine.id)}')">Push to Hevy</button>
</div>`);

  return parts.join("\n");
}

/** Convert a tag like "core-integration" to "Core Integration" */
function formatTag(tag: string): string {
  return tag
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
