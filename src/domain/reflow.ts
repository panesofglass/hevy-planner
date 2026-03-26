import type { QueueItemRow, WeekTemplate, Routine } from "../types";


export interface UpcomingItem {
  type: "routine" | "spacer";
  routineId?: string;
  title: string;
  exerciseCount?: number;
  color?: string;
}

/**
 * Build the "Coming Up" list by walking real calendar days starting from
 * tomorrow.  Each day is looked up in the week template to decide whether
 * it holds a main session (consume the next pending queue item), a
 * CARs-only / daily-only spacer, or full rest (skip).
 *
 * This is "smart shift" — when a session slides forward, the rest days it
 * consumed simply don't appear because they are in the past.
 *
 * @param todayDow  0 = Monday … 6 = Sunday (ISO 8601 / template convention)
 */
export function computeUpcoming(
  pendingItems: QueueItemRow[],
  template: WeekTemplate,
  routines: Routine[],
  maxSessions: number,
  todayDow: number
): UpcomingItem[] {
  const routineMap = new Map(routines.map((r) => [r.id, r]));
  const dailyRoutine = routines.find((r) => r.isDaily);
  const spacerTitle = dailyRoutine?.title ?? "Rest";

  // Build a lookup: template dayOfWeek → { type, mainCount }
  const daySlots = new Map<number, { type: "routine" | "spacer" | "rest"; mainCount: number }>();
  for (const day of template.days) {
    const mainIds = (day.routineIDs ?? []).filter((rid) => {
      const r = routineMap.get(rid);
      return r && !r.isDaily;
    });
    if (mainIds.length > 0) {
      daySlots.set(day.dayOfWeek, { type: "routine", mainCount: mainIds.length });
    } else if ((day.routineIDs ?? []).length > 0) {
      daySlots.set(day.dayOfWeek, { type: "spacer", mainCount: 0 });
    } else {
      daySlots.set(day.dayOfWeek, { type: "rest", mainCount: 0 });
    }
  }

  const result: UpcomingItem[] = [];
  let pendingIdx = 0;
  let sessionCount = 0;
  let dow = (todayDow + 1) % 7; // start from tomorrow

  // Walk up to 14 days (2 full weeks) to avoid infinite loops when the
  // template has fewer routine slots than maxSessions pending items.
  for (let step = 0; step < 14 && sessionCount < maxSessions && pendingIdx < pendingItems.length; step++) {
    const slot = daySlots.get(dow);

    if (slot?.type === "routine") {
      for (let i = 0; i < slot.mainCount && sessionCount < maxSessions && pendingIdx < pendingItems.length; i++) {
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
    } else if (slot?.type === "spacer") {
      result.push({ type: "spacer", title: spacerTitle });
    }
    // rest days: no entry in result

    dow = (dow + 1) % 7;
  }

  return result;
}
