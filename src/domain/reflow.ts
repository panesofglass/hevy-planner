import type { QueueItemRow, WeekTemplate, Routine } from "../types";


export interface UpcomingItem {
  type: "routine" | "spacer";
  routineId?: string;
  title: string;
  exerciseCount?: number;
  color?: string;
}

export function computeUpcoming(
  pendingItems: QueueItemRow[],
  template: WeekTemplate,
  routines: Routine[],
  maxSessions: number,
  startAfterRoutineId?: string
): UpcomingItem[] {
  const routineMap = new Map(routines.map((r) => [r.id, r]));
  const dailyRoutine = routines.find((r) => r.isDaily);
  const spacerTitle = dailyRoutine?.title ?? "Rest";

  // Build the template rhythm: which day indices are spacers vs routines
  const templateRhythm: Array<{ type: "routine" | "spacer"; routineId?: string }> = [];
  for (const day of template.days) {
    const mainIds = (day.routineIDs ?? []).filter((rid) => {
      const r = routineMap.get(rid);
      return r && !r.isDaily;
    });
    if (mainIds.length === 0 && (day.routineIDs ?? []).length > 0) {
      templateRhythm.push({ type: "spacer" });
    } else if (mainIds.length > 0) {
      for (const rid of mainIds) {
        templateRhythm.push({ type: "routine", routineId: rid });
      }
    }
  }

  const result: UpcomingItem[] = [];
  let rhythmIndex = 0;
  let sessionCount = 0;

  // Sync rhythm to the position after the hero (if provided), so spacers
  // between hero and next session are preserved. Fall back to syncing to
  // the first pending item's position.
  const anchorId = startAfterRoutineId ?? pendingItems[0]?.routine_id;
  if (anchorId) {
    for (let i = 0; i < templateRhythm.length; i++) {
      if (templateRhythm[i].routineId === anchorId) {
        rhythmIndex = startAfterRoutineId ? i + 1 : i;
        break;
      }
    }
  }

  let pendingIdx = 0;
  while (sessionCount < maxSessions && pendingIdx < pendingItems.length) {
    const rhythmSlot = templateRhythm[rhythmIndex % templateRhythm.length];

    if (rhythmSlot.type === "spacer") {
      result.push({ type: "spacer", title: spacerTitle });
    } else {
      const item = pendingItems[pendingIdx];
      const routine = routineMap.get(item.routine_id);
      result.push({
        type: "routine",
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
