import type { WeekTemplate, Routine, QueueItemRow } from "../types";

interface PlaylistItem {
  routine_id: string;
  position: number;
}

export function generatePlaylist(
  template: WeekTemplate,
  routines: Routine[],
  weeks: number
): PlaylistItem[] {
  const routineMap = new Map(routines.map((r) => [r.id, r]));
  const mainRoutineOrder: string[] = [];

  for (const day of template.days) {
    if (!day.routineIDs) continue;
    for (const rid of day.routineIDs) {
      const routine = routineMap.get(rid);
      if (routine && !routine.isDaily) {
        mainRoutineOrder.push(rid);
      }
    }
  }

  const playlist: PlaylistItem[] = [];
  for (let week = 0; week < weeks; week++) {
    for (const rid of mainRoutineOrder) {
      playlist.push({
        routine_id: rid,
        position: playlist.length,
      });
    }
  }

  return playlist;
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
