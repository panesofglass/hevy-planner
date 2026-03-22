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

export function getNextSession(items: QueueItemRow[]): QueueItemRow | null {
  const sorted = [...items].sort((a, b) => a.position - b.position);
  return sorted.find((item) => item.status === "pending") ?? null;
}

export function getCompletedSessions(items: QueueItemRow[], today: string): QueueItemRow[] {
  return items
    .filter((item) => item.status === "completed" && item.completed_date === today)
    .sort((a, b) => a.position - b.position);
}
