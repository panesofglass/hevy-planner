# SSE Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken hand-rolled SSE layer with the official Datastar SDK and separate command/query communication channels via a Durable Object actor.

**Architecture:** POST/PUT/DELETE handlers validate, mutate D1, broadcast fragments to a per-user Durable Object, and return 202 (or 4xx). A single SSE stream per page (`GET /` with `Accept: text/event-stream`) is held by the DO, which projects initial state from D1 and forwards broadcast messages as Datastar patch events. Static pages (`/progress`, `/program`, `/routine/:id`) drop SSE entirely and serve full HTML.

**Tech Stack:** `@starfederation/datastar-sdk` (web/WinterCG export), Cloudflare Durable Objects, Playwright for E2E tests, vitest for domain unit tests.

**Reference implementation:** `~/Code/frank/sample/Frank.Datastar.Hox/Program.fs` — the canonical pattern for fire-and-forget handlers broadcasting to a single SSE connection via actor/channel.

**Design spec:** `docs/superpowers/specs/2026-04-11-sse-architecture-design.md`

---

## File Structure

### New files
- `src/actor/session-actor.ts` — Durable Object class: holds SSE streams, receives broadcasts, projects state
- `tests/e2e/today.spec.ts` — Playwright: today page SSE streaming, sync, complete, reconnect
- `tests/e2e/benchmarks.spec.ts` — Playwright: benchmark logging, gate tests, phase advancement
- `tests/e2e/skills.spec.ts` — Playwright: skill assessment CRUD
- `tests/e2e/program.spec.ts` — Playwright: program page renders, BODi section
- `tests/e2e/helpers.ts` — Shared Playwright utilities (base URL, seed, selectors)
- `playwright.config.ts` — Playwright configuration

### Modified files
- `package.json` — add `@starfederation/datastar-sdk`, `@playwright/test` dev dep
- `wrangler.toml` — add Durable Object binding and migration
- `src/types.ts` — add `SessionActor` to `Env` bindings
- `src/index.ts` — proxy SSE requests to DO, change POST handlers to return 202
- `src/routes/today.ts` — remove SSE response building, return data for DO projection
- `src/routes/sync.ts` — return 202, broadcast via DO
- `src/routes/setup.ts` — return 202, broadcast via DO
- `src/routes/advance-phase.ts` — return 202, broadcast via DO
- `src/routes/benchmarks.ts` — return 202 (static page POST)
- `src/routes/skill-assessment.ts` — return 202 (static page POST)
- `src/routes/program.ts` — remove SSE, render full HTML
- `src/routes/progress.ts` — remove SSE, render full HTML
- `src/routes/routine.ts` — remove SSE, render full HTML
- `src/fragments/layout.ts` — ensure HTML shell supports inline content for static pages

### Deleted files
- `src/sse/helpers.ts` — replaced by SDK
- `src/utils/sse.ts` — replaced by SDK
- `test/sse/helpers.test.ts` — tests deleted code
- `test-e2e.sh` — replaced by Playwright (intent ported)

---

## Task 1: Install SDK and configure Durable Object

**Files:**
- Modify: `package.json`
- Modify: `wrangler.toml`
- Modify: `src/types.ts`

- [ ] **Step 1: Install the Datastar SDK**

```bash
npm install @starfederation/datastar-sdk
```

- [ ] **Step 2: Install Playwright**

```bash
npm install -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 3: Add DO binding to wrangler.toml**

Add after the `[[d1_databases]]` section in `wrangler.toml`:

```toml
[durable_objects]
bindings = [
  { name = "SESSION_ACTOR", class_name = "SessionActor" }
]

[[migrations]]
tag = "v1"
new_classes = ["SessionActor"]
```

Also add the same to `[env.production]`:

```toml
[env.production.durable_objects]
bindings = [
  { name = "SESSION_ACTOR", class_name = "SessionActor" }
]
```

- [ ] **Step 4: Add DO to Env type**

In `src/types.ts`, add to the `Env` interface:

```typescript
export interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
  CF_ACCESS_AUD?: string;
  ENCRYPTION_KEY: string;
  SESSION_ACTOR: DurableObjectNamespace;
}
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json wrangler.toml src/types.ts
git commit -m "Add Datastar SDK, Playwright, and Durable Object config"
```

---

## Task 2: Create the SessionActor Durable Object

**Files:**
- Create: `src/actor/session-actor.ts`
- Modify: `src/index.ts` (add export)

- [ ] **Step 1: Write a minimal DO that holds an SSE stream**

Create `src/actor/session-actor.ts`:

```typescript
import { ServerSentEventGenerator } from "@starfederation/datastar-sdk/web";

