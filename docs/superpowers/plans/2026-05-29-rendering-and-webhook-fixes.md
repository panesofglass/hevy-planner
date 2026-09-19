# Rendering and Webhook Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix flaky page rendering by replacing multi-event SSE with a single atomic patch, and make webhook credentials always visible by decrypting the stored bearer token on every render.

**Architecture:** Two independent fixes: (1) `buildContentEvents` emits one `patch` event containing all fragments joined, eliminating the append race; (2) `buildTodayProjection` decrypts `webhook_bearer_token` from D1 and passes it through to `syncButton`, which already knows how to render the credentials view when both `callbackUrl` and `bearerToken` are non-null.

**Tech Stack:** TypeScript, Cloudflare Workers, Durable Objects, Datastar SSE, D1 (SQLite), vitest (unit tests), Playwright (E2E)

---

## File Map

| File | Change |
|------|--------|
| `src/projections/build-events.ts` | Return single patch instead of patch + appends |
| `src/actor/session-actor.ts` | Remove `append` from `SseEvent` union; remove its `writeSseEvent` case; pass `ENCRYPTION_KEY` to `buildTodayProjection` |
| `src/index.ts` | Simplify `unwrapContentEvents`; pass `ENCRYPTION_KEY` to `buildTodayProjection` |
| `src/projections/today.ts` | Add `encryptionKey?: string` param; decrypt `webhook_bearer_token` when present |
| `src/fragments/today.ts` | Add `lastSyncAt`/`tz` to `syncJustRegistered`; thread them through `syncButton` |
| `test/projections/build-events.test.ts` | New — unit tests for `buildContentEvents` |
| `test/fragments/today.test.ts` | New — unit tests for `syncButton` credential rendering |

---

### Task 1: Simplify buildContentEvents — single patch event

**Files:**
- Modify: `src/projections/build-events.ts`
- Create: `test/projections/build-events.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `test/projections/build-events.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildContentEvents } from "~/projections/build-events";

