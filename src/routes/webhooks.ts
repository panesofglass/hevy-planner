import type { Env } from "../types";
import { getUser, updateWebhookState, clearWebhookState, getUserByWebhookToken } from "../storage/queries";
import { performSync } from "../services/sync";
import { getDecryptedApiKey } from "../storage/api-key";

/** POST /api/webhooks/register — generate a webhook URL for the user to paste into Hevy settings */
export async function handleWebhookRegister(
  request: Request,
  env: Env,
  userId: string,
  _tz?: string
): Promise<Response> {
  const user = await getUser(env.DB, userId);
  if (!user || !user.hevy_api_key) {
    return new Response("Connect your Hevy API key first.", { status: 400 });
  }

  try {
    const bearerToken = crypto.randomUUID();
    const origin = new URL(request.url).origin;
    const callbackUrl = `${origin}/api/webhooks/hevy`;
    await updateWebhookState(env.DB, userId, callbackUrl, bearerToken, env.ENCRYPTION_KEY);
    return new Response(null, { status: 202 });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : "Failed to enable auto-sync", { status: 500 });
  }
}

/** POST /api/webhooks/unregister — clear local webhook state */
export async function handleWebhookUnregister(
  env: Env,
  userId: string,
  _tz?: string
): Promise<Response> {
  const user = await getUser(env.DB, userId);
  if (!user) {
    return new Response("User not found.", { status: 400 });
  }

  try {
    await clearWebhookState(env.DB, userId);
    return new Response(null, { status: 202 });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : "Failed to disable auto-sync", { status: 500 });
  }
}

/** POST /api/webhooks/hevy — incoming event from Hevy (bearer token auth) */
export async function handleWebhookEvent(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  console.log("[webhook] received event");

  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    console.warn("[webhook] rejected: missing or malformed Authorization header");
    return new Response("Unauthorized", { status: 401 });
  }
  const token = authHeader.slice(7);
  if (token.length < 36) {
    console.warn("[webhook] rejected: token too short");
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await getUserByWebhookToken(env.DB, token);
  if (!user) {
    console.warn("[webhook] rejected: no user matched token");
    return new Response("Unauthorized", { status: 401 });
  }

  console.log(`[webhook] matched user=${user.id}, has_api_key=${!!user.hevy_api_key}`);

  // Acknowledge immediately — Hevy expects a fast 2xx
  // Run sync in the background via waitUntil so the response is not delayed
  if (user.hevy_api_key) {
    ctx.waitUntil(
      getDecryptedApiKey(env.DB, user.id, env.ENCRYPTION_KEY).then((apiKey) => {
        if (!apiKey) {
          console.error("[webhook] decryption returned no API key");
          return;
        }
        console.log("[webhook] starting sync");
        return performSync(env.DB, user.id, apiKey, user.timezone ?? undefined)
          .then(() => {
            console.log("[webhook] sync complete, triggering reproject on today DO");
            // Notify connected SSE clients of updated state
            const actorId = env.SESSION_ACTOR.idFromName(`${user.id}:today`);
            const actor = env.SESSION_ACTOR.get(actorId);
            const url = new URL("https://actor/reproject");
            url.searchParams.set("userId", user.id);
            url.searchParams.set("page", "today");
            if (user.timezone) url.searchParams.set("tz", user.timezone);
            return actor.fetch(new Request(url.toString())).then((res) => {
              console.log(`[webhook] reproject response: ${res.status}`);
            });
          })
          .catch((err) => {
            console.error("[webhook] sync/reproject failed:", err instanceof Error ? err.message : err);
          });
      })
    );
  }

  return new Response(null, { status: 204 });
}