interface BroadcastMessage {
  type: "patch-elements";
  html: string;
  selector?: string;
  mode?: string;
}

export class SessionActor implements DurableObject {
  private streams: Set<ServerSentEventGenerator> = new Set();
  private state: DurableObjectState;
  private env: { DB: D1Database };

  constructor(state: DurableObjectState, env: { DB: D1Database }) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/broadcast") {
      return this.handleBroadcast(request);
    }

    if (url.pathname === "/connect") {
      return this.handleConnect(request);
    }

    return new Response("Not found", { status: 404 });
  }

  private async handleConnect(request: Request): Promise<Response> {
    return ServerSentEventGenerator.stream(async (sse) => {
      this.streams.add(sse);
      try {
        // TODO Task 4: project initial state from D1 here
        // Hold connection open — SDK keeps stream alive
        // until client disconnects or we close it
        await new Promise<void>((resolve) => {
          // Resolved when the stream is closed by cleanup
          const check = setInterval(() => {
            if (!this.streams.has(sse)) {
              clearInterval(check);
              resolve();
            }
          }, 1000);
        });
      } finally {
        this.streams.delete(sse);
      }
    }, {
      onAbort: () => {
        // Client disconnected — clean up handled by finally block
      },
    });
  }

  private async handleBroadcast(request: Request): Promise<Response> {
    const messages: BroadcastMessage[] = await request.json();
    for (const msg of messages) {
      for (const sse of this.streams) {
        try {
          sse.patchElements(msg.html, {
            selector: msg.selector,
            mode: msg.mode as any,
          });
        } catch {
          // Stream may have closed — remove on next cleanup
          this.streams.delete(sse);
        }
      }
    }
    return new Response(null, { status: 204 });
  }
}
```

- [ ] **Step 2: Export the DO from the worker entry point**

In `src/index.ts`, add at the bottom:

```typescript
export { SessionActor } from "./actor/session-actor";
```

- [ ] **Step 3: Verify it compiles**

```bash
npx wrangler dev --test-scheduled 2>&1 | head -20
```

Expected: no TypeScript errors related to SessionActor.

- [ ] **Step 4: Commit**

```bash
git add src/actor/session-actor.ts src/index.ts
git commit -m "Add SessionActor Durable Object with SSE stream and broadcast"
```

---

## Task 3: Wire the router to proxy SSE to the DO

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Add a helper to get the DO stub**

Add near the top of `src/index.ts`, after the imports:

```typescript
function getSessionActor(env: Env, userId: string): DurableObjectStub {
  const id = env.SESSION_ACTOR.idFromName(userId);
  return env.SESSION_ACTOR.get(id);
}
```

- [ ] **Step 2: Proxy SSE requests on `GET /` to the DO**

Replace the SSE branch of the `GET /` handler:

```typescript
// Old:
if (isSSERequest(request)) {
  return await handleTodaySSE(env, auth.userId, tz);
}

// New:
if (isSSERequest(request)) {
  const actor = getSessionActor(env, auth.userId);
  return actor.fetch(new Request("https://actor/connect"));
}
```

- [ ] **Step 3: Keep isSSERequest as inline check**

Replace the import of `isSSERequest` from `"./sse/helpers"` with an inline function at the top of `src/index.ts`:

```typescript
function isSSERequest(request: Request): boolean {
  const accept = request.headers.get("accept") || "";
  return accept.includes("text/event-stream");
}
```

Remove the `isSSERequest` import from `"./sse/helpers"`.

- [ ] **Step 4: Verify the SSE connection opens**

Start dev server and open browser to `http://localhost:8787/`. The page should load the HTML shell. The SSE connection should open (check Network tab for an `event-stream` request). Content won't render yet — that's Task 4.

- [ ] **Step 5: Commit**

```bash
git add src/index.ts
git commit -m "Proxy SSE requests to SessionActor Durable Object"
```

---

## Task 4: Project initial state in the DO

**Files:**
- Modify: `src/actor/session-actor.ts`
- Modify: `src/routes/today.ts` — extract data-fetching logic

The DO needs to read D1 and stream today's page content on connect. Rather than duplicating the D1 queries, we extract the data-fetching from `handleTodaySSE` into a pure function that returns data, and the DO calls it then streams fragments.

- [ ] **Step 1: Extract today data-fetching into a reusable function**

In `src/routes/today.ts`, create a new exported function that returns the data without building SSE:

