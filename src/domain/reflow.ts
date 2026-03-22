import type { QueueItemRow, WeekTemplate, Routine } from "../types";


export interface UpcomingItem {
  type: "session" | "spacer";
  routineId?: string;
  title: string;
  exerciseCount?: number;
  color?: string;
}

export function computeUpcoming(
  pendingItems: QueueItemRow[],
  template: WeekTemplate,
  routines: Routine[],
  maxSessions: number
): UpcomingItem[] {
  const routineMap = new Map(routines.map((r) => [r.id, r]));

  // Build the template rhythm: which day indices are spacers vs routines
  const templateRhythm: Array<{ type: "session" | "spacer"; routineId?: string }> = [];
  for (const day of template.days) {
    const mainIds = (day.routineIDs ?? []).filter((rid) => {
      const r = routineMap.get(rid);
      return r && !r.isDaily;
    });
    if (mainIds.length === 0 && (day.routineIDs ?? []).length > 0) {
      templateRhythm.push({ type: "spacer" });
    } else if (mainIds.length > 0) {
      for (const rid of mainIds) {
        templateRhythm.push({ type: "session", routineId: rid });
      }
    }
  }

  const result: UpcomingItem[] = [];
  let rhythmIndex = 0;
  let sessionCount = 0;

  const firstPending = pendingItems[0];
  if (firstPending) {
    for (let i = 0; i < templateRhythm.length; i++) {
      if (templateRhythm[i].routineId === firstPending.routine_id) {
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
      const routine = routineMap.get(item.routine_id);
      result.push({
        type: "session",
        routineId: item.routine_id,
        title: routine?.title ?? item.routine_id,
        exerciseCount: routine?.exercises.length,
        color: routine?.color,
      });
      pendingIdx++;
      sessionCount++;
    }

    rhythmIndex++;
  }

  return result;
}
