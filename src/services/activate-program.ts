import type { Program } from "../types";
import {
  clearPendingStateForUser,
  insertProgram,
  getExerciseTemplateMappings,
  getRoutineMappings,
  insertQueueItems,
  bulkSetQueueItemRoutineIds,
} from "../storage/queries";
import { generatePlaylist } from "../domain/queue";
import { buildRoutinePayload, autoMatchExercises, computeFolderAssignments, reconcileRoutines } from "../domain/hevy-sync";
import { mapToHevyEnums } from "../domain/hevy-enums";
import { HevyClient } from "../hevy/client";

/**
 * Activate a program: clear old pending queue and mappings, store in D1,
 * sync to Hevy (exercise templates + routines), then generate queue.
 * Reused by both initial setup (handleSetup) and program import (handleImportProgram).
 */
export async function activateProgram(
  db: D1Database,
  userId: string,
  program: Program,
  programJsonStr: string,
  templateId: string,
  apiKey: string | undefined
): Promise<void> {
  const template = program.weekTemplates.find((t) => t.id === templateId);
  if (!template) throw new Error(`Week template "${templateId}" not found in program`);

  // 1. Clear existing pending queue items and mappings atomically (preserve completed history)
  // Clear globally (no programId) since we're replacing the active program
  await clearPendingStateForUser(db, userId);

  // 2. Insert program (deactivates previous via batch in insertProgram) — get the new row ID
  const programId = await insertProgram(db, userId, programJsonStr);

  // 3. Hevy exercise template & routine creation (only with API key)
  const routineIdMap = new Map<string, string>();
  if (apiKey) {
    const client = new HevyClient(apiKey);

    // b. Fetch all Hevy exercise templates
    const hevyTemplates = await client.getAllExerciseTemplates();

    // c. Auto-match our templates to Hevy's by normalized title
    const matched = autoMatchExercises(program.exerciseTemplates, hevyTemplates);

    // d. Create custom Hevy exercise templates for unmatched
    const customCreated = new Set<string>();
    for (const et of program.exerciseTemplates) {
      if (!matched.has(et.id)) {
        const enums = mapToHevyEnums(et);
        const created = await client.createExerciseTemplate({
          title: et.title,
          exercise_type: enums.exerciseType,
          equipment_category: enums.equipmentCategory,
          muscle_group: enums.primaryMuscleGroup,
          other_muscles: enums.secondaryMuscleGroups,
        });
        matched.set(et.id, created.id);
        customCreated.add(et.id);
      }
    }

    // e. Save all exercise template mappings (batched), scoped to new programId
    if (matched.size > 0) {
      const upsertTemplateStmt = db.prepare(
        `INSERT INTO exercise_template_mappings (user_id, program_template_id, hevy_template_id, is_custom, program_id)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id, program_template_id) DO UPDATE SET
           hevy_template_id = excluded.hevy_template_id,
           is_custom = excluded.is_custom,
           program_id = excluded.program_id`
      );
      await db.batch(
        [...matched.entries()].map(([programTemplateId, hevyTemplateId]) =>
          upsertTemplateStmt.bind(
            userId,
            programTemplateId,
            hevyTemplateId,
            customCreated.has(programTemplateId) ? 1 : 0,
            programId
          )
        )
      );
    }

    // f. Create or update Hevy routines with folder grouping + dedup
    const allMappings = await getExerciseTemplateMappings(db, userId, programId);
    const existingRoutineMappings = await getRoutineMappings(db, userId, programId);
    const existingMappingsMap = new Map(
      existingRoutineMappings.map((m) => [m.program_routine_id, m.hevy_routine_id])
    );

    // Compute folder assignments and create/find folders
    const folderAssignments = computeFolderAssignments(program.routines, program.meta.title);
    const uniqueFolderNames = [...new Set(folderAssignments.map((a) => a.folderName))];
    const folderNameToId = new Map<string, number>();
    // Create folders in parallel, limited to 3 concurrent to avoid Hevy rate limits
    for (let i = 0; i < uniqueFolderNames.length; i += 3) {
      const batch = uniqueFolderNames.slice(i, i + 3);
      const results = await Promise.all(
        batch.map((name) => client.getOrCreateRoutineFolder(name))
      );
      for (let j = 0; j < batch.length; j++) {
        folderNameToId.set(batch[j], results[j].id);
      }
    }

    // Fetch existing Hevy routines for dedup by title+folder
    const existingHevyRoutines = await client.getAllRoutines();

    // Reconcile: decide create vs update for each routine
    const reconciliations = reconcileRoutines(
      folderAssignments, existingHevyRoutines, folderNameToId, existingMappingsMap
    );

    for (const recon of reconciliations) {
      const routine = program.routines.find((r) => r.id === recon.programRoutineId);
      if (!routine) continue;
      const payload = buildRoutinePayload(routine, allMappings);
      const folderId = folderNameToId.get(recon.folderName)!;

      if (recon.action === "update" && recon.existingHevyRoutineId) {
        await client.updateRoutine(recon.existingHevyRoutineId, {
          title: payload.title,
          exercises: payload.exercises,
        });
        routineIdMap.set(routine.id, recon.existingHevyRoutineId);
      } else {
        const created = await client.createRoutine({
          title: payload.title,
          folder_id: folderId,
          exercises: payload.exercises,
        });
        routineIdMap.set(routine.id, created.id);
      }
    }

    // g. Save all routine mappings (batched), scoped to new programId
    if (routineIdMap.size > 0) {
      const upsertRoutineStmt = db.prepare(
        `INSERT INTO routine_mappings (user_id, program_routine_id, hevy_routine_id, program_id)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id, program_routine_id) DO UPDATE SET
           hevy_routine_id = excluded.hevy_routine_id,
           program_id = excluded.program_id`
      );
      await db.batch(
        [...routineIdMap.entries()].map(([programRoutineId, hevyRoutineId]) =>
          upsertRoutineStmt.bind(userId, programRoutineId, hevyRoutineId, programId)
        )
      );
    }
  }

  // 4. Generate queue playlist and insert items, scoped to new programId
  const weeks = program.meta.durationWeeks || 8;
  const playlist = generatePlaylist(template, program.routines, weeks);
  if (playlist.length > 0) {
    await insertQueueItems(db, userId, playlist, programId);
  }

  // 5. Bulk-set hevy_routine_id on queue items via routine_mappings
  if (apiKey) {
    await bulkSetQueueItemRoutineIds(db, userId, routineIdMap);
  }
}