```typescript
export interface TodayData {
  dailyRoutine: Routine | undefined;
  dailyDoneToday: boolean;
  nextItem: QueueItemRow | undefined;
  nextRoutine: Routine | undefined;
  completedData: Array<{ title: string; hevy_workout_data: string | null }>;
  upcoming: Array<{ routineTitle: string; dayLabel: string }>;
  routineToHevyId: Map<string, string>;
  webhookId: string | null;
  bearerToken: string | null;
  lastSyncAt: string | null;
}

export async function loadTodayData(
  env: Env,
  userId: string,
  tz?: string,
  opts?: { showCredentials?: boolean }
): Promise<TodayData | null> {
  const user = await getUser(env.DB, userId);
  if (!user) return null;

  const { program, programId } = await loadProgram(env.DB, userId);
  const routineMap = new Map(program.routines.map((r) => [r.id, r]));
  const dailyRoutine = program.routines.find((r) => r.isDaily);
  const items = await getQueueItems(env.DB, userId, programId);
  const today = todayString(tz);

  const routineMappings = await getRoutineMappings(env.DB, userId, programId);
  const routineToHevyId = new Map(
    routineMappings.map((m) => [m.program_routine_id, m.hevy_routine_id])
  );

  const dailyDoneToday = !!(dailyRoutine && user.daily_completed_date === today);

  const nextItem = getNextRoutine(items);
  const nextRoutine = nextItem ? routineMap.get(nextItem.routine_id) : undefined;

  const completed = getCompletedRoutines(items, today);
  const completedData = completed.map((item) => ({
    title: routineMap.get(item.routine_id)?.title ?? item.routine_id,
    hevy_workout_data: item.hevy_workout_data,
  }));
  if (dailyDoneToday && dailyRoutine) {
    completedData.unshift({ title: dailyRoutine.title, hevy_workout_data: null });
  }

  let upcoming: Array<{ routineTitle: string; dayLabel: string }> = [];
  const template = program.weekTemplates.find((t) => t.id === user.template_id);
  if (template) {
    const pendingItems = items.filter((i) => i.status === "pending").sort((a, b) => a.position - b.position);
    const upcomingPending = pendingItems.slice(1);
    const jsDay = new Date(today + "T12:00:00Z").getDay();
    const todayDow = jsDay === 0 ? 6 : jsDay - 1;
    upcoming = computeUpcoming(upcomingPending, template, program.routines, 5, todayDow);
  }

  let bearerToken: string | null = null;
  if (opts?.showCredentials && user.webhook_bearer_token) {
    const { decryptAesGcm } = await import("../utils/crypto");
    bearerToken = await decryptAesGcm(user.webhook_bearer_token, env.ENCRYPTION_KEY);
  }

  return {
    dailyRoutine,
    dailyDoneToday,
    nextItem,
    nextRoutine,
    completedData,
    upcoming,
    routineToHevyId,
    webhookId: user.webhook_id,
    bearerToken,
    lastSyncAt: user.last_sync_at,
  };
}
```

- [ ] **Step 2: Update the DO to project state on connect**

In `src/actor/session-actor.ts`, update `handleConnect` to fetch today data and stream fragments. The DO needs access to the fragment builders and the data loader:

```typescript
import { loadTodayData } from "../routes/today";
import {
  carsCard, heroRoutineCard, completedSection,
  upcomingSection, syncButton
} from "../fragments/today";
import { setupPage } from "../fragments/setup";

// In handleConnect, replace the TODO:
private async handleConnect(request: Request): Promise<Response> {
  const userId = new URL(request.url).searchParams.get("userId")!;
  const tz = new URL(request.url).searchParams.get("tz") || undefined;

  return ServerSentEventGenerator.stream(async (sse) => {
    this.streams.add(sse);
    try {
      // Project initial state
      const data = await loadTodayData(
        { DB: this.env.DB, ENVIRONMENT: "", ENCRYPTION_KEY: "" } as any,
        userId,
        tz
      );

      if (!data) {
        sse.patchElements(setupPage(), { selector: "#content", mode: "inner" });
        return;
      }

      let isFirst = true;
      const patch = (html: string) => {
        sse.patchElements(html, {
          selector: "#content",
          mode: isFirst ? "inner" : "append",
        });
        isFirst = false;
      };

      if (data.dailyRoutine && !data.dailyDoneToday) {
        patch(carsCard(data.dailyRoutine, data.routineToHevyId.get(data.dailyRoutine.id)));
      }

      if (data.nextItem && data.nextRoutine) {
        const mode = (data.dailyRoutine && !data.dailyDoneToday) ? "append" : "inner";
        sse.patchElements(
          heroRoutineCard(data.nextRoutine, data.nextItem),
          { selector: "#content", mode: isFirst ? "inner" : mode }
        );
        isFirst = false;
      }

      if (data.completedData.length > 0) {
        patch(completedSection(data.completedData));
      }

      if (data.upcoming.length > 0) {
        patch(upcomingSection(data.upcoming));
      }

      patch(syncButton(data.webhookId, data.bearerToken, data.lastSyncAt, tz));

      // Hold connection open for broadcasts
      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          if (!this.streams.has(sse)) {
            clearInterval(check);
            resolve();
          }
        }, 1000);
      });
    } finally {
      this.streams.delete(sse);
    }
  }, {
    onAbort: () => {},
  });
}
```

