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
import { buildContentEvents } from "./build-events";

export interface ProgramProjection {
  events: SseEvent[];
  subtitle?: string;
}

/** Build SseEvent[] for the Program page — used by the SessionActor DO on connect. */
export async function buildProgramProjection(db: D1Database, userId: string): Promise<ProgramProjection> {
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
    return {
      events: buildContentEvents([`<div class="card"><p style="color:var(--text-secondary)">No active program. Upload a program to get started.</p></div>`]),
    };
  }

  const fragments: string[] = [];
  const week = user ? currentWeek(user.start_date) : null;

  if (allPrograms.length > 1) {
    fragments.push(programLibrarySection(allPrograms));
  }

  fragments.push(programOverview(program, user, week));

  if (program.progressions.length > 0) {
    fragments.push(progressionsSection(program.progressions, week));
  }

  fragments.push(routinesSection(program));

  if (program.foundations && program.foundations.length > 0) {
    fragments.push(foundationsSection(program.foundations));
  }

  if (program.resources && program.resources.length > 0) {
    fragments.push(resourcesSection(program.resources));
  }

  if (program.bodi && program.bodi.length > 0) {
    fragments.push(bodiSection(program.bodi));
  }

  fragments.push(importProgramSection());

  return { events: buildContentEvents(fragments), subtitle: program.meta.subtitle };
}
