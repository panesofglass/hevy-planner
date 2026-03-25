import type { Env } from "../types";
import { sseErrorCard } from "../utils/sse";
import { getUser, updateWebhookState, clearWebhookState, getUserByWebhookToken } from "../storage/queries";
import { performSync } from "../services/sync";
import { handleTodaySSE } from "./today";
import { HevyClient } from "../hevy/client";
import { getDecryptedApiKey } from "../storage/api-key";

/** POST /api/webhooks/register — subscribe to Hevy webhooks for auto-sync */
export async function handleWebhookRegister(
  request: Request,
  env: Env,
  userId: string,
  tz?: string
): Promise<Response> {
  const user = await getUser(env.DB, userId);
  if (!user || !user.hevy_api_key) {
    return sseErrorCard("Connect your Hevy API key first.");
  }

  try {
    const authToken = crypto.randomUUID();
    const webhookUrl = `${new URL(request.url).origin}/api/webhooks/hevy`;
    const apiKey = await getDecryptedApiKey(env.DB, userId, env.ENCRYPTION_KEY);
    if (!apiKey) {
      return sseErrorCard("Connect your Hevy API key first.");
    }
    const client = new HevyClient(apiKey);
    const sub = await client.createWebhookSubscription(webhookUrl, authToken);
    await updateWebhookState(env.DB, userId, sub.id, authToken);
    return await handleTodaySSE(env, userId, tz);
  } catch (err) {
    return sseErrorCard(err instanceof Error ? err.message : "Failed to enable auto-sync");
  }
}

/** POST /api/webhooks/unregister — remove Hevy webhook subscription */
export async function handleWebhookUnregister(
  env: Env,
  userId: string,
  tz?: string
): Promise<Response> {
  const user = await getUser(env.DB, userId);
  if (!user) {
    return sseErrorCard("User not found.");
  }

  try {
    if (user.hevy_api_key && user.webhook_id) {
      const apiKey = await getDecryptedApiKey(env.DB, userId, env.ENCRYPTION_KEY);
      if (apiKey) {
        const client = new HevyClient(apiKey);
        await client.deleteWebhookSubscription(user.webhook_id);
      }
    }
    await clearWebhookState(env.DB, userId);
    return await handleTodaySSE(env, userId, tz);
  } catch (err) {
    return sseErrorCard(err instanceof Error ? err.message : "Failed to disable auto-sync");
  }
}

/** POST /api/webhooks/hevy — incoming event from Hevy (no app auth) */
export async function handleWebhookEvent(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  // Require Authorization header — reject early without any DB or body work.
  // This is the primary line of defence against unauthenticated flooding.
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return new Response("Unauthorized", { status: 401 });
  }

  const authToken = authHeader.replace(/^bearer\s+/i, "").trim();

  // Reject obviously invalid tokens (too short to be a UUID) without hashing or DB work.
  if (authToken.length < 36) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await getUserByWebhookToken(env.DB, authToken);
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Acknowledge immediately — Hevy expects a fast 2xx
  // Run sync in the background via waitUntil so the response is not delayed
  if (user.hevy_api_key) {
    ctx.waitUntil(
      getDecryptedApiKey(env.DB, user.id, env.ENCRYPTION_KEY).then((apiKey) => {
        if (!apiKey) return;
        return performSync(env.DB, user.id, apiKey, user.timezone ?? undefined).catch((err) => {
          console.error("Webhook sync failed:", err instanceof Error ? err.message : err);
        });
      })
    );
  }

  return new Response(null, { status: 204 });
}