- [ ] **Step 3: Pass userId and tz when proxying from router**

In `src/index.ts`, update the SSE proxy to pass context:

```typescript
if (isSSERequest(request)) {
  const actor = getSessionActor(env, auth.userId);
  const connectUrl = new URL("https://actor/connect");
  connectUrl.searchParams.set("userId", auth.userId);
  if (tz) connectUrl.searchParams.set("tz", tz);
  return actor.fetch(new Request(connectUrl.toString()));
}
```

- [ ] **Step 4: Verify the today page renders via DO**

Start dev server, open `http://localhost:8787/`. The today page should render with CARs card, hero session, etc. — all streamed from the DO. Check Network tab: the SSE request should show `event: datastar-patch-elements` events arriving.

- [ ] **Step 5: Commit**

```bash
git add src/actor/session-actor.ts src/routes/today.ts src/index.ts
git commit -m "Project today page state from SessionActor on SSE connect"
```

---

## Task 5: Convert POST handlers to fire-and-forget (202 + broadcast)

**Files:**
- Modify: `src/routes/sync.ts`
- Modify: `src/routes/setup.ts`
- Modify: `src/routes/advance-phase.ts`
- Modify: `src/routes/benchmarks.ts`
- Modify: `src/routes/skill-assessment.ts`
- Modify: `src/index.ts`

This is the largest task. Each POST handler needs to: validate (4xx), mutate, broadcast to DO, return 202.

- [ ] **Step 1: Add a broadcast helper to the router**

In `src/index.ts`, add:

```typescript
async function broadcastToActor(
  env: Env,
  userId: string,
  messages: Array<{ type: "patch-elements"; html: string; selector?: string; mode?: string }>
): Promise<void> {
  const actor = getSessionActor(env, userId);
  await actor.fetch(new Request("https://actor/broadcast", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(messages),
  }));
}
```

Export it for use by route handlers:

```typescript
export { broadcastToActor };
```

- [ ] **Step 2: Convert handlePull (sync.ts)**

Change `handlePull` to: perform sync, broadcast updated today page, return 202.

```typescript
export async function handlePull(env: Env, userId: string, tz?: string): Promise<Response> {
  const user = await getUser(env.DB, userId);
  if (!user || !user.hevy_api_key) {
    return new Response("Connect your Hevy API key first.", { status: 400 });
  }

  try {
    const apiKey = await getDecryptedApiKey(env.DB, userId, env.ENCRYPTION_KEY);
    if (!apiKey) {
      return new Response("Connect your Hevy API key first.", { status: 400 });
    }
    await performSync(env.DB, userId, apiKey, tz);
    // Broadcast is handled by DO re-projecting on next connect or via explicit broadcast
    // For now, broadcast a re-project signal
    return new Response(null, { status: 202 });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : "Pull failed", { status: 500 });
  }
}
```

- [ ] **Step 3: Convert handlePush (sync.ts)**

Change to return 202 on success, broadcast the `executeScript` for opening Hevy:

```typescript
// On success, instead of sseResponse(executeScript(...)):
return new Response(null, { status: 202 });
// The Hevy URL opening should be handled client-side via Datastar action
```

Note: `window.open` via `executeScript` needs to happen on the SSE stream, not the POST response. The POST handler should broadcast it to the DO. Update to accept `broadcastToActor` or restructure so the router does the broadcast after calling the handler. This detail should be refined during implementation — the key principle is: POST returns 202, side effects go through the DO.

- [ ] **Step 3b: Convert handleManualComplete (sync.ts)**

Return 202, then router triggers DO reproject (same as handlePull):

```typescript
export async function handleManualComplete(
  env: Env, userId: string, itemId: number, tz?: string
): Promise<Response> {
  if (!Number.isInteger(itemId)) {
    return new Response("Invalid item ID", { status: 400 });
  }
  const today = todayString(tz);
  await markQueueItemCompletedForUser(env.DB, itemId, userId, today);
  return new Response(null, { status: 202 });
}
```

- [ ] **Step 3c: Convert handleCleanupRoutines (sync.ts)**

Return 202 on success. The result message can be broadcast to the DO:

