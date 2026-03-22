import type { QueueItemRow, WeekTemplate, Session } from "../types";


export interface UpcomingItem {
  type: "session" | "spacer";
  sessionId?: string;
  title: string;
  exerciseCount?: number;
  color?: string;
}

export function computeUpcoming(
  pendingItems: QueueItemRow[],
  template: WeekTemplate,
  sessions: Session[],
  maxSessions: number
): UpcomingItem[] {
  const sessionMap = new Map(sessions.map((s) => [s.id, s]));

  // Build the template rhythm: which day indices are spacers vs sessions
  const templateRhythm: Array<{ type: "session" | "spacer"; sessionId?: string }> = [];
  for (const day of template.days) {
    const mainIds = (day.sessionIDs ?? []).filter((sid) => {
      const s = sessionMap.get(sid);
      return s && !s.isDaily;
    });
    if (mainIds.length === 0 && (day.sessionIDs ?? []).length > 0) {
      templateRhythm.push({ type: "spacer" });
    } else if (mainIds.length > 0) {
      for (const sid of mainIds) {
        templateRhythm.push({ type: "session", sessionId: sid });
      }
    }
  }

  const result: UpcomingItem[] = [];
  let rhythmIndex = 0;
  let sessionCount = 0;

  const firstPending = pendingItems[0];
  if (firstPending) {
    for (let i = 0; i < templateRhythm.length; i++) {
      if (templateRhythm[i].sessionId === firstPending.session_id) {
        rhythmIndex = i;
        break;
      }
    }
  }

  let pendingIdx = 0;
  while (sessionCount < maxSessions && pendingIdx < pendingItems.length) {
    const rhythmSlot = templateRhythm[rhythmIndex % templateRhythm.length];

    if (rhythmSlot.type === "spacer") {
      result.push({ type: "spacer", title: "CARs only" });
    } else {
      const item = pendingItems[pendingIdx];
      const session = sessionMap.get(item.session_id);
      result.push({
        type: "session",
        sessionId: item.session_id,
        title: session?.title ?? item.session_id,
        exerciseCount: session?.exercises.length,
        color: session?.color,
      });
      pendingIdx++;
      sessionCount++;
    }

    rhythmIndex++;
  }

  return result;
}
