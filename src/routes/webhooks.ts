import type { Env } from "../types";
import { sseErrorCard } from "../utils/sse";
import { getUser, updateWebhookState, clearWebhookState, getUserByWebhookToken } from "../storage/queries";
import { performSync } from "../services/sync";
import { handleTodaySSE } from "./today";
import { getDecryptedApiKey } from "../storage/api-key";

/** POST /api/webhooks/register — generate a webhook URL for the user to paste into Hevy settings */
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
    const origin = new URL(request.url).origin;
    const webhookUrl = `${origin}/api/webhooks/hevy/${authToken}`;
    await updateWebhookState(env.DB, userId, webhookUrl, authToken);
    return await handleTodaySSE(env, userId, tz);
  } catch (err) {
    return sseErrorCard(err instanceof Error ? err.message : "Failed to enable auto-sync");
  }
}

/** POST /api/webhooks/unregister — clear local webhook state */
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
    await clearWebhookState(env.DB, userId);
    return await handleTodaySSE(env, userId, tz);
  } catch (err) {
    return sseErrorCard(err instanceof Error ? err.message : "Failed to disable auto-sync");
  }
}

/** POST /api/webhooks/hevy/:token — incoming event from Hevy */
export async function handleWebhookEvent(
  env: Env,
  ctx: ExecutionContext,
  token: string
): Promise<Response> {
  // Reject obviously invalid tokens (too short to be a UUID) without hashing or DB work.
  if (token.length < 36) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await getUserByWebhookToken(env.DB, token);
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