```typescript
export async function handleCleanupRoutines(env: Env, userId: string): Promise<Response> {
  const user = await getUser(env.DB, userId);
  if (!user || !user.hevy_api_key) {
    return new Response("Connect your Hevy API key first.", { status: 400 });
  }

  const apiKey = await getDecryptedApiKey(env.DB, userId, env.ENCRYPTION_KEY);
  if (!apiKey) {
    return new Response("Connect your Hevy API key first.", { status: 400 });
  }
  const client = new HevyClient(apiKey);
  // ... existing cleanup logic ...
  return new Response(null, { status: 202 });
}
```

- [ ] **Step 4: Convert handleSetup (setup.ts)**

Change to return 202 on success. The redirect to `/` happens client-side (Datastar action, not `executeScript`).

```typescript
// End of handleSetup, replace:
//   return sseResponse(executeScript("window.location.href = '/'"));
// With:
return new Response(null, { status: 202 });
```

The client-side Datastar attribute on the setup form should handle navigation after 202.

- [ ] **Step 5: Convert handleAdvancePhase (advance-phase.ts)**

Return 202 on success, 400 on gate failure, 404 on bad phase.

- [ ] **Step 6: Convert handleLogBenchmark (benchmarks.ts)**

Return 202 on success, 404 on unknown benchmark. These are static page POSTs — no broadcast needed, client refreshes.

- [ ] **Step 7: Convert handleSkillAssessment (skill-assessment.ts)**

Return 202 on success, 404 on unknown skill. Static page POST.

- [ ] **Step 7b: Convert program.ts POST handlers**

`handleValidateProgram`, `handleValidateImportProgram` — these are validation-only, return the validation result as JSON or HTML (not SSE). Change to return appropriate non-SSE responses.

`handleImportProgram`, `handleSwitchProgram`, `handleDeleteProgram` — mutate D1, return 202 on success, 4xx on failure. Client-side Datastar handles page refresh.

- [ ] **Step 8: Update router to pass broadcastToActor where needed**

For handlers that need to broadcast (sync, setup), the router should broadcast after the handler returns 202. This keeps handlers unaware of the DO:

```typescript
// In the POST /api/pull route:
if (method === "POST" && path === "/api/pull") {
  const response = await handlePull(env, auth.userId, tz);
  if (response.status === 202) {
    // Tell the DO to re-project state for connected clients
    const actor = getSessionActor(env, auth.userId);
    await actor.fetch(new Request("https://actor/reproject?" +
      new URLSearchParams({ userId: auth.userId, ...(tz ? { tz } : {}) })
    ));
  }
  return response;
}
```

This requires adding a `/reproject` endpoint to the DO (Task 6).

- [ ] **Step 9: Commit**

```bash
git add src/routes/sync.ts src/routes/setup.ts src/routes/advance-phase.ts \
  src/routes/benchmarks.ts src/routes/skill-assessment.ts src/index.ts
git commit -m "Convert POST handlers to 202 fire-and-forget pattern"
```

---

## Task 6: Add DO reproject endpoint

**Files:**
- Modify: `src/actor/session-actor.ts`

After a command completes, the router tells the DO to re-project current state to all connected streams. This reuses the same projection logic from `handleConnect`.

- [ ] **Step 1: Extract projection into a shared method**

```typescript
private async projectState(sse: ServerSentEventGenerator, userId: string, tz?: string): Promise<void> {
  const data = await loadTodayData(
    { DB: this.env.DB, ENVIRONMENT: "", ENCRYPTION_KEY: "" } as any,
    userId,
    tz
  );

  if (!data) {
    sse.patchElements(setupPage(), { selector: "#content", mode: "inner" });
    return;
  }

  // Same fragment streaming logic as handleConnect...
  // (extract from Task 4 Step 2)
}
```

- [ ] **Step 2: Add `/reproject` route to DO fetch**

```typescript
if (url.pathname === "/reproject") {
  const userId = url.searchParams.get("userId")!;
  const tz = url.searchParams.get("tz") || undefined;
  for (const sse of this.streams) {
    try {
      await this.projectState(sse, userId, tz);
    } catch {
      this.streams.delete(sse);
    }
  }
  return new Response(null, { status: 204 });
}
```

- [ ] **Step 3: Verify end-to-end: POST sync → DO re-projects → browser updates**

1. Open browser to `http://localhost:8787/`
2. Click "Sync" button
3. POST returns 202
4. SSE stream receives updated fragments
5. Page updates without full reload

- [ ] **Step 4: Commit**

```bash
git add src/actor/session-actor.ts
git commit -m "Add reproject endpoint to SessionActor for post-command refresh"
```

---

## Task 7: Convert static pages to full HTML (drop SSE)

**Files:**
- Modify: `src/routes/progress.ts`
- Modify: `src/routes/program.ts`
- Modify: `src/routes/routine.ts`
- Modify: `src/index.ts`
- Modify: `src/fragments/layout.ts`

