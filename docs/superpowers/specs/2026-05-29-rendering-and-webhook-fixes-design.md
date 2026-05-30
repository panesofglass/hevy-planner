# Rendering and Webhook Credential Fixes

**Date:** 2026-05-29

## Problem Summary

Two related bugs were found and diagnosed:

1. **Flaky page rendering** — The today page sometimes renders only the top section (CARs card or hero routine) with the sync button and other sections missing. This happens on both initial page load and after a manual sync.

2. **Webhook credential display** — After a user enables auto-sync, the bearer token needed to configure Hevy's developer settings is never shown on subsequent renders. The `buildTodayProjection` call always passes `null` for the bearer token to `syncButton`, so the credentials screen (`syncJustRegistered`) is never reached after the initial registration reproject.

## Root Causes

### Fix 1: Flaky rendering

`buildContentEvents` splits page content into multiple SSE events:
- Fragment 0 → `{ type: "patch", html: "<div id='content'>[fragment0]</div>" }` — replaces `#content` entirely with only the first section
- Fragments 1–N → `{ type: "append", target: "#content", html }` — each subsequent section appended separately

If any append event is dropped (network hiccup, edge timing, Datastar processing order), the page is left partially rendered. The sync button is always the last fragment, so it goes missing most frequently. The multi-event approach is also unnecessary complexity — Datastar's morphing algorithm handles DOM diffing atomically given a full HTML payload.

### Fix 2: Webhook credential display

`buildTodayProjection` (`src/projections/today.ts:81`) calls:
```typescript
fragments.push(syncButton(user.webhook_id, null, user.last_sync_at, tz));
```

The bearer token is hardcoded to `null`. `syncButton` only calls `syncJustRegistered` (which shows the credentials) when both `callbackUrl` and `bearerToken` are non-null. Since `bearerToken` is always `null` in the reproject path, the credentials screen is never shown after registration, making it impossible to retrieve the configured token from the UI.

The encrypted bearer token is already stored in `users.webhook_bearer_token`; `decryptAesGcm` already exists in `src/utils/crypto.ts`.

## Design

### Fix 1: Single patch rendering

**`src/projections/build-events.ts`**

Simplify `buildContentEvents` to join all fragments into a single `patch` event:

```typescript
export function buildContentEvents(fragments: string[]): SseEvent[] {
  return [{ type: "patch", html: `<div id="content">${fragments.join("\n")}</div>` }];
}
```

One atomic SSE event replaces the entire `#content` div. Morph handles the diff. No append events, no race conditions.

**`src/actor/session-actor.ts`**

Remove `append` from the `SseEvent` union — it is no longer produced anywhere:

```typescript
export type SseEvent =
  | { type: "patch"; html: string }
  | { type: "remove"; target: string }
  | { type: "signals"; json: string; onlyIfMissing?: boolean }
  | { type: "error"; html: string };
```

Remove the `append` case from `writeSseEvent`.

**`src/index.ts`**

Simplify `unwrapContentEvents` — all events are now patch events, so the conditional is gone:

```typescript
function unwrapContentEvents(events: SseEvent[]): string {
  return events
    .filter((e): e is Extract<SseEvent, { html: string }> => "html" in e)
    .map((e) => e.html.replace(/^<div id="content">([\s\S]*)<\/div>$/, "$1"))
    .join("\n");
}
```

### Fix 2: Always-visible webhook credentials

**`src/projections/today.ts`**

Add `encryptionKey: string` parameter to `buildTodayProjection`. When `user.webhook_id` is set and `user.webhook_bearer_token` is non-null, decrypt it and pass the plaintext to `syncButton`:

```typescript
export async function buildTodayProjection(
  db: D1Database,
  userId: string,
  tz?: string,
  encryptionKey?: string
): Promise<TodayProjection>
```

```typescript
let webhookBearerToken: string | null = null;
if (user.webhook_id && user.webhook_bearer_token && encryptionKey) {
  webhookBearerToken = await decryptAesGcm(user.webhook_bearer_token, encryptionKey);
}
fragments.push(syncButton(user.webhook_id, webhookBearerToken, user.last_sync_at, tz));
```

**`src/actor/session-actor.ts`**

Pass `this.env.ENCRYPTION_KEY` when calling `buildTodayProjection` in `buildEventsForPage`.

**`src/index.ts`**

Pass `env.ENCRYPTION_KEY` to `buildTodayProjection` in both the SSE proxy path and the static render path.

**`src/fragments/today.ts`**

Add `lastSyncAt` and `tz` parameters to `syncJustRegistered` so that last-synced time is shown alongside credentials (since this is now the permanent registered view, not a one-time screen):

```typescript
function syncJustRegistered(
  callbackUrl: string,
  bearerToken: string,
  lastSyncAt?: string | null,
  tz?: string
): string
```

## Files Changed

| File | Change |
|------|--------|
| `src/projections/build-events.ts` | Single patch event instead of patch + appends |
| `src/actor/session-actor.ts` | Remove `append` from SseEvent union and writeSseEvent; pass encryptionKey to buildTodayProjection |
| `src/index.ts` | Simplify unwrapContentEvents; pass encryptionKey to buildTodayProjection |
| `src/projections/today.ts` | Add encryptionKey param; decrypt webhook_bearer_token when present |
| `src/fragments/today.ts` | Add lastSyncAt/tz to syncJustRegistered |

## No Schema Changes

The encrypted bearer token is already stored in `users.webhook_bearer_token`. No migrations required.
