# SSR Initial Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render page content in the initial HTML response so users see content immediately instead of a blank flash while waiting for SSE.

**Architecture:** Worker GET handlers call the same `build*Events()` projection functions the DO uses, extract HTML from the returned `SseEvent[]`, and embed it in the `htmlShell()` response. SSE still connects immediately via `data-init` for live updates. Datastar's `patchElements` morphs by element ID, so the first SSE response is idempotent.

**Tech Stack:** TypeScript, Cloudflare Workers, Datastar SSE

---

### File Map

- **Modify:** `src/fragments/layout.ts` — Allow `body` + `ssePath` to coexist (currently mutually exclusive)
- **Modify:** `src/index.ts` — Import projections, add `eventsToHtml()` helper, update 3 GET handlers

---

### Task 1: Allow `body` + `ssePath` in `htmlShell`

**Files:**
- Modify: `src/fragments/layout.ts:17-26`

Currently when `opts.body` is provided, `sseAttr` is ignored. We need the `data-init` attribute on `#content` even when body is pre-rendered.

- [ ] **Step 1: Update `htmlShell` body logic**

In `src/fragments/layout.ts`, replace the `bodyContent` construction (lines 23-26):

```ts
  const bodyContent = opts.body
    ? opts.body
    : `<div id="content"${sseAttr}></div>
    <div data-signals:hevy-url="''" data-effect="if ($hevyUrl) { window.open($hevyUrl, '_blank'); $hevyUrl = '' }" style="display:none"></div>`;
```

with:

```ts
  const bodyContent = opts.body
    ? opts.body.replace('<div id="content">', `<div id="content"${sseAttr}>`)
    : `<div id="content"${sseAttr}></div>
    <div data-signals:hevy-url="''" data-effect="if ($hevyUrl) { window.open($hevyUrl, '_blank'); $hevyUrl = '' }" style="display:none"></div>`;
```

The only difference: when `body` is provided and `ssePath` is set, inject `data-init` onto the `#content` div via string replace. The caller always provides `<div id="content">...</div>` so this is reliable.

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: Clean (no output)

- [ ] **Step 3: Commit**

```bash
git add src/fragments/layout.ts
git commit -m "Allow body + ssePath to coexist in htmlShell"
```

---

### Task 2: Add `eventsToHtml` helper and SSR the three GET handlers

**Files:**
- Modify: `src/index.ts:1-20` (imports), `src/index.ts:135-199` (GET handlers)

- [ ] **Step 1: Add imports**

Add these imports to `src/index.ts` after the existing imports (after line 18):

```ts
import { buildTodayEvents } from "./projections/today";
import { buildProgressEvents } from "./projections/progress";
import { buildProgramEvents } from "./projections/program";
import type { SseEvent } from "./actor/session-actor";
```

- [ ] **Step 2: Add `eventsToHtml` helper**

Add this helper in the "Local helpers" section of `src/index.ts` (after the `isSSERequest` function, before `type PageName`):

```ts
/** Extract HTML fragments from SseEvent[] for server-side rendering. */
function eventsToHtml(events: SseEvent[]): string {
  return events
    .filter((e): e is Extract<SseEvent, { html: string }> => "html" in e)
    .map((e) => e.html)
    .join("\n");
}
```

- [ ] **Step 3: Update GET `/` handler**

Replace the HTML branch of the `GET /` handler (the part after the `isSSERequest` check) with:

```ts
        let content: string;
        try {
          const events = await buildTodayEvents(env.DB, auth.userId, tz);
          content = eventsToHtml(events);
        } catch {
          content = setupPage();
        }

        const subtitle = content.includes("setup-container")
          ? "Setup"
          : await loadSubtitle(env.DB, auth.userId);
        return htmlResponse(
          htmlShell({
            title: APP_NAME,
            subtitle,
            activeTab: "today",
            ssePath: "/",
            body: `<div id="content">${content}</div>
    <div data-signals:hevy-url="''" data-effect="if ($hevyUrl) { window.open($hevyUrl, '_blank'); $hevyUrl = '' }" style="display:none"></div>`,
          })
        );
```

Note: The `hevyUrl` signal div is needed for push-to-Hevy. It's currently in `htmlShell`'s default body but won't be included when `body` is provided. The today page caller must include it explicitly. The `setupPage()` import is already used by the today projection — add it to the router imports:

```ts
import { setupPage } from "./fragments/setup";
```

- [ ] **Step 4: Update GET `/progress` handler**

Replace the HTML branch of the `GET /progress` handler with:

```ts
        let content: string;
        try {
          const events = await buildProgressEvents(env.DB, auth.userId, tz);
          content = eventsToHtml(events);
        } catch {
          content = `<div class="card"><p style="color:var(--text-secondary)">Unable to load progress data.</p></div>`;
        }

        const subtitle = await loadSubtitle(env.DB, auth.userId);
        return htmlResponse(
          htmlShell({
            title: "Progress",
            subtitle,
            activeTab: "progress",
            ssePath: "/progress",
            body: `<div id="content">${content}</div>`,
          })
        );
```

- [ ] **Step 5: Update GET `/program` handler**

Replace the HTML branch of the `GET /program` handler with:

```ts
        let content: string;
        try {
          const events = await buildProgramEvents(env.DB, auth.userId);
          content = eventsToHtml(events);
        } catch {
          content = `<div class="card"><p style="color:var(--text-secondary)">No active program. Upload a program to get started.</p></div>`;
        }

        const subtitle = await loadSubtitle(env.DB, auth.userId);
        return htmlResponse(
          htmlShell({
            title: "Program",
            subtitle,
            activeTab: "program",
            ssePath: "/program",
            body: `<div id="content">${content}</div>`,
          })
        );
```

- [ ] **Step 6: Remove unused `getUser` import duplication**

The `GET /` handler previously called `getUser` to check if the user existed. The projection now handles this (returns setup page if no user). The `getUser` import is still needed by the `loadSubtitle` helper, so no import changes needed — but the inline `getUser` call in the `/` handler can be removed (it was replaced in Step 3).

- [ ] **Step 7: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: Clean (no output)

- [ ] **Step 8: Run vitest**

Run: `npx vitest run`
Expected: 98 tests pass (projections are unchanged)

- [ ] **Step 9: Commit**

```bash
git add src/index.ts
git commit -m "SSR initial page content from projection functions"
```

---

### Task 3: Run E2E tests

**Files:** None (verification only)

- [ ] **Step 1: Run Playwright E2E tests**

Run: `npx playwright test`
Expected: All tests pass. The SSE assertions still hold because SSE connects and patches the same content idempotently.

- [ ] **Step 2: Manual smoke test (if dev server available)**

Open each page (`/`, `/progress`, `/program`) and verify:
- Content is visible on first paint (no blank flash)
- SSE connection still establishes (check Network tab for `text/event-stream` request)
- Mutations (sync, complete) still trigger live updates via SSE reproject