- [ ] **Step 1: Update progress.ts to return full HTML**

Replace `handleProgressSSE` with `renderProgressPage` that returns an HTML string (not SSE):

```typescript
export async function renderProgressPage(env: Env, userId: string, tz?: string): Promise<string> {
  const { program, programId, currentPhaseId, phaseAdvancedAt } = await loadProgram(env.DB, userId);
  const assessments = await getUserSkillAssessments(env.DB, userId, programId);
  const results = await getBenchmarkResults(env.DB, userId, programId);

  const today = tz
    ? new Date().toLocaleDateString("en-CA", { timeZone: tz })
    : new Date().toISOString().slice(0, 10);

  const sections: string[] = [];

  if (program.skills && program.skills.length > 0) {
    sections.push(skillCards(program.skills, assessments));
  }
  if (program.roadmap && program.roadmap.length > 0) {
    sections.push(roadmapSection(program.roadmap, results, program.benchmarks ?? [], currentPhaseId, phaseAdvancedAt));
  }
  if (program.benchmarks && program.benchmarks.length > 0) {
    sections.push(benchmarksSection(program.benchmarks, results, today));
  }

  return sections.join("");
}
```

- [ ] **Step 2: Update program.ts and routine.ts similarly**

Same pattern: return HTML strings, not SSE responses.

- [ ] **Step 3: Update router to serve full HTML for static pages**

Replace content negotiation on `/progress`, `/program`, `/routine/:id` with direct HTML rendering:

```typescript
// GET /progress — no SSE, full HTML
if (method === "GET" && path === "/progress") {
  const subtitle = await loadSubtitle(env.DB, auth.userId);
  const body = await renderProgressPage(env, auth.userId, tz);
  return htmlResponse(
    htmlShell({
      title: "Progress",
      subtitle,
      activeTab: "progress",
      body: `<div id="content">${body}</div>`,
    })
  );
}
```

- [ ] **Step 4: Ensure htmlShell supports inline body content**

Check `src/fragments/layout.ts` — the `htmlShell` function likely uses `ssePath` to set up Datastar SSE fetching. For static pages, pass `body` instead of `ssePath` so content is rendered inline.

- [ ] **Step 5: Verify static pages render without SSE**

Browse to `/progress`, `/program`, `/routine/daily-cars`. Content should render immediately (no SSE request in Network tab).

- [ ] **Step 6: Commit**

```bash
git add src/routes/progress.ts src/routes/program.ts src/routes/routine.ts \
  src/index.ts src/fragments/layout.ts
git commit -m "Convert static pages to full HTML, drop SSE"
```

---

## Task 8: Delete old SSE helpers

**Files:**
- Delete: `src/sse/helpers.ts`
- Delete: `src/utils/sse.ts`
- Delete: `test/sse/helpers.test.ts`

- [ ] **Step 1: Remove all remaining imports of old SSE helpers**

Search for any remaining imports:

```bash
grep -r "from.*sse/helpers\|from.*utils/sse" src/
```

Remove or replace each. By this point, all routes should be converted.

- [ ] **Step 2: Delete the files**

```bash
rm src/sse/helpers.ts src/utils/sse.ts test/sse/helpers.test.ts
rmdir src/sse  # if empty
```

- [ ] **Step 3: Run vitest to confirm domain tests still pass**

```bash
npx vitest run
```

Expected: domain tests pass, no SSE helper tests (deleted).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Delete hand-rolled SSE helpers, replaced by official SDK"
```

---

## Task 9: Playwright test setup and today page tests

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/helpers.ts`
- Create: `tests/e2e/today.spec.ts`

- [ ] **Step 1: Create Playwright config**

Create `playwright.config.ts`:

```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:8787",
    headless: true,
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:8787",
    reuseExistingServer: true,
    timeout: 10_000,
  },
});
```

- [ ] **Step 2: Create shared helpers**

Create `tests/e2e/helpers.ts`:

```typescript
import { Page, expect } from "@playwright/test";

export const BASE_URL = "http://localhost:8787";

/** Seed the database by posting the setup form. */
export async function seedDatabase(page: Page): Promise<void> {
  const response = await page.request.post(`${BASE_URL}/api/setup/3-day`, {
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({}),
  });
  expect(response.status()).toBe(202);
}

/** Wait for SSE content to appear in #content */
export async function waitForContent(page: Page, text: string, timeout = 5000): Promise<void> {
  await expect(page.locator("#content")).toContainText(text, { timeout });
}
```

- [ ] **Step 3: Create today page tests**