describe("buildContentEvents", () => {
  it("returns exactly one event for multiple fragments", () => {
    const events = buildContentEvents(["<p>A</p>", "<p>B</p>"]);
    expect(events).toHaveLength(1);
  });

  it("returns a patch event type", () => {
    const events = buildContentEvents(["<p>A</p>"]);
    expect(events[0].type).toBe("patch");
  });

  it("wraps all fragments inside #content div", () => {
    const events = buildContentEvents(["<p>A</p>", "<p>B</p>"]);
    expect(events[0]).toMatchObject({
      type: "patch",
      html: '<div id="content"><p>A</p>\n<p>B</p></div>',
    });
  });

  it("returns single patch for a single fragment", () => {
    const events = buildContentEvents(["<p>only</p>"]);
    expect(events[0].html).toBe('<div id="content"><p>only</p></div>');
  });

  it("returns empty content div for no fragments", () => {
    const events = buildContentEvents([]);
    expect(events[0].html).toBe('<div id="content"></div>');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npx vitest run test/projections/build-events.test.ts
```

Expected: FAIL — "returns exactly one event for multiple fragments" fails because current implementation returns N events.

- [ ] **Step 3: Replace buildContentEvents with single-patch implementation**

Replace the entire contents of `src/projections/build-events.ts`:

```typescript
import type { SseEvent } from "../actor/session-actor";

/**
 * Convert an array of HTML fragment strings into a single patch SseEvent.
 * All fragments are joined inside one <div id="content"> and sent as one
 * atomic Datastar patch — no append race conditions.
 */
export function buildContentEvents(fragments: string[]): SseEvent[] {
  return [{ type: "patch", html: `<div id="content">${fragments.join("\n")}</div>` }];
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```
npx vitest run test/projections/build-events.test.ts
```

Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```
git add src/projections/build-events.ts test/projections/build-events.test.ts
git commit -m "Fix flaky rendering: single patch event instead of patch + appends"
```

---

### Task 2: Remove append from SseEvent union and simplify unwrapContentEvents

**Files:**
- Modify: `src/actor/session-actor.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Remove append from SseEvent union in session-actor.ts**

In `src/actor/session-actor.ts`, replace:

```typescript
export type SseEvent =
  | { type: "patch"; html: string }
  | { type: "append"; target: string; html: string }
  | { type: "remove"; target: string }
  | { type: "signals"; json: string; onlyIfMissing?: boolean }
  | { type: "error"; html: string };
```

With:

```typescript
export type SseEvent =
  | { type: "patch"; html: string }
  | { type: "remove"; target: string }
  | { type: "signals"; json: string; onlyIfMissing?: boolean }
  | { type: "error"; html: string };
```

- [ ] **Step 2: Remove the append case from writeSseEvent**

In `src/actor/session-actor.ts`, in the `writeSseEvent` method, remove:

```typescript
      case "append":
        sse.patchElements(event.html, { selector: event.target, mode: "append" });
        break;
```

The method now handles only: `patch`, `remove`, `signals`, `error`.

- [ ] **Step 3: Simplify unwrapContentEvents in index.ts**

In `src/index.ts`, replace:

```typescript
function unwrapContentEvents(events: SseEvent[]): string {
  return events
    .filter((e): e is Extract<SseEvent, { html: string }> => "html" in e)
    .map((e) =>
      e.type === "patch"
        ? e.html.replace(/^<div id="content">([\s\S]*)<\/div>$/, "$1")
        : e.html
    )
    .join("\n");
}
```

With:

```typescript
function unwrapContentEvents(events: SseEvent[]): string {
  return events
    .filter((e): e is Extract<SseEvent, { html: string }> => "html" in e)
    .map((e) => e.html.replace(/^<div id="content">([\s\S]*)<\/div>$/, "$1"))
    .join("\n");
}
```

- [ ] **Step 4: Run all unit tests to check for type errors or regressions**

```
npx vitest run
```

Expected: All existing tests pass. TypeScript will catch any remaining `append` usage at compile time — if there are failures, search for `type: "append"` in the codebase and remove them.

- [ ] **Step 5: Confirm TypeScript compiles cleanly**

```
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```
git add src/actor/session-actor.ts src/index.ts
git commit -m "Remove append SseEvent type; simplify unwrapContentEvents"
```

---

### Task 3: Update syncJustRegistered to show lastSyncAt alongside credentials

**Files:**
- Modify: `src/fragments/today.ts`
- Create: `test/fragments/today.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `test/fragments/today.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { syncButton } from "~/fragments/today";

describe("syncButton", () => {
  describe("with callbackUrl and bearerToken", () => {
    it("shows the callback URL in a code block", () => {
      const html = syncButton("https://example.com/api/webhooks/hevy", "tok-abc");
      expect(html).toContain("https://example.com/api/webhooks/hevy");
      expect(html).toContain("sync-credential-value");
    });

    it("shows the bearer token in a code block", () => {
      const html = syncButton("https://example.com/api/webhooks/hevy", "tok-abc");
      expect(html).toContain("tok-abc");
    });

    it("shows last-synced time when lastSyncAt is provided", () => {
      const html = syncButton(
        "https://example.com/api/webhooks/hevy",
        "tok-abc",
        "2026-05-29T10:00:00Z",
        "UTC"
      );
      expect(html).toContain("Last synced");
    });

    it("shows waiting message when lastSyncAt is null", () => {
      const html = syncButton("https://example.com/api/webhooks/hevy", "tok-abc", null);
      expect(html).toContain("Waiting for first sync");
    });
  });

  describe("with only callbackUrl", () => {
    it("shows auto-sync enabled without credential code blocks", () => {
      const html = syncButton("https://example.com/api/webhooks/hevy", null);
      expect(html).toContain("Auto-sync enabled");
      expect(html).not.toContain("sync-credential-value");
    });
  });

  describe("with no arguments", () => {
    it("shows enable auto-sync button", () => {
      const html = syncButton();
      expect(html).toContain("Enable auto-sync");
    });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npx vitest run test/fragments/today.test.ts
```

Expected: "shows last-synced time when lastSyncAt is provided" and "shows waiting message when lastSyncAt is null" fail — `syncJustRegistered` does not yet accept or render `lastSyncAt`.

- [ ] **Step 3: Update syncJustRegistered to accept and render lastSyncAt**

In `src/fragments/today.ts`, replace `syncJustRegistered`:

```typescript
function syncJustRegistered(callbackUrl: string, bearerToken: string, lastSyncAt?: string | null, tz?: string): string {
  const statusLabel = lastSyncAt
    ? `<div class="sync-last-synced">Last synced: ${escapeHtml(new Date(lastSyncAt).toLocaleString("en-US", { timeZone: tz ?? "UTC" }))}</div>`
    : `<div class="sync-last-synced">Waiting for first sync from Hevy&hellip;</div>`;

  return `<div class="sync-section">
  <div class="sync-status">
    <span class="sync-status-label">&#9679; Auto-sync enabled</span>
    ${DISABLE_BUTTON}
  </div>
  ${statusLabel}
  <div class="sync-credentials">
    <div class="sync-credentials-hint">Paste these into <a href="https://hevy.com/settings?developer" target="_blank" style="color:var(--blue)">Hevy developer settings</a>:</div>
    <div style="margin-bottom:6px">
      <div class="sync-credential-label">Callback URL</div>
      <code class="sync-credential-value">${escapeHtml(callbackUrl)}</code>
    </div>
    <div>
      <div class="sync-credential-label">Bearer token</div>
      <code class="sync-credential-value">${escapeHtml(bearerToken)}</code>
    </div>
  </div>
  <div class="sync-actions">${MANUAL_SYNC_BUTTON}</div>
</div>`;
}
```

- [ ] **Step 4: Thread lastSyncAt and tz through syncButton**

In `src/fragments/today.ts`, update the `syncButton` function so it passes `lastSyncAt` and `tz` to `syncJustRegistered`:

```typescript
export function syncButton(callbackUrl?: string | null, bearerToken?: string | null, lastSyncAt?: string | null, tz?: string): string {
  if (callbackUrl && bearerToken) return syncJustRegistered(callbackUrl, bearerToken, lastSyncAt, tz);
  if (callbackUrl) return syncRegistered(lastSyncAt, tz);
  return syncNotRegistered();
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```
npx vitest run test/fragments/today.test.ts
```

Expected: All 7 tests green.

- [ ] **Step 6: Commit**

```
git add src/fragments/today.ts test/fragments/today.test.ts
git commit -m "Show lastSyncAt alongside webhook credentials in syncJustRegistered"
```

---

### Task 4: Decrypt webhook_bearer_token in buildTodayProjection and wire through callers

**Files:**
- Modify: `src/projections/today.ts`
- Modify: `src/actor/session-actor.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Add encryptionKey param and decrypt logic to buildTodayProjection**

In `src/projections/today.ts`, add `decryptAesGcm` to the imports:

```typescript
import { decryptAesGcm } from "../utils/crypto";
```

Change the function signature from:

```typescript
export async function buildTodayProjection(db: D1Database, userId: string, tz?: string): Promise<TodayProjection>
```

To:

```typescript
export async function buildTodayProjection(db: D1Database, userId: string, tz?: string, encryptionKey?: string): Promise<TodayProjection>
```

Replace the `syncButton` line (currently near end of the function, reads `fragments.push(syncButton(user.webhook_id, null, user.last_sync_at, tz));`) with:

```typescript
  let webhookBearerToken: string | null = null;
  if (user.webhook_id && user.webhook_bearer_token && encryptionKey) {
    try {
      webhookBearerToken = await decryptAesGcm(user.webhook_bearer_token, encryptionKey);
    } catch {
      // Non-fatal: show registered state without credentials if decryption fails
    }
  }
  fragments.push(syncButton(user.webhook_id, webhookBearerToken, user.last_sync_at, tz));
```

- [ ] **Step 2: Pass ENCRYPTION_KEY in session-actor.ts**

In `src/actor/session-actor.ts`, in `buildEventsForPage`, the `today` case currently reads:

```typescript
      case "today":
        return (await buildTodayProjection(db, userId, tz)).events;
```

Update it to:

```typescript
      case "today":
        return (await buildTodayProjection(db, userId, tz, this.env.ENCRYPTION_KEY)).events;
```

- [ ] **Step 3: Pass ENCRYPTION_KEY in index.ts — SSE path**

In `src/index.ts`, in the `GET /` SSE branch (the `isSSERequest` path), the worker proxies to the DO via `actor.fetch` — no change needed there since the DO handles the SSE call. The non-SSE (static render) path calls `buildTodayProjection` directly. Find this block:

```typescript
          const projection = await buildTodayProjection(env.DB, auth.userId, tz);
```

Update it to:

```typescript
          const projection = await buildTodayProjection(env.DB, auth.userId, tz, env.ENCRYPTION_KEY);
```

- [ ] **Step 4: Confirm TypeScript compiles cleanly**

```
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Run all unit tests**

```
npx vitest run
```

Expected: All tests pass (the new `encryptionKey` param is optional, so existing tests that call `buildTodayProjection` without it still compile and run).

- [ ] **Step 6: Commit**

```
git add src/projections/today.ts src/actor/session-actor.ts src/index.ts
git commit -m "Decrypt webhook bearer token on render; always show credentials when registered"
```

---

### Task 5: Verify end-to-end

- [ ] **Step 1: Start the dev server**

```
npx wrangler dev
```

Leave running in a separate terminal.

- [ ] **Step 2: Run E2E tests**

```
npx playwright test
```

Expected: All existing E2E tests pass. Pay particular attention to `test/e2e/today.spec.ts` — the "page loads and renders content via SSE" test verifies `#content` is non-empty after SSE fires.

- [ ] **Step 3: Manual smoke test — rendering**

Open `http://localhost:8787` in a browser. Verify all sections appear: the routine card(s), upcoming section, and sync section at the bottom. Hard-refresh 5 times — content should be consistent every time (no missing sections).

- [ ] **Step 4: Manual smoke test — webhook credentials**

If you have a webhook registered (auto-sync enabled), verify the credentials section shows the Callback URL and Bearer token code blocks. Disable and re-enable auto-sync to confirm the credentials appear immediately after registration.

- [ ] **Step 5: Commit any test fixes if needed, then push**

```
git push
```

Deployment to `$DEV_WORKER_URL` happens automatically on push to `main` (`DEV_WORKER_URL` is set in the gitignored `.env.local`).
