import type { WeekTemplate, Session, QueueItemRow } from "../types";

interface PlaylistItem {
  session_id: string;
  position: number;
}

export function generatePlaylist(
  template: WeekTemplate,
  sessions: Session[],
  weeks: number
): PlaylistItem[] {
  const sessionMap = new Map(sessions.map((s) => [s.id, s]));
  const mainSessionOrder: string[] = [];

  for (const day of template.days) {
    if (!day.sessionIDs) continue;
    for (const sid of day.sessionIDs) {
      const session = sessionMap.get(sid);
      if (session && !session.isDaily) {
        mainSessionOrder.push(sid);
      }
    }
  }

  const playlist: PlaylistItem[] = [];
  for (let week = 0; week < weeks; week++) {
    for (const sid of mainSessionOrder) {
      playlist.push({
        session_id: sid,
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