Create `tests/e2e/today.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";
import { waitForContent } from "./helpers";

test.describe("Today page", () => {
  test("loads and renders via SSE stream", async ({ page }) => {
    await page.goto("/");
    // SSE should stream content into #content
    await waitForContent(page, "Push to Hevy", 10_000);
  });

  test("SSE connection uses event-stream content type", async ({ page }) => {
    const sseRequests: string[] = [];
    page.on("request", (req) => {
      if (req.headers()["accept"]?.includes("text/event-stream")) {
        sseRequests.push(req.url());
      }
    });
    await page.goto("/");
    await waitForContent(page, "Push to Hevy", 10_000);
    expect(sseRequests.length).toBeGreaterThan(0);
  });

  test("POST /api/pull returns 202", async ({ page }) => {
    const response = await page.request.post("/api/pull");
    expect(response.status()).toBe(202);
  });
});
```

- [ ] **Step 4: Run the tests**

```bash
npx playwright test
```

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts tests/e2e/
git commit -m "Add Playwright E2E tests for today page SSE streaming"
```

---

## Task 10: Port remaining test-e2e.sh scenarios to Playwright

**Files:**
- Create: `tests/e2e/benchmarks.spec.ts`
- Create: `tests/e2e/skills.spec.ts`
- Create: `tests/e2e/program.spec.ts`
- Delete: `test-e2e.sh`

- [ ] **Step 1: Create benchmarks tests**

Port the intent from `test-e2e.sh` issue1 and issue2 sections. Test through the browser: navigate to `/progress`, log benchmarks via POST, verify the page shows results after refresh.

Create `tests/e2e/benchmarks.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Benchmark logging (issue #1)", () => {
  test("POST log-benchmark returns 202", async ({ page }) => {
    const response = await page.request.post("/api/log-benchmark/wall-dorsiflexion", {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: "value=3.5&passed=true&notes=Right+side+improving",
    });
    expect(response.status()).toBe(202);
  });

  test("logged values appear on progress page", async ({ page }) => {
    // Log a value
    await page.request.post("/api/log-benchmark/wall-dorsiflexion", {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: "value=3.5&passed=true",
    });
    // Navigate and verify
    await page.goto("/progress");
    await expect(page.locator("#content")).toContainText("3.5", { timeout: 5000 });
  });

  test("invalid benchmark ID returns 404", async ({ page }) => {
    const response = await page.request.post("/api/log-benchmark/nonexistent-xyz", {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: "value=1&passed=true",
    });
    expect(response.status()).toBe(404);
  });

  test("bilateral tracking shows both sides", async ({ page }) => {
    await page.request.post("/api/log-benchmark/wall-dorsiflexion", {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: "value=4.5&passed=true&side=left",
    });
    await page.request.post("/api/log-benchmark/wall-dorsiflexion", {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: "value=2.5&passed=false&side=right",
    });
    await page.goto("/progress");
    const content = page.locator("#content");
    await expect(content).toContainText("left", { timeout: 5000 });
    await expect(content).toContainText("right");
  });

  test("gate tests show on roadmap", async ({ page }) => {
    await page.goto("/progress");
    await expect(page.locator("#content")).toContainText("gate", { timeout: 5000 });
  });
});

