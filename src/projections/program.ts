import type { Program } from "../types";
import type { SseEvent } from "../actor/session-actor";
import {
  getUser,
  loadProgram,
  getPrograms,
} from "../storage/queries";
import { currentWeek } from "../domain/schedule";
import {
  programOverview,
  progressionsSection,
  routinesSection,
  foundationsSection,
  resourcesSection,
  bodiSection,
  importProgramSection,
  programLibrarySection,
} from "../fragments/program";

/** Build SseEvent[] for the Program page — used by the SessionActor DO on connect. */
export async function buildProgramEvents(db: D1Database, userId: string): Promise<SseEvent[]> {
  let program: Program;
  let user: Awaited<ReturnType<typeof getUser>>;
  let allPrograms: Awaited<ReturnType<typeof getPrograms>>;
  try {
    const [loaded, userRow, programRows] = await Promise.all([
      loadProgram(db, userId),
      getUser(db, userId),
      getPrograms(db, userId),
    ]);
    program = loaded.program;
    user = userRow;
    allPrograms = programRows;
  } catch {
    return [{ type: "patch", html: `<div id="content"><div class="card"><p style="color:var(--text-secondary)">No active program. Upload a program to get started.</p></div></div>` }];
  }

  const events: SseEvent[] = [];
  let firstEmitted = false;

  function emit(html: string): void {
    if (!firstEmitted) {
      events.push({ type: "patch", html: `<div id="content">${html}</div>` });
      firstEmitted = true;
    } else {
      events.push({ type: "append", target: "#content", html });
    }
  }

  const week = user ? currentWeek(user.start_date) : null;

  if (allPrograms.length > 1) {
    emit(programLibrarySection(allPrograms));
  }

  emit(programOverview(program, user, week));

  if (program.progressions.length > 0) {
    emit(progressionsSection(program.progressions, week));
  }

  emit(routinesSection(program));

  if (program.foundations && program.foundations.length > 0) {
    emit(foundationsSection(program.foundations));
  }

  if (program.resources && program.resources.length > 0) {
    emit(resourcesSection(program.resources));
  }

  if (program.bodi && program.bodi.length > 0) {
    emit(bodiSection(program.bodi));
  }

  emit(importProgramSection());

  return events;
}
