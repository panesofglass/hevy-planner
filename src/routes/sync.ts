import type { Env } from "../types";
import { sseResponse, patchElements, executeScript } from "../sse/helpers";
import { sseErrorCard } from "../utils/sse";
import {
  getUser,
  loadProgram,
  getQueueItems,
  getExerciseTemplateMappings,
  getRoutineMappings,
  upsertExerciseTemplateMapping,
  upsertRoutineMapping,
  updateQueueItemHevyRoutineId,
  markQueueItemCompletedForUser,
} from "../storage/queries";
import { autoMatchExercises, buildRoutinePayload } from "../domain/hevy-sync";
import { performSync } from "../services/sync";
import { handleTodaySSE } from "./today";
import { HevyClient } from "../hevy/client";
import { getDecryptedApiKey } from "../storage/api-key";
import { escapeHtml } from "../utils/html";
import { todayString } from "../utils/date";

/** POST /api/push-hevy/:id — open routine in Hevy (uses existing mapping from setup) */
export async function handlePush(env: Env, userId: string, routineId: string): Promise<Response> {
  const user = await getUser(env.DB, userId);
  if (!user || !user.hevy_api_key) {
    return sseErrorCard("Connect your Hevy API key first.", "#content", "inner");
  }

  const { program, programId } = await loadProgram(env.DB, userId);

  // Look up existing routine mapping from setup (scoped to active program)
  const routineMappings = await getRoutineMappings(env.DB, userId, programId);
  const mapping = routineMappings.find((m) => m.program_routine_id === routineId);

  if (mapping) {
    // Routine already exists in Hevy — open it directly
    return sseResponse(
      executeScript(`window.open('https://hevy.com/routine/' + ${JSON.stringify(mapping.hevy_routine_id)}, '_blank')`)
    );
  }

  // Fallback: no mapping exists (edge case — setup didn't create this routine)
  const routine = program.routines.find((r) => r.id === routineId);
  if (!routine) {
    return new Response("Routine not found", { status: 404 });
  }

  const apiKey = await getDecryptedApiKey(env.DB, userId, env.ENCRYPTION_KEY);
  if (!apiKey) {
    return sseErrorCard("Connect your Hevy API key first.", "#content", "inner");
  }
  const client = new HevyClient(apiKey);

  // Get or auto-create exercise template mappings (scoped to active program)
  let mappings = await getExerciseTemplateMappings(env.DB, userId, programId);
  if (mappings.length === 0) {
    try {
      const hevyTemplates = await client.getAllExerciseTemplates();
      const autoMatched = autoMatchExercises(program.exerciseTemplates, hevyTemplates);

      for (const [programTemplateId, hevyTemplateId] of autoMatched) {
        await upsertExerciseTemplateMapping(env.DB, {
          user_id: userId,
          program_template_id: programTemplateId,
          hevy_template_id: hevyTemplateId,
          is_custom: 0,
          program_id: programId,
        });
      }
      mappings = await getExerciseTemplateMappings(env.DB, userId, programId);
    } catch {
      // If auto-match fails, continue with empty mappings
    }
  }

  const payload = buildRoutinePayload(routine, mappings);

  if (payload.exercises.length === 0) {
    return sseErrorCard(
      `Cannot push: no exercises could be mapped to Hevy templates. ${payload.unmapped.length} unmapped exercise(s).`
    );
  }

  try {
    const folder = await client.getOrCreateRoutineFolder(program.meta.title);
    const created = await client.createRoutine({
      title: payload.title,
      folder_id: folder.id,
      exercises: payload.exercises,
    });

    // Save the mapping so future pushes use the existing routine
    await upsertRoutineMapping(env.DB, {
      user_id: userId,
      program_routine_id: routineId,
      hevy_routine_id: created.id,
      program_id: programId,
    });

    // Also update the queue item if there is one (scoped to active program)
    const items = await getQueueItems(env.DB, userId, programId);
    const queueItem = items.find(
      (i) => i.routine_id === routineId && i.status === "pending"
    );
    if (queueItem) {
      await updateQueueItemHevyRoutineId(env.DB, queueItem.id, created.id);
    }

    return sseResponse(
      executeScript(`window.open('https://hevy.com/routine/' + ${JSON.stringify(created.id)}, '_blank')`)
    );
  } catch (err) {
    return sseErrorCard(err instanceof Error ? err.message : "Push failed");
  }
}

/** POST /api/pull — pull completions from Hevy */
export async function handlePull(env: Env, userId: string, tz?: string): Promise<Response> {
  const user = await getUser(env.DB, userId);
  if (!user || !user.hevy_api_key) {
    return sseErrorCard("Connect your Hevy API key first.", "#content", "inner");
  }

  try {
    const apiKey = await getDecryptedApiKey(env.DB, userId, env.ENCRYPTION_KEY);
    if (!apiKey) {
      return sseErrorCard("Connect your Hevy API key first.", "#content", "inner");
    }
    await performSync(env.DB, userId, apiKey, tz);
    return await handleTodaySSE(env, userId, tz);
  } catch (err) {
    return sseErrorCard(err instanceof Error ? err.message : "Pull failed");
  }
}

/** POST /api/cleanup-routines — delete duplicate routines from Hevy */
export async function handleCleanupRoutines(env: Env, userId: string): Promise<Response> {
  const user = await getUser(env.DB, userId);
  if (!user || !user.hevy_api_key) {
    return sseErrorCard("Connect your Hevy API key first.");
  }

  const apiKey = await getDecryptedApiKey(env.DB, userId, env.ENCRYPTION_KEY);
  if (!apiKey) {
    return sseErrorCard("Connect your Hevy API key first.");
  }
  const client = new HevyClient(apiKey);
  const allRoutines = await client.getAllRoutines();

  // Group by title+folder, find duplicates
  const byKey = new Map<string, typeof allRoutines>();
  for (const r of allRoutines) {
    const key = `${r.title}::${r.folder_id ?? "none"}`;
    const list = byKey.get(key) ?? [];
    list.push(r);
    byKey.set(key, list);
  }

  const toDelete: string[] = [];
  for (const [, routines] of byKey) {
    if (routines.length > 1) {
      // Keep the most recently updated, delete the rest
      routines.sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
      toDelete.push(...routines.slice(1).map((r) => r.id));
    }
  }

  let deleted = 0;
  let failed = 0;
  for (const id of toDelete) {
    try {
      await client.deleteRoutine(id);
      deleted++;
    } catch {
      failed++;
    }
  }

  const msg = toDelete.length === 0
    ? "No duplicates found."
    : `Cleaned up ${deleted} duplicate(s)${failed > 0 ? `, ${failed} failed` : ""}.`;

  return sseResponse(
    patchElements(
      `<div class="card"><p style="color:var(--green)">${escapeHtml(msg)}</p></div>`,
      { selector: "#content", mode: "prepend" }
    )
  );
}

/** POST /api/complete/:id — manual complete, re-render today */
export async function handleManualComplete(
  env: Env,
  userId: string,
  itemId: number,
  tz?: string
): Promise<Response> {
  if (!Number.isInteger(itemId)) {
    return new Response("Invalid item ID", { status: 400 });
  }
  const today = todayString(tz);
  await markQueueItemCompletedForUser(env.DB, itemId, userId, today);
  return await handleTodaySSE(env, userId, tz);
}