test.describe("Phase advancement (issue #2)", () => {
  test("cannot advance without gates passed", async ({ page }) => {
    const response = await page.request.post("/api/advance-phase/phase2");
    // Should be 400 (gates not passed) not 202
    expect(response.status()).toBe(400);
  });

  test("POST advance-phase returns 202 when gates are met", async ({ page }) => {
    // Log all Phase 1 gate benchmarks
    const gates = [
      "pain-free-planks", "strict-pullups-8", "clean-dips-15",
      "cossack-squat-full", "single-leg-balance-30",
      "wall-dorsiflexion-4in", "hollow-body-30s", "overhead-wall-test",
    ];
    for (const gate of gates) {
      await page.request.post(`/api/log-benchmark/${gate}`, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        data: "value=pass&passed=true",
      });
    }

    const response = await page.request.post("/api/advance-phase/phase1");
    expect(response.status()).toBe(202);
  });

  test("phase change persists on page reload", async ({ page }) => {
    await page.goto("/progress");
    const content = page.locator("#content");
    // Phase 2 should be current after advancing from phase 1
    await expect(content).toContainText("Strength Prerequisites", { timeout: 5000 });
  });

  test("invalid phase ID returns 404", async ({ page }) => {
    const response = await page.request.post("/api/advance-phase/nonexistent-xyz");
    expect(response.status()).toBe(404);
  });
});
```

- [ ] **Step 2: Create skills tests**

Create `tests/e2e/skills.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Skill assessments (issue #3)", () => {
  test("POST skill-assessment returns 202", async ({ page }) => {
    const response = await page.request.post("/api/skill-assessment/muscle-up", {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: "current_state=Can+do+5+strict+pull-ups",
    });
    expect(response.status()).toBe(202);
  });

  test("assessment appears on progress page", async ({ page }) => {
    await page.request.post("/api/skill-assessment/muscle-up", {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: "current_state=Can+do+5+strict+pull-ups",
    });
    await page.goto("/progress");
    await expect(page.locator("#content")).toContainText("5 strict pull-ups", { timeout: 5000 });
  });

  test("updated assessment replaces old one (UPSERT)", async ({ page }) => {
    await page.request.post("/api/skill-assessment/muscle-up", {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: "current_state=Up+to+8+pull-ups+now",
    });
    await page.goto("/progress");
    const content = page.locator("#content");
    await expect(content).toContainText("8 pull-ups", { timeout: 5000 });
    await expect(content).not.toContainText("5 strict pull-ups");
  });

  test("invalid skill ID returns 404", async ({ page }) => {
    const response = await page.request.post("/api/skill-assessment/nonexistent-xyz", {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: "current_state=test",
    });
    expect(response.status()).toBe(404);
  });
});
```

- [ ] **Step 3: Create program page tests**

Create `tests/e2e/program.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Program page (issue #10 BODi)", () => {
  test("renders without SSE (full HTML)", async ({ page }) => {
    const sseRequests: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/program") && req.headers()["accept"]?.includes("text/event-stream")) {
        sseRequests.push(req.url());
      }
    });
    await page.goto("/program");
    await expect(page.locator("#content")).toContainText("BODi", { timeout: 5000 });
    // No SSE requests for this page
    expect(sseRequests).toHaveLength(0);
  });

  test("shows BODi trainer and duration", async ({ page }) => {
    await page.goto("/program");
    const content = page.locator("#content");
    await expect(content).toContainText("Trainer", { timeout: 5000 });
    await expect(content).toContainText(/\d+ weeks/);
  });
});
```

- [ ] **Step 4: Add architectural assertion tests**

Add to `tests/e2e/today.spec.ts`:

```typescript
test.describe("Architectural assertions", () => {
  test("POST handlers return 202, not event-stream", async ({ page }) => {
    const response = await page.request.post("/api/pull");
    expect(response.status()).toBe(202);
    expect(response.headers()["content-type"]).not.toContain("text/event-stream");
  });

  test("static pages do not use SSE", async ({ page }) => {
    for (const path of ["/progress", "/program"]) {
      const response = await page.request.get(path);
      expect(response.headers()["content-type"]).toContain("text/html");
    }
  });
});
```

- [ ] **Step 5: Delete test-e2e.sh**

```bash
rm test-e2e.sh
```

- [ ] **Step 6: Run all Playwright tests**

```bash
npx playwright test
```

- [ ] **Step 7: Commit**

```bash
git add tests/e2e/ -A
git commit -m "Port E2E test scenarios to Playwright, delete curl-based test-e2e.sh"
```

---

## Task 11: Update CLAUDE.md and clean up

**Files:**
- Modify: `CLAUDE.md`
- Modify: `package.json` (add test:e2e script)

- [ ] **Step 1: Add architecture rule to CLAUDE.md**

Add to the Style & Conventions section:

```markdown
- POST/PUT/DELETE handlers return 202 on success (4xx on validation/auth failure). They never produce SSE.
- Only `GET /` with `Accept: text/event-stream` produces an SSE stream, served by the SessionActor DO.
- The Datastar SDK (`@starfederation/datastar-sdk/web`) is only imported in `src/actor/session-actor.ts`. Route handlers never import it.
- Static pages (`/progress`, `/program`, `/routine/:id`) serve full HTML — no SSE, no DO.
- Reference pattern: `~/Code/frank/sample/Frank.Datastar.Hox/Program.fs`
```

- [ ] **Step 2: Remove stale SSE conventions from CLAUDE.md**

Remove or update references to:
- `sseResponse()`, `patchElements()`, `mergeFragments()` 
- "SSE endpoints must return HTTP 200 for domain errors" (no longer applies — POST returns 4xx, errors go over SSE stream)
- `src/sse/` directory references

- [ ] **Step 3: Add test:e2e script**

In `package.json`:

```json
"scripts": {
  "test:e2e": "playwright test"
}
```

- [ ] **Step 4: Final verification**

```bash
npx vitest run           # domain unit tests
npx playwright test      # E2E browser tests
npx wrangler dev         # manual smoke test
```

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md package.json
git commit -m "Update CLAUDE.md with SSE architecture rules, add test:e2e script"
```
