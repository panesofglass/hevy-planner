import type { WeekTemplate, Routine, QueueItemRow } from "../types";

interface PlaylistItem {
  routine_id: string;
  position: number;
}

interface TemplateSlot {
  routine_id: string;
  every: number;
}

/**
 * Flatten a week template into the ordered list of main (non-daily)
 * routines, carrying each day's cadence (`day.every`; default 1 = every
 * cycle). Shared by generatePlaylist and weekOfPosition so both consumers
 * walk the same layout.
 */
export function buildTemplateSlots(
  template: WeekTemplate,
  routines: Routine[]
): TemplateSlot[] {
  const routineMap = new Map(routines.map((r) => [r.id, r]));
  const slots: TemplateSlot[] = [];
  for (const day of template.days) {
    if (!day.routineIDs) continue;
    const every = day.every ?? 1;
    for (const rid of day.routineIDs) {
      const routine = routineMap.get(rid);
      if (routine && !routine.isDaily) {
        slots.push({ routine_id: rid, every });
      }
    }
  }
  return slots;
}

export function generatePlaylist(
  template: WeekTemplate,
  routines: Routine[],
  weeks: number
): PlaylistItem[] {
  const slots = buildTemplateSlots(template, routines);
  const playlist: PlaylistItem[] = [];
  for (let week = 0; week < weeks; week++) {
    for (const slot of slots) {
      if (week % slot.every !== 0) continue;
      playlist.push({
        routine_id: slot.routine_id,
        position: playlist.length,
      });
    }
  }
  return playlist;
}

/**
 * Which playlist week (0-based pass through the rotation) a queue position
 * belongs to, matching the layout produced by generatePlaylist. Used to
 * decide cadence for the forecast (e.g., "is this the benchmark week?").
 */
export function weekOfPosition(
  template: WeekTemplate,
  routines: Routine[],
  position: number
): number {
  const slots = buildTemplateSlots(template, routines);
  if (slots.length === 0) return 0;
  let count = 0;
  for (let week = 0; ; week++) {
    for (const slot of slots) {
      if (week % slot.every !== 0) continue;
      if (count === position) return week;
      count++;
    }
  }
}

export function getNextRoutine(items: QueueItemRow[]): QueueItemRow | null {
  const sorted = [...items].sort((a, b) => a.position - b.position);
  return sorted.find((item) => item.status === "pending") ?? null;
}

/**
 * When a queue item completes out of order, any still-pending items ahead
 * of it in the queue are stuck — the user moved past them. Mark them
 * skipped so getNextRoutine advances past them instead of showing them
 * forever.
 */
export function computeSkippedItemIds(
  items: Pick<QueueItemRow, "id" | "position" | "status">[],
  completedItemIds: number[]
): number[] {
  if (completedItemIds.length === 0) return [];

  const completedSet = new Set(completedItemIds);
  const completedPositions = items
    .filter((item) => completedSet.has(item.id))
    .map((item) => item.position);
  if (completedPositions.length === 0) return [];

  const maxCompletedPosition = Math.max(...completedPositions);
  return items
    .filter((item) => item.status === "pending" && !completedSet.has(item.id) && item.position < maxCompletedPosition)
    .map((item) => item.id);
}

export function getCompletedRoutines(items: QueueItemRow[], today: string): QueueItemRow[] {
  return items
    .filter((item) => item.status === "completed" && item.completed_date === today)
    .sort((a, b) => a.position - b.position);
}
