# Hevy Planner V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Cloudflare Workers web app that shows today's workout, pushes routines to Hevy, pulls completions back, manages a conveyor belt queue, and displays skill/roadmap/benchmark progress.

**Architecture:** MPA with SSE-driven fragments via Datastar. Content negotiation on the same route returns HTML shell (Accept: text/html) or SSE stream (Accept: text/event-stream). Program definitions live in bundled JSON; D1 stores only runtime user state.

**Tech Stack:** Cloudflare Workers (TypeScript), Datastar, D1 (SQLite), Hevy API, Cloudflare Access

**Spec:** `docs/superpowers/specs/2026-03-21-v1-design.md`

---

## File Structure

```
src/
  index.ts                  → Worker entry point, router with content negotiation
  types.ts                  → TypeScript types for program JSON + D1 rows
  domain/
    queue.ts                → generatePlaylist(), getNextSession() — pure functions
    reflow.ts               → computeUpcoming() with spacer interpolation — pure
    hevy-sync.ts            → buildRoutinePayload(), matchCompletions() — pure
  fragments/
    layout.ts               → HTML shell, head, nav, Datastar script tag
    today.ts                → CARs card, session hero card, coming up list
    session-detail.ts       → Exercise list with notes, videos, tags
    progress.ts             → Skills cards, roadmap phases, benchmarks
    setup.ts                → First-run: API key entry, template picker
  storage/
    queries.ts              → D1 prepared statements (users, queue_items, exercise_mappings)
  hevy/
    client.ts               → Hevy API HTTP calls, rate limiting, backoff
  auth/
    access.ts               → Cloudflare Access JWT validation, user ID extraction
  sse/
    helpers.ts              → SSE event builders (patchElements, patchSignals)
programs/
  mobility-joint-restoration.json → Bundled program (conforms to schema/program.schema.json)
migrations/
  0001_initial.sql          → D1 schema: users, queue_items, skill_progress, exercise_mappings
public/
  manifest.json             → PWA web app manifest
  sw.js                     → Service worker for offline shell caching
test/
  domain/
    queue.test.ts           → Queue generation tests
    reflow.test.ts          → Reflow/spacer interpolation tests
    hevy-sync.test.ts       → Push/pull transform tests
  sse/
    helpers.test.ts         → SSE event builder tests
  storage/
    queries.test.ts         → D1 query tests (miniflare)
wrangler.toml               → Workers config, D1 binding, static assets
package.json                → Dependencies, scripts
tsconfig.json               → TypeScript config
vitest.config.ts            → Vitest config with miniflare pool
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `wrangler.toml`, `vitest.config.ts`, `src/index.ts`

- [ ] **Step 1: Initialize package.json**

```bash
cd /Users/ryanr/Code/hevy-planner
npm init -y
```

- [ ] **Step 2: Install dependencies**

```bash
npm install --save-dev wrangler typescript vitest @cloudflare/vitest-pool-workers @cloudflare/workers-types
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ESNext"],
    "types": ["@cloudflare/workers-types", "@cloudflare/vitest-pool-workers"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "paths": { "~/*": ["./src/*"] }
  },
  "include": ["src/**/*", "test/**/*"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create wrangler.toml**

```toml
name = "hevy-planner"
main = "src/index.ts"
compatibility_date = "2024-12-01"

[assets]
directory = "public"

[[d1_databases]]
binding = "DB"
database_name = "hevy-planner"
database_id = "local"

[vars]
ENVIRONMENT = "development"
```

- [ ] **Step 5: Create vitest.config.ts**

```typescript
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
      },
    },
  },
});
```

- [ ] **Step 6: Create minimal Worker entry point**

Create `src/index.ts`:

```typescript
export interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return new Response("hevy-planner is running");
  },
};
```

- [ ] **Step 7: Add scripts to package.json**

Add to `package.json` scripts:
```json
{
  "scripts": {
    "dev": "wrangler dev",
    "test": "vitest run",
    "test:watch": "vitest",
    "deploy": "wrangler deploy",
    "db:migrate": "wrangler d1 execute hevy-planner --local --file=migrations/0001_initial.sql"
  }
}
```

- [ ] **Step 8: Verify Worker starts**

```bash
npx wrangler dev --local
```

Expected: Worker starts, responds with "hevy-planner is running" at `http://localhost:8787`.

- [ ] **Step 9: Commit**

```bash
git add package.json tsconfig.json wrangler.toml vitest.config.ts src/index.ts
git commit -m "feat: initialize Workers project with TypeScript, Vitest, D1"
```

---

## Task 2: Program Types & Bundled JSON

**Files:**
- Create: `src/types.ts`, `programs/mobility-joint-restoration.json`
- Reference: `schema/program.schema.json`

- [ ] **Step 1: Define TypeScript types**

Create `src/types.ts`. These types mirror `schema/program.schema.json`:

```typescript
// Program JSON types (read-only, loaded from bundled JSON)

export interface Program {
  meta: ProgramMeta;
  sessions: Session[];
  weekTemplates: WeekTemplate[];
  progressions: Progression[];
  roadmap?: RoadmapPhase[];
  skills?: Skill[];
  benchmarks?: Benchmark[];
  foundations?: Foundation[];
  theme?: Theme;
}

export interface ProgramMeta {
  version: string;
  title: string;
  subtitle?: string;
  description?: string;
  author?: string;
  durationWeeks?: number;
  tags?: string[];
}

export interface Session {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  isDaily?: boolean;
  sortOrder?: number;
  color?: string;
  exercises: Exercise[];
}

export interface Exercise {
  id: string;
  name: string;
  sets: string;
  notes?: string;
  videoURL?: string | null;
  searchTerms?: string | null;
  tags?: string[];
  progressionByPhase?: Record<string, { sets?: string; notes?: string }>;
}

export interface WeekTemplate {
  id: string;
  name: string;
  description?: string;
  sortOrder?: number;
  days: DaySlot[];
}

export interface DaySlot {
  dayOfWeek: number; // 0=Monday, 6=Sunday
  sessionIDs?: string[];
  note?: string | null;
}

export interface Progression {
  id: string;
  weekRange: string;
  phaseName: string;
  focus?: string;
  details?: string[];
  weekStart?: number;
  weekEnd?: number;
  sortOrder?: number;
}

export interface RoadmapPhase {
  id: string;
  name: string;
  weeks?: string;
  status?: "current" | "future" | "completed";
  summary?: string;
  keyFocus?: string;
  gateTests?: string[];
  color?: string;
  sortOrder?: number;
}

export interface Skill {
  id: string;
  name: string;
  priority?: number;
  icon?: string;
  color?: string;
  currentState?: string;
  requirements?: string;
  gapAnalysis?: string;
  timeline?: string;
  milestones?: SkillMilestone[];
}

export interface SkillMilestone {
  name: string;
  description?: string;
  targetWeek?: number;
}

export interface Benchmark {
  id: string;
  name: string;
  howTo: string;
  target?: string;
  frequency?: string;
  unit?: string;
}

export interface Foundation {
  id: string;
  title: string;
  description?: string;
  steps?: FoundationStep[];
  practice?: string;
  activeDuringWeeks?: { start?: number; end?: number };
}

export interface FoundationStep {
  step?: number;
  name: string;
  instructions: string;
  videoSearch?: string;
}

export interface Theme {
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  sessionColors?: Record<string, { background?: string; accent?: string }>;
}

// D1 row types (runtime state)

export interface UserRow {
  id: string;
  hevy_api_key_encrypted: string | null;
  active_program: string;
  template_id: string;
  start_date: string;
  created_at: string;
}

export interface QueueItemRow {
  id: number;
  user_id: string;
  session_id: string;
  position: number;
  status: "pending" | "completed";
  completed_date: string | null;
  hevy_routine_id: string | null;
  hevy_workout_id: string | null;
}

export interface ExerciseMappingRow {
  user_id: string;
  program_exercise_name: string;
  hevy_exercise_id: string;
  confirmed_by_user: number;
}
```

- [ ] **Step 2: Create the bundled program JSON**

Create `programs/mobility-joint-restoration.json` conforming to `schema/program.schema.json`. Use the prototype JSON at `/Users/ryanr/OneDrive/Documents/hevy-planner/mobility-program.json` and the prototype SQLite DB as reference data, but restructure to match the schema exactly. The JSON must include all sessions, exercises, weekTemplates, progressions, roadmap, skills, and benchmarks.

This is a data-conversion task: read the prototype files, produce a conforming JSON file. Validate against `schema/program.schema.json`.

- [ ] **Step 3: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/types.ts programs/mobility-joint-restoration.json
git commit -m "feat: add program types and bundled mobility program JSON"
```

---

## Task 3: D1 Schema Migration

**Files:**
- Create: `migrations/0001_initial.sql`

- [ ] **Step 1: Write migration SQL**

Create `migrations/0001_initial.sql`:

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  hevy_api_key_encrypted TEXT,
  active_program TEXT NOT NULL,
  template_id TEXT NOT NULL,
  start_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE queue_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  session_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_date TEXT,
  hevy_routine_id TEXT,
  hevy_workout_id TEXT,
  UNIQUE(user_id, position)
);

CREATE TABLE skill_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  skill_id TEXT NOT NULL,
  milestone_index INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, skill_id)
);

CREATE TABLE exercise_mappings (
  user_id TEXT NOT NULL REFERENCES users(id),
  program_exercise_name TEXT NOT NULL,
  hevy_exercise_id TEXT NOT NULL,
  confirmed_by_user INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, program_exercise_name)
);
```

- [ ] **Step 2: Run migration locally**

```bash
npm run db:migrate
```

Expected: Tables created successfully.

- [ ] **Step 3: Verify tables exist**

```bash
npx wrangler d1 execute hevy-planner --local --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
```

Expected: `exercise_mappings`, `queue_items`, `skill_progress`, `users`

- [ ] **Step 4: Commit**

```bash
git add migrations/0001_initial.sql
git commit -m "feat: add D1 schema migration for users, queue, skills, mappings"
```

---

## Task 4: SSE Helpers

**Files:**
- Create: `src/sse/helpers.ts`, `test/sse/helpers.test.ts`

- [ ] **Step 1: Write failing tests**

Create `test/sse/helpers.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { patchElements, sseResponse, mergeFragments } from "~/sse/helpers";

describe("patchElements", () => {
  it("formats a single fragment as SSE data lines", () => {
    const result = patchElements('<div id="hero">Hello</div>');
    expect(result).toBe(
      "event: datastar-patch-elements\ndata: elements <div id=\"hero\">Hello</div>\n\n"
    );
  });

  it("supports custom selector", () => {
    const result = patchElements("<span>Hi</span>", { selector: "#target" });
    expect(result).toContain("data: selector #target");
  });

  it("supports merge mode", () => {
    const result = patchElements("<li>Item</li>", { mode: "append" });
    expect(result).toContain("data: mode append");
  });
});

describe("mergeFragments", () => {
  it("concatenates multiple SSE events", () => {
    const result = mergeFragments([
      patchElements('<div id="a">A</div>'),
      patchElements('<div id="b">B</div>'),
    ]);
    expect(result).toContain("A</div>");
    expect(result).toContain("B</div>");
    expect(result.split("event: datastar-patch-elements").length - 1).toBe(2);
  });
});

describe("sseResponse", () => {
  it("returns a Response with correct content-type and cache headers", () => {
    const res = sseResponse("event: test\ndata: hi\n\n");
    expect(res.headers.get("content-type")).toBe("text/event-stream");
    expect(res.headers.get("cache-control")).toBe("no-cache");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run test/sse/helpers.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Implement SSE helpers**

Create `src/sse/helpers.ts`:

```typescript
export interface PatchOptions {
  selector?: string;
  mode?: "outer" | "inner" | "append" | "prepend" | "before" | "after" | "remove";
  useViewTransition?: boolean;
}

export function patchElements(html: string, opts?: PatchOptions): string {
  let lines = `event: datastar-patch-elements\n`;
  if (opts?.selector) lines += `data: selector ${opts.selector}\n`;
  if (opts?.mode) lines += `data: mode ${opts.mode}\n`;
  if (opts?.useViewTransition) lines += `data: useViewTransition true\n`;
  lines += `data: elements ${html}\n\n`;
  return lines;
}

export function patchSignals(signals: Record<string, unknown>): string {
  return `event: datastar-patch-signals\ndata: signals ${JSON.stringify(signals)}\n\n`;
}

export function mergeFragments(fragments: string[]): string {
  return fragments.join("");
}

export function sseResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      "connection": "keep-alive",
    },
  });
}

export function isSSERequest(request: Request): boolean {
  const accept = request.headers.get("accept") || "";
  return accept.includes("text/event-stream");
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run test/sse/helpers.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sse/helpers.ts test/sse/helpers.test.ts
git commit -m "feat: add Datastar SSE event helpers with tests"
```

---

## Task 5: Auth Module

**Files:**
- Create: `src/auth/access.ts`

- [ ] **Step 1: Implement Cloudflare Access JWT extraction**

Create `src/auth/access.ts`:

```typescript
export interface AuthResult {
  userId: string;
  email: string;
}

export function getAuthenticatedUser(request: Request): AuthResult | null {
  // Cloudflare Access sets this header with the JWT
  const jwt = request.headers.get("cf-access-jwt-assertion");
  if (!jwt) return null;

  try {
    // Decode the JWT payload (Cloudflare Access has already validated it at the edge)
    const parts = jwt.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    const email = payload.email;
    if (!email) return null;
    return { userId: email, email };
  } catch {
    return null;
  }
}

export function requireAuth(request: Request): AuthResult {
  const user = getAuthenticatedUser(request);
  if (!user) {
    throw new Response("Unauthorized", { status: 403 });
  }
  return user;
}
```

Note: In local dev without Cloudflare Access, we'll need a dev bypass. Add to `src/auth/access.ts`:

```typescript
export function getAuthenticatedUserOrDev(
  request: Request,
  env: { ENVIRONMENT: string }
): AuthResult {
  const user = getAuthenticatedUser(request);
  if (user) return user;
  if (env.ENVIRONMENT === "development") {
    return { userId: "dev@local", email: "dev@local" };
  }
  throw new Response("Unauthorized", { status: 403 });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/auth/access.ts
git commit -m "feat: add Cloudflare Access auth with dev bypass"
```

---

## Task 6: Queue Engine (Domain)

**Files:**
- Create: `src/domain/queue.ts`, `test/domain/queue.test.ts`

- [ ] **Step 1: Write failing tests**

Create `test/domain/queue.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { generatePlaylist, getNextSession } from "~/domain/queue";
import type { WeekTemplate, Session, QueueItemRow } from "~/types";

const sessions: Session[] = [
  { id: "daily", title: "CARs", isDaily: true, exercises: [] },
  { id: "a", title: "Session A", exercises: [] },
  { id: "b", title: "Session B", exercises: [] },
  { id: "c", title: "Session C", exercises: [] },
  { id: "recovery", title: "Recovery", exercises: [] },
];

const template: WeekTemplate = {
  id: "5day",
  name: "5-Day",
  days: [
    { dayOfWeek: 0, sessionIDs: ["daily", "a"] },
    { dayOfWeek: 1, sessionIDs: ["daily", "b"] },
    { dayOfWeek: 2, sessionIDs: ["daily"] },          // CARs-only spacer
    { dayOfWeek: 3, sessionIDs: ["daily", "c"] },
    { dayOfWeek: 4, sessionIDs: ["daily", "recovery"] },
    { dayOfWeek: 5, sessionIDs: [] },                  // rest
    { dayOfWeek: 6, sessionIDs: [] },                  // rest
  ],
};

describe("generatePlaylist", () => {
  it("extracts main sessions in order, skipping daily-only and rest days", () => {
    const playlist = generatePlaylist(template, sessions, 1);
    const ids = playlist.map((item) => item.session_id);
    expect(ids).toEqual(["a", "b", "c", "recovery"]);
  });

  it("repeats for multiple weeks", () => {
    const playlist = generatePlaylist(template, sessions, 2);
    expect(playlist).toHaveLength(8);
    expect(playlist[4].session_id).toBe("a");
    expect(playlist[4].position).toBe(4);
  });

  it("assigns sequential positions starting at 0", () => {
    const playlist = generatePlaylist(template, sessions, 1);
    expect(playlist.map((p) => p.position)).toEqual([0, 1, 2, 3]);
  });
});

describe("getNextSession", () => {
  it("returns the first pending item", () => {
    const items: QueueItemRow[] = [
      { id: 1, user_id: "u", session_id: "a", position: 0, status: "completed", completed_date: "2026-03-20", hevy_routine_id: null, hevy_workout_id: null },
      { id: 2, user_id: "u", session_id: "b", position: 1, status: "pending", completed_date: null, hevy_routine_id: null, hevy_workout_id: null },
      { id: 3, user_id: "u", session_id: "c", position: 2, status: "pending", completed_date: null, hevy_routine_id: null, hevy_workout_id: null },
    ];
    const next = getNextSession(items);
    expect(next?.session_id).toBe("b");
  });

  it("returns null when all items are completed", () => {
    const items: QueueItemRow[] = [
      { id: 1, user_id: "u", session_id: "a", position: 0, status: "completed", completed_date: "2026-03-20", hevy_routine_id: null, hevy_workout_id: null },
    ];
    expect(getNextSession(items)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run test/domain/queue.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement queue domain**

Create `src/domain/queue.ts`:

```typescript
import type { WeekTemplate, Session, QueueItemRow } from "~/types";

interface PlaylistItem {
  session_id: string;
  position: number;
}

export function generatePlaylist(
  template: WeekTemplate,
  sessions: Session[],
  weeks: number
): PlaylistItem[] {
  const sessionMap = new Map(sessions.map((s) => [s.id, s]));
  const mainSessionOrder: string[] = [];

  // Walk through the week template, extract non-daily session IDs in order
  for (const day of template.days) {
    if (!day.sessionIDs) continue;
    for (const sid of day.sessionIDs) {
      const session = sessionMap.get(sid);
      if (session && !session.isDaily) {
        mainSessionOrder.push(sid);
      }
    }
  }

  // Repeat for the requested number of weeks
  const playlist: PlaylistItem[] = [];
  for (let week = 0; week < weeks; week++) {
    for (const sid of mainSessionOrder) {
      playlist.push({
        session_id: sid,
        position: playlist.length,
      });
    }
  }

  return playlist;
}

export function getNextSession(items: QueueItemRow[]): QueueItemRow | null {
  const sorted = [...items].sort((a, b) => a.position - b.position);
  return sorted.find((item) => item.status === "pending") ?? null;
}

export function getCompletedSessions(items: QueueItemRow[], today: string): QueueItemRow[] {
  return items
    .filter((item) => item.status === "completed" && item.completed_date === today)
    .sort((a, b) => a.position - b.position);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run test/domain/queue.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/queue.ts test/domain/queue.test.ts
git commit -m "feat: add queue engine with playlist generation and next-session logic"
```

---

## Task 7: Reflow & Upcoming Display (Domain)

**Files:**
- Create: `src/domain/reflow.ts`, `test/domain/reflow.test.ts`

- [ ] **Step 1: Write failing tests**

Create `test/domain/reflow.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { computeUpcoming } from "~/domain/reflow";
import type { QueueItemRow, WeekTemplate, Session } from "~/types";

const sessions: Session[] = [
  { id: "daily", title: "CARs", isDaily: true, exercises: [] },
  { id: "a", title: "Session A", exercises: [] },
  { id: "b", title: "Session B", exercises: [] },
  { id: "c", title: "Session C", exercises: [] },
  { id: "recovery", title: "Recovery", exercises: [] },
];

const template: WeekTemplate = {
  id: "5day",
  name: "5-Day",
  days: [
    { dayOfWeek: 0, sessionIDs: ["daily", "a"] },
    { dayOfWeek: 1, sessionIDs: ["daily", "b"] },
    { dayOfWeek: 2, sessionIDs: ["daily"] },          // spacer
    { dayOfWeek: 3, sessionIDs: ["daily", "c"] },
    { dayOfWeek: 4, sessionIDs: ["daily", "recovery"] },
    { dayOfWeek: 5, sessionIDs: [] },
    { dayOfWeek: 6, sessionIDs: [] },
  ],
};

describe("computeUpcoming", () => {
  it("interleaves spacer days between main sessions based on template rhythm", () => {
    const pending: QueueItemRow[] = [
      { id: 2, user_id: "u", session_id: "b", position: 1, status: "pending", completed_date: null, hevy_routine_id: null, hevy_workout_id: null },
      { id: 3, user_id: "u", session_id: "c", position: 2, status: "pending", completed_date: null, hevy_routine_id: null, hevy_workout_id: null },
      { id: 4, user_id: "u", session_id: "recovery", position: 3, status: "pending", completed_date: null, hevy_routine_id: null, hevy_workout_id: null },
    ];

    const upcoming = computeUpcoming(pending, template, sessions, 5);
    // After b (index 1 in template), there's a spacer (index 2), then c (index 3)
    const types = upcoming.map((u) => u.type);
    expect(types[0]).toBe("session");   // b
    expect(types[1]).toBe("spacer");    // CARs-only
    expect(types[2]).toBe("session");   // c
  });

  it("limits to requested count of main sessions", () => {
    const pending: QueueItemRow[] = Array.from({ length: 10 }, (_, i) => ({
      id: i, user_id: "u", session_id: "a", position: i,
      status: "pending" as const, completed_date: null,
      hevy_routine_id: null, hevy_workout_id: null,
    }));
    const upcoming = computeUpcoming(pending, template, sessions, 3);
    const sessionCount = upcoming.filter((u) => u.type === "session").length;
    expect(sessionCount).toBe(3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run test/domain/reflow.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement reflow/upcoming domain**

Create `src/domain/reflow.ts`:

```typescript
import type { QueueItemRow, WeekTemplate, Session } from "~/types";

/**
 * Evaluate reflow on page load. The queue is a conveyor belt —
 * main sessions never drop. This function is pure: it returns
 * the updated statuses without touching D1.
 *
 * Reflow rules (from spec):
 * 1. Missed main session, next day CARs-only → absorb spacer, session slides
 * 2. Missed main session, next day has session → conveyor belt shift
 * 3. Missed CARs-only day, next has session → drop spacer, session moves up
 *
 * Since the queue only contains main sessions (CARs are ambient),
 * the conveyor belt is automatic: the first pending item IS the next
 * session, regardless of how many days passed. No items need moving.
 * The "reflow" is inherent in the playlist model.
 */
export function evaluateReflow(
  _items: QueueItemRow[],
  _today: string
): void {
  // The conveyor belt model means reflow is a no-op on the queue itself.
  // The first pending item is always "today's session" regardless of
  // how many days were missed. Spacer interpolation happens at display
  // time in computeUpcoming(). No queue mutations needed.
}

export interface UpcomingItem {
  type: "session" | "spacer";
  sessionId?: string;
  title: string;
  exerciseCount?: number;
  color?: string;
}

export function computeUpcoming(
  pendingItems: QueueItemRow[],
  template: WeekTemplate,
  sessions: Session[],
  maxSessions: number
): UpcomingItem[] {
  const sessionMap = new Map(sessions.map((s) => [s.id, s]));

  // Build the template rhythm: which day indices are spacers vs sessions
  const templateRhythm: Array<{ type: "session" | "spacer"; sessionId?: string }> = [];
  for (const day of template.days) {
    const mainIds = (day.sessionIDs ?? []).filter((sid) => {
      const s = sessionMap.get(sid);
      return s && !s.isDaily;
    });
    if (mainIds.length === 0 && (day.sessionIDs ?? []).length > 0) {
      // Has sessions but all are daily → spacer day
      templateRhythm.push({ type: "spacer" });
    } else if (mainIds.length > 0) {
      for (const sid of mainIds) {
        templateRhythm.push({ type: "session", sessionId: sid });
      }
    }
    // Empty sessionIDs (rest days) are skipped — they don't appear in "coming up"
  }

  // Walk the pending items, interleave spacers from the template rhythm
  const result: UpcomingItem[] = [];
  let rhythmIndex = 0;
  let sessionCount = 0;

  // Find where in the rhythm the first pending item falls
  const firstPending = pendingItems[0];
  if (firstPending) {
    // Find this session's position in the rhythm cycle
    for (let i = 0; i < templateRhythm.length; i++) {
      if (templateRhythm[i].sessionId === firstPending.session_id) {
        rhythmIndex = i;
        break;
      }
    }
  }

  let pendingIdx = 0;
  while (sessionCount < maxSessions && pendingIdx < pendingItems.length) {
    const rhythmSlot = templateRhythm[rhythmIndex % templateRhythm.length];

    if (rhythmSlot.type === "spacer") {
      result.push({ type: "spacer", title: "CARs only" });
    } else {
      const item = pendingItems[pendingIdx];
      const session = sessionMap.get(item.session_id);
      result.push({
        type: "session",
        sessionId: item.session_id,
        title: session?.title ?? item.session_id,
        exerciseCount: session?.exercises.length,
        color: session?.color,
      });
      pendingIdx++;
      sessionCount++;
    }

    rhythmIndex++;
  }

  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run test/domain/reflow.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/reflow.ts test/domain/reflow.test.ts
git commit -m "feat: add reflow engine with spacer interpolation for upcoming display"
```

---

## Task 8: D1 Storage Queries

**Files:**
- Create: `src/storage/queries.ts`, `test/storage/queries.test.ts`

- [ ] **Step 1: Write failing tests**

Create `test/storage/queries.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import {
  getUser,
  upsertUser,
  getQueueItems,
  insertQueueItems,
  markQueueItemCompleted,
  getExerciseMappings,
  upsertExerciseMapping,
  updateQueueItemHevyRoutineId,
} from "~/storage/queries";

describe("storage queries", () => {
  beforeEach(async () => {
    // Run migration
    await env.DB.exec(`
      CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, hevy_api_key_encrypted TEXT, active_program TEXT NOT NULL, template_id TEXT NOT NULL, start_date TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS queue_items (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, session_id TEXT NOT NULL, position INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', completed_date TEXT, hevy_routine_id TEXT, hevy_workout_id TEXT, UNIQUE(user_id, position));
      CREATE TABLE IF NOT EXISTS exercise_mappings (user_id TEXT NOT NULL, program_exercise_name TEXT NOT NULL, hevy_exercise_id TEXT NOT NULL, confirmed_by_user INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, program_exercise_name));
    `);
  });

  it("upserts and retrieves a user", async () => {
    await upsertUser(env.DB, {
      id: "test@example.com",
      active_program: "mobility",
      template_id: "5day",
      start_date: "2026-03-21",
    });
    const user = await getUser(env.DB, "test@example.com");
    expect(user?.active_program).toBe("mobility");
  });

  it("inserts and retrieves queue items", async () => {
    await upsertUser(env.DB, { id: "u", active_program: "m", template_id: "t", start_date: "2026-03-21" });
    await insertQueueItems(env.DB, "u", [
      { session_id: "a", position: 0 },
      { session_id: "b", position: 1 },
    ]);
    const items = await getQueueItems(env.DB, "u");
    expect(items).toHaveLength(2);
    expect(items[0].session_id).toBe("a");
  });

  it("marks a queue item completed", async () => {
    await upsertUser(env.DB, { id: "u", active_program: "m", template_id: "t", start_date: "2026-03-21" });
    await insertQueueItems(env.DB, "u", [{ session_id: "a", position: 0 }]);
    const items = await getQueueItems(env.DB, "u");
    await markQueueItemCompleted(env.DB, items[0].id, "2026-03-21", "workout-123");
    const updated = await getQueueItems(env.DB, "u");
    expect(updated[0].status).toBe("completed");
    expect(updated[0].hevy_workout_id).toBe("workout-123");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run test/storage/queries.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement storage queries**

Create `src/storage/queries.ts`:

```typescript
import type { UserRow, QueueItemRow, ExerciseMappingRow } from "~/types";

// Users

export async function getUser(db: D1Database, userId: string): Promise<UserRow | null> {
  return db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first<UserRow>();
}

export async function upsertUser(
  db: D1Database,
  user: { id: string; active_program: string; template_id: string; start_date: string; hevy_api_key_encrypted?: string }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO users (id, active_program, template_id, start_date, hevy_api_key_encrypted)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         active_program = excluded.active_program,
         template_id = excluded.template_id,
         start_date = excluded.start_date,
         hevy_api_key_encrypted = COALESCE(excluded.hevy_api_key_encrypted, users.hevy_api_key_encrypted)`
    )
    .bind(user.id, user.active_program, user.template_id, user.start_date, user.hevy_api_key_encrypted ?? null)
    .run();
}

// Queue Items

export async function getQueueItems(db: D1Database, userId: string): Promise<QueueItemRow[]> {
  const result = await db
    .prepare("SELECT * FROM queue_items WHERE user_id = ? ORDER BY position")
    .bind(userId)
    .all<QueueItemRow>();
  return result.results;
}

export async function insertQueueItems(
  db: D1Database,
  userId: string,
  items: Array<{ session_id: string; position: number }>
): Promise<void> {
  const stmt = db.prepare(
    "INSERT INTO queue_items (user_id, session_id, position) VALUES (?, ?, ?)"
  );
  const batch = items.map((item) => stmt.bind(userId, item.session_id, item.position));
  await db.batch(batch);
}

export async function markQueueItemCompleted(
  db: D1Database,
  itemId: number,
  completedDate: string,
  hevyWorkoutId?: string
): Promise<void> {
  await db
    .prepare(
      "UPDATE queue_items SET status = 'completed', completed_date = ?, hevy_workout_id = ? WHERE id = ?"
    )
    .bind(completedDate, hevyWorkoutId ?? null, itemId)
    .run();
}

export async function updateQueueItemHevyRoutineId(
  db: D1Database,
  itemId: number,
  routineId: string
): Promise<void> {
  await db
    .prepare("UPDATE queue_items SET hevy_routine_id = ? WHERE id = ?")
    .bind(routineId, itemId)
    .run();
}

// Exercise Mappings

export async function getExerciseMappings(
  db: D1Database,
  userId: string
): Promise<ExerciseMappingRow[]> {
  const result = await db
    .prepare("SELECT * FROM exercise_mappings WHERE user_id = ?")
    .bind(userId)
    .all<ExerciseMappingRow>();
  return result.results;
}

export async function upsertExerciseMapping(
  db: D1Database,
  mapping: ExerciseMappingRow
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO exercise_mappings (user_id, program_exercise_name, hevy_exercise_id, confirmed_by_user)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, program_exercise_name) DO UPDATE SET
         hevy_exercise_id = excluded.hevy_exercise_id,
         confirmed_by_user = excluded.confirmed_by_user`
    )
    .bind(mapping.user_id, mapping.program_exercise_name, mapping.hevy_exercise_id, mapping.confirmed_by_user)
    .run();
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run test/storage/queries.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/storage/queries.ts test/storage/queries.test.ts
git commit -m "feat: add D1 storage queries with prepared statements"
```

---

## Task 9: Hevy API Client

**Files:**
- Create: `src/hevy/client.ts`

- [ ] **Step 1: Implement Hevy API client**

Create `src/hevy/client.ts`:

```typescript
export interface HevyExerciseTemplate {
  id: string;
  title: string;
  type: string;
  primary_muscle_group: string;
}

export interface HevyRoutine {
  id: string;
  title: string;
  exercises: HevyRoutineExercise[];
}

export interface HevyRoutineExercise {
  exercise_template_id: string;
  sets: HevySet[];
  notes?: string;
}

export interface HevySet {
  type: "normal" | "warmup" | "dropset" | "failure";
  weight_kg?: number;
  reps?: number;
  duration_seconds?: number;
}

export interface HevyWorkout {
  id: string;
  short_id: string;
  name: string;
  start_time: string;
  end_time: string;
  exercises: Array<{
    exercise_template_id: string;
    title: string;
    sets: HevySet[];
  }>;
}

export interface HevyPaginatedResponse<T> {
  page: number;
  page_count: number;
  [key: string]: unknown;
}

export class HevyClient {
  private baseUrl = "https://api.hevyapp.com/v1";
  private apiKey: string;
  private lastFetchTime = 0;
  private minFetchIntervalMs = 60_000;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...init,
      headers: {
        "api-key": this.apiKey,
        "accept": "application/json",
        "content-type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

    if (res.status === 429) {
      // Rate limited — caller should handle backoff
      throw new Error("RATE_LIMITED");
    }

    if (!res.ok) {
      throw new Error(`Hevy API error: ${res.status} ${res.statusText}`);
    }

    return res.json() as Promise<T>;
  }

  async getExerciseTemplates(page = 1, pageSize = 10): Promise<HevyExerciseTemplate[]> {
    const data = await this.request<{ page: number; page_count: number; exercise_templates: HevyExerciseTemplate[] }>(
      `/exercise_templates?page=${page}&pageSize=${pageSize}`
    );
    return data.exercise_templates;
  }

  async getAllExerciseTemplates(): Promise<HevyExerciseTemplate[]> {
    const all: HevyExerciseTemplate[] = [];
    let page = 1;
    while (true) {
      const data = await this.request<{ page: number; page_count: number; exercise_templates: HevyExerciseTemplate[] }>(
        `/exercise_templates?page=${page}&pageSize=10`
      );
      all.push(...data.exercise_templates);
      if (page >= data.page_count) break;
      page++;
    }
    return all;
  }

  async createRoutine(routine: { title: string; exercises: HevyRoutineExercise[] }): Promise<HevyRoutine> {
    const data = await this.request<{ routine: HevyRoutine }>("/routines", {
      method: "POST",
      body: JSON.stringify({ routine }),
    });
    return data.routine;
  }

  async updateRoutine(routineId: string, routine: { title: string; exercises: HevyRoutineExercise[] }): Promise<HevyRoutine> {
    const data = await this.request<{ routine: HevyRoutine }>(`/routines/${routineId}`, {
      method: "PUT",
      body: JSON.stringify({ routine }),
    });
    return data.routine;
  }

  async getRecentWorkouts(page = 1, pageSize = 5): Promise<HevyWorkout[]> {
    const now = Date.now();
    if (now - this.lastFetchTime < this.minFetchIntervalMs) {
      return []; // Rate-limited locally
    }
    this.lastFetchTime = now;

    const data = await this.request<{ page: number; page_count: number; workouts: HevyWorkout[] }>(
      `/workouts?page=${page}&pageSize=${pageSize}`
    );
    return data.workouts;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hevy/client.ts
git commit -m "feat: add Hevy API client with rate limiting"
```

---

## Task 10: Hevy Sync Domain

**Files:**
- Create: `src/domain/hevy-sync.ts`, `test/domain/hevy-sync.test.ts`

- [ ] **Step 1: Write failing tests**

Create `test/domain/hevy-sync.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildRoutinePayload, matchCompletions, autoMatchExercises } from "~/domain/hevy-sync";
import type { Session, ExerciseMappingRow, QueueItemRow } from "~/types";

describe("buildRoutinePayload", () => {
  it("maps session exercises to Hevy exercise IDs", () => {
    const session: Session = {
      id: "a",
      title: "Session A",
      exercises: [
        { id: "e1", name: "Dead Hangs", sets: "3×30 sec" },
        { id: "e2", name: "Scapular Push-ups", sets: "3×10" },
      ],
    };
    const mappings: ExerciseMappingRow[] = [
      { user_id: "u", program_exercise_name: "Dead Hangs", hevy_exercise_id: "hevy-1", confirmed_by_user: 1 },
      { user_id: "u", program_exercise_name: "Scapular Push-ups", hevy_exercise_id: "hevy-2", confirmed_by_user: 1 },
    ];
    const result = buildRoutinePayload(session, mappings);
    expect(result.title).toBe("Session A");
    expect(result.exercises).toHaveLength(2);
    expect(result.exercises[0].exercise_template_id).toBe("hevy-1");
  });

  it("reports unmapped exercises", () => {
    const session: Session = {
      id: "a",
      title: "Session A",
      exercises: [
        { id: "e1", name: "Dead Hangs", sets: "3×30 sec" },
        { id: "e2", name: "Unknown Exercise", sets: "3×10" },
      ],
    };
    const mappings: ExerciseMappingRow[] = [
      { user_id: "u", program_exercise_name: "Dead Hangs", hevy_exercise_id: "hevy-1", confirmed_by_user: 1 },
    ];
    const result = buildRoutinePayload(session, mappings);
    expect(result.unmapped).toEqual(["Unknown Exercise"]);
  });
});

describe("matchCompletions", () => {
  it("matches workouts to queue items by routine ID", () => {
    const items: QueueItemRow[] = [
      { id: 1, user_id: "u", session_id: "a", position: 0, status: "pending", completed_date: null, hevy_routine_id: "r-1", hevy_workout_id: null },
      { id: 2, user_id: "u", session_id: "b", position: 1, status: "pending", completed_date: null, hevy_routine_id: "r-2", hevy_workout_id: null },
    ];
    const workouts = [
      { id: "w-1", short_id: "s1", name: "Session A", start_time: "2026-03-21T08:00:00Z", end_time: "2026-03-21T08:30:00Z", exercises: [] },
    ];
    // Simulate: workout was created from routine r-1
    const matches = matchCompletions(items, workouts, (w) => "r-1");
    expect(matches).toHaveLength(1);
    expect(matches[0].queueItemId).toBe(1);
    expect(matches[0].workoutId).toBe("w-1");
  });
});

describe("autoMatchExercises", () => {
  it("matches by normalized name", () => {
    const programNames = ["Dead Hangs", "Scapular Push-ups"];
    const hevyTemplates = [
      { id: "h1", title: "Dead Hang", type: "duration", primary_muscle_group: "lats" },
      { id: "h2", title: "Scapular Push Up", type: "reps", primary_muscle_group: "chest" },
    ];
    const matches = autoMatchExercises(programNames, hevyTemplates);
    expect(matches.get("Dead Hangs")).toBe("h1");
    expect(matches.get("Scapular Push-ups")).toBe("h2");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run test/domain/hevy-sync.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement hevy-sync domain**

Create `src/domain/hevy-sync.ts`:

```typescript
import type { Session, ExerciseMappingRow, QueueItemRow } from "~/types";
import type { HevyRoutineExercise, HevyWorkout, HevyExerciseTemplate, HevySet } from "~/hevy/client";

interface RoutinePayload {
  title: string;
  exercises: HevyRoutineExercise[];
  unmapped: string[];
}

export function buildRoutinePayload(
  session: Session,
  mappings: ExerciseMappingRow[]
): RoutinePayload {
  const mappingMap = new Map(mappings.map((m) => [m.program_exercise_name, m.hevy_exercise_id]));
  const exercises: HevyRoutineExercise[] = [];
  const unmapped: string[] = [];

  for (const ex of session.exercises) {
    const hevyId = mappingMap.get(ex.name);
    if (!hevyId) {
      unmapped.push(ex.name);
      continue;
    }
    // Parse sets string into Hevy set objects
    const sets = parseSetsToHevy(ex.sets);
    exercises.push({
      exercise_template_id: hevyId,
      sets,
      notes: ex.notes ?? undefined,
    });
  }

  return { title: session.title, exercises, unmapped };
}

function parseSetsToHevy(setsStr: string): HevySet[] {
  // Parse patterns like "3×8", "3×30 sec", "2×45 sec", "3×8 each side"
  const match = setsStr.match(/(\d+)[×x](\d+)/);
  if (!match) {
    return [{ type: "normal", reps: 1 }];
  }

  const setCount = parseInt(match[1]);
  const repOrDuration = parseInt(match[2]);
  const isDuration = /sec|min/i.test(setsStr);

  return Array.from({ length: setCount }, () => ({
    type: "normal" as const,
    ...(isDuration ? { duration_seconds: repOrDuration } : { reps: repOrDuration }),
  }));
}

interface CompletionMatch {
  queueItemId: number;
  workoutId: string;
}

export function matchCompletions(
  items: QueueItemRow[],
  workouts: HevyWorkout[],
  getRoutineIdForWorkout: (workout: HevyWorkout) => string | null
): CompletionMatch[] {
  const matches: CompletionMatch[] = [];
  const routineToItem = new Map<string, QueueItemRow>();

  for (const item of items) {
    if (item.status === "pending" && item.hevy_routine_id) {
      routineToItem.set(item.hevy_routine_id, item);
    }
  }

  for (const workout of workouts) {
    const routineId = getRoutineIdForWorkout(workout);
    if (!routineId) continue;
    const item = routineToItem.get(routineId);
    if (item) {
      matches.push({ queueItemId: item.id, workoutId: workout.id });
    }
  }

  return matches;
}

export function autoMatchExercises(
  programNames: string[],
  hevyTemplates: HevyExerciseTemplate[]
): Map<string, string> {
  const matches = new Map<string, string>();

  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/s$/, "");

  const hevyByNorm = new Map<string, HevyExerciseTemplate>();
  for (const t of hevyTemplates) {
    hevyByNorm.set(normalize(t.title), t);
  }

  for (const name of programNames) {
    const norm = normalize(name);
    const match = hevyByNorm.get(norm);
    if (match) {
      matches.set(name, match.id);
    } else {
      // Try partial match — check if normalized name is contained
      for (const [hevyNorm, template] of hevyByNorm) {
        if (hevyNorm.includes(norm) || norm.includes(hevyNorm)) {
          matches.set(name, template.id);
          break;
        }
      }
    }
  }

  return matches;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run test/domain/hevy-sync.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/hevy-sync.ts test/domain/hevy-sync.test.ts
git commit -m "feat: add Hevy sync domain with routine building and completion matching"
```

---

## Task 11: HTML Layout & Today Page Fragments

**Files:**
- Create: `src/fragments/layout.ts`, `src/fragments/today.ts`
- Reference: Design mockups in `.superpowers/brainstorm/` for visual specs

- [ ] **Step 1: Implement layout shell**

Create `src/fragments/layout.ts`:

```typescript
import type { Program } from "~/types";

export function htmlShell(opts: {
  title: string;
  subtitle: string;
  activeTab: "today" | "progress";
  bodyContent?: string;
  sseEndpoint: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${opts.title} — Hevy Planner</title>
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#0D0D0F">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<style>${cssTheme()}</style>
<script type="module" src="https://cdn.jsdelivr.net/npm/@starfederation/datastar@1.0.0-rc.8/bundles/datastar.js"></script>
</head>
<body data-on:load="@get('${opts.sseEndpoint}')">
  <div class="page-header">
    <div class="page-title">${opts.title}</div>
    <div class="page-subtitle">${opts.subtitle}</div>
  </div>
  <div id="content">${opts.bodyContent ?? ""}</div>
  ${tabBar(opts.activeTab)}
</body>
</html>`;
}

function tabBar(active: "today" | "progress"): string {
  return `<div class="tab-bar">
  <a href="/" class="tab ${active === "today" ? "active" : ""}">
    <div class="tab-icon">◉</div>
    <div class="tab-label">Today</div>
  </a>
  <a href="/progress" class="tab ${active === "progress" ? "active" : ""}">
    <div class="tab-icon">◇</div>
    <div class="tab-label">Progress</div>
  </a>
</div>`;
}

function cssTheme(): string {
  return `
* { margin:0; padding:0; box-sizing:border-box; }
body { background:#0D0D0F; color:#FFF; font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',system-ui,sans-serif; max-width:430px; margin:0 auto; min-height:100vh; display:flex; flex-direction:column; }
a { color:inherit; text-decoration:none; }
.page-header { padding:16px 16px 4px; }
.page-title { font-size:28px; font-weight:700; letter-spacing:-0.3px; }
.page-subtitle { font-size:13px; color:#8E8E93; margin-top:2px; }
.card { background:#1C1C1E; border-radius:12px; margin:0 16px 12px; }
.card-inner { padding:16px; }
.section-label { font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; color:#8E8E93; padding:20px 16px 8px; }
.btn-primary { background:#377DFF; color:#FFF; border:none; border-radius:10px; padding:10px 20px; font-size:15px; font-weight:600; cursor:pointer; }
.btn-secondary { background:#2C2C2E; color:#FFF; border:none; border-radius:10px; padding:10px 20px; font-size:15px; font-weight:500; cursor:pointer; }
.btn-row { display:flex; gap:8px; margin-top:14px; }
.tab-bar { margin-top:auto; display:flex; border-top:1px solid rgba(255,255,255,0.08); background:#1C1C1E; padding:8px 0 28px; position:sticky; bottom:0; }
.tab { flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; padding-top:6px; }
.tab-icon { font-size:20px; line-height:1; color:#8E8E93; }
.tab-label { font-size:10px; font-weight:500; color:#8E8E93; }
.tab.active .tab-label, .tab.active .tab-icon { color:#377DFF; }
`;
}
```

- [ ] **Step 2: Implement Today page fragments**

Create `src/fragments/today.ts`:

```typescript
import type { Session, Program, QueueItemRow } from "~/types";
import type { UpcomingItem } from "~/domain/reflow";

export function carsCard(session: Session): string {
  return `<div id="cars-card" class="card">
  <div class="card-inner">
    <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#30D158;margin-bottom:6px;">Every Day</div>
    <div style="font-size:17px;font-weight:600;">${session.title}</div>
    <div style="font-size:13px;color:#8E8E93;margin-top:4px;">${session.subtitle ?? `${session.exercises.length} exercises`}</div>
    <div class="btn-row">
      <button class="btn-primary" style="background:#30D158;flex:none;" data-on:click="@post('/push/${session.id}')">Push to Hevy</button>
      <a href="/session/${session.id}" class="btn-secondary">Details</a>
    </div>
  </div>
</div>`;
}

export function heroSessionCard(session: Session, queueItem: QueueItemRow): string {
  const desc = session.description
    ? `<div style="font-size:14px;color:#AEAEB2;margin-top:10px;line-height:1.45;">${truncate(session.description, 150)}</div>`
    : "";
  return `<div id="hero-card" class="card">
  <div class="card-inner">
    <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#377DFF;margin-bottom:6px;">Next Session</div>
    <div style="font-size:18px;font-weight:600;">${session.title}</div>
    <div style="font-size:13px;color:#8E8E93;margin-top:4px;">${session.subtitle ?? `${session.exercises.length} exercises`}</div>
    ${desc}
    <div class="btn-row">
      <button class="btn-primary" data-on:click="@post('/push/${session.id}')">Push to Hevy</button>
      <a href="/session/${session.id}" class="btn-secondary">Details</a>
    </div>
  </div>
</div>`;
}

export function completedSection(completed: Array<{ session: Session }>): string {
  if (completed.length === 0) return "";
  const rows = completed
    .map(
      (c) =>
        `<div style="display:flex;align-items:center;padding:14px 16px;opacity:0.5;">
      <div style="width:10px;height:10px;border-radius:50%;background:#30D158;margin-right:14px;flex-shrink:0;"></div>
      <div style="font-size:15px;font-weight:500;flex:1;text-decoration:line-through;">${c.session.title}</div>
      <div style="color:#30D158;font-size:15px;font-weight:600;">✓</div>
    </div>`
    )
    .join("");
  return `<div id="completed-section">
  <div class="section-label">Earlier Today</div>
  <div class="card" style="margin:0 16px 12px;">${rows}</div>
</div>`;
}

export function upcomingSection(items: UpcomingItem[]): string {
  const rows = items
    .map((item) => {
      if (item.type === "spacer") {
        return `<div style="display:flex;align-items:center;padding:14px 16px;border-top:1px solid rgba(255,255,255,0.06);">
        <div style="width:10px;height:10px;border-radius:50%;background:#636366;margin-right:14px;flex-shrink:0;"></div>
        <div style="font-size:15px;font-weight:400;flex:1;color:#636366;">CARs only</div>
        <div style="font-size:13px;color:#8E8E93;">rest</div>
      </div>`;
      }
      return `<div style="display:flex;align-items:center;padding:14px 16px;border-top:1px solid rgba(255,255,255,0.06);">
      <div style="width:10px;height:10px;border-radius:50%;background:${item.color ?? "#377DFF"};margin-right:14px;flex-shrink:0;"></div>
      <div style="font-size:15px;font-weight:500;flex:1;">${item.title}</div>
      <div style="font-size:13px;color:#8E8E93;">${item.exerciseCount ?? ""} exercises</div>
    </div>`;
    })
    .join("");

  return `<div id="upcoming-section">
  <div class="section-label">Coming Up</div>
  <div class="card" style="margin:0 16px 12px;overflow:hidden;">${rows}</div>
</div>`;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "..." : str;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/fragments/layout.ts src/fragments/today.ts
git commit -m "feat: add HTML layout shell and Today page fragments"
```

---

## Task 12: Session Detail Fragment

**Files:**
- Create: `src/fragments/session-detail.ts`
- Reference: Session Detail mockup, design spec

- [ ] **Step 1: Implement session detail fragment**

Create `src/fragments/session-detail.ts`:

```typescript
import type { Session, Progression } from "~/types";

export function sessionDetailPage(
  session: Session,
  currentProgression?: Progression
): string {
  const phaseCallout = currentProgression
    ? `<div class="card"><div class="card-inner">
        <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#FF9F0A;margin-bottom:8px;">${currentProgression.phaseName} Phase Notes</div>
        ${(currentProgression.details ?? []).map((d) => `<div style="font-size:13px;color:#AEAEB2;line-height:1.45;">• ${d}</div>`).join("")}
      </div></div>`
    : "";

  const exercises = session.exercises
    .map((ex, i) => {
      const tags = (ex.tags ?? [])
        .map((tag) => {
          const colors: Record<string, string> = {
            "core-integration": "rgba(191,90,242,0.15);color:#BF5AF2",
            "glute-activation": "rgba(48,209,88,0.15);color:#30D158",
            "tspine-integration": "rgba(255,159,10,0.15);color:#FF9F0A",
          };
          const style = colors[tag] ?? "rgba(255,255,255,0.1);color:#8E8E93";
          const label = tag.replace(/-/g, " ").replace(/integration|activation/g, "").trim();
          return `<span style="display:inline-block;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;padding:2px 6px;border-radius:4px;margin-left:6px;vertical-align:middle;background:${style}">${label}</span>`;
        })
        .join("");

      const videoLink = ex.videoURL
        ? `<a href="${ex.videoURL}" target="_blank" style="display:inline-flex;align-items:center;gap:4px;font-size:13px;color:#377DFF;text-decoration:none;margin-top:8px;font-weight:500;">▶ Watch tutorial</a>`
        : "";

      const notes = ex.notes
        ? `<div style="font-size:13px;color:#AEAEB2;margin-top:8px;line-height:1.45;">${ex.notes}</div>`
        : "";

      return `<div style="padding:14px 16px;${i > 0 ? "border-top:1px solid rgba(255,255,255,0.06);" : ""}">
      <div style="display:flex;align-items:flex-start;gap:12px;">
        <div style="width:24px;height:24px;border-radius:50%;background:#2C2C2E;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:#8E8E93;flex-shrink:0;margin-top:1px;">${i + 1}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:15px;font-weight:600;line-height:1.3;">${ex.name}${tags}</div>
          <div style="font-size:13px;color:#377DFF;margin-top:3px;font-weight:500;">${ex.sets}</div>
          ${notes}
          ${videoLink}
        </div>
      </div>
    </div>`;
    })
    .join("");

  return `<div id="session-detail">
  <div style="padding:4px 16px 16px;">
    <div style="font-size:22px;font-weight:700;letter-spacing:-0.3px;">${session.title}</div>
    <div style="font-size:13px;color:#8E8E93;margin-top:4px;">${session.subtitle ?? `${session.exercises.length} exercises`}</div>
    ${session.description ? `<div style="font-size:14px;color:#AEAEB2;margin-top:12px;line-height:1.5;">${session.description}</div>` : ""}
  </div>
  ${phaseCallout}
  <div class="card" style="overflow:hidden;">${exercises}</div>
  <div style="padding:12px 16px 36px;">
    <button class="btn-primary" style="width:100%;padding:14px;font-size:17px;border-radius:12px;" data-on:click="@post('/push/${session.id}')">Push to Hevy</button>
  </div>
</div>`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/fragments/session-detail.ts
git commit -m "feat: add Session Detail fragment with exercises, videos, and phase coaching"
```

---

## Task 13: Progress Page Fragments

**Files:**
- Create: `src/fragments/progress.ts`
- Reference: Skills mockup, design spec

- [ ] **Step 1: Implement Progress page fragments**

Create `src/fragments/progress.ts`:

```typescript
import type { Skill, RoadmapPhase, Benchmark } from "~/types";

export function skillCards(skills: Skill[]): string {
  const sorted = [...skills].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
  return sorted.map((skill, i) => skillCard(skill, i === 0)).join("");
}

function skillCard(skill: Skill, expanded: boolean): string {
  const bgColor = skill.color ? hexWithAlpha(skill.color, 0.15) : "rgba(55,125,255,0.15)";
  const textColor = skill.color ?? "#377DFF";

  const detail = expanded
    ? `<div id="skill-detail-${skill.id}" style="padding:0 16px 16px;">
        ${detailSection("Where You Are", skill.currentState)}
        ${detailSection("What's Needed", skill.requirements)}
        ${detailSection("Gap Analysis", skill.gapAnalysis)}
        ${milestonesSection(skill.milestones ?? [])}
      </div>`
    : "";

  return `<div class="card" style="margin:12px 16px;">
  <div style="padding:16px;display:flex;align-items:center;gap:14px;cursor:pointer;" data-on:click="@get('/skills/${skill.id}')">
    <div style="width:44px;height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;background:${bgColor};">
      <span style="color:${textColor};">${skill.icon ?? "◆"}</span>
    </div>
    <div style="flex:1;min-width:0;">
      <div style="font-size:17px;font-weight:600;">${skill.name}</div>
      <div style="font-size:13px;color:#8E8E93;margin-top:2px;">${skill.timeline ?? ""}</div>
    </div>
    <div style="font-size:12px;font-weight:600;color:#8E8E93;background:#2C2C2E;padding:4px 8px;border-radius:6px;">#${skill.priority ?? "—"}</div>
  </div>
  ${detail}
</div>`;
}

function detailSection(label: string, text?: string): string {
  if (!text) return "";
  return `<div style="margin-top:12px;">
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#8E8E93;margin-bottom:4px;">${label}</div>
    <div style="font-size:13px;color:#AEAEB2;line-height:1.5;">${text}</div>
  </div>`;
}

function milestonesSection(milestones: Array<{ name: string; targetWeek?: number }>): string {
  if (milestones.length === 0) return "";
  const rows = milestones
    .map(
      (m) =>
        `<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-top:1px solid rgba(255,255,255,0.04);">
        <div style="width:8px;height:8px;border-radius:50%;border:2px solid #3A3A3C;margin-top:4px;flex-shrink:0;"></div>
        <div style="font-size:13px;color:#AEAEB2;flex:1;">${m.name}</div>
        ${m.targetWeek ? `<div style="font-size:12px;color:#636366;flex-shrink:0;">~${m.targetWeek} wks</div>` : ""}
      </div>`
    )
    .join("");
  return `<div style="margin-top:12px;">
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#8E8E93;margin-bottom:4px;">Milestones</div>
    ${rows}
  </div>`;
}

export function roadmapSection(phases: RoadmapPhase[]): string {
  const sorted = [...phases].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const rows = sorted
    .map((phase) => {
      const isCurrent = phase.status === "current";
      const dot = isCurrent
        ? `<div style="width:10px;height:10px;border-radius:50%;background:#377DFF;margin-right:14px;flex-shrink:0;"></div>`
        : `<div style="width:10px;height:10px;border-radius:50%;border:2px solid #3A3A3C;margin-right:14px;flex-shrink:0;"></div>`;
      const gates = (phase.gateTests ?? []).length > 0
        ? `<div style="font-size:12px;color:#636366;margin-top:4px;">${phase.gateTests!.length} gate tests</div>`
        : "";
      return `<div style="padding:14px 16px;${isCurrent ? "" : "opacity:0.6;"}border-top:1px solid rgba(255,255,255,0.06);">
        <div style="display:flex;align-items:center;">
          ${dot}
          <div style="flex:1;">
            <div style="font-size:15px;font-weight:${isCurrent ? "600" : "500"};">${phase.name}${isCurrent ? " ← current" : ""}</div>
            <div style="font-size:13px;color:#8E8E93;margin-top:2px;">${phase.weeks ?? ""}</div>
            ${gates}
          </div>
        </div>
        ${phase.summary ? `<div style="font-size:13px;color:#AEAEB2;margin-top:8px;padding-left:24px;line-height:1.45;">${phase.summary}</div>` : ""}
      </div>`;
    })
    .join("");

  return `<div id="roadmap-section">
  <div class="section-label">Roadmap</div>
  <div class="card" style="overflow:hidden;">${rows}</div>
</div>`;
}

export function benchmarksSection(benchmarks: Benchmark[]): string {
  const rows = benchmarks
    .map(
      (b) =>
        `<div style="padding:14px 16px;border-top:1px solid rgba(255,255,255,0.06);">
        <div style="font-size:15px;font-weight:500;">${b.name}</div>
        <div style="font-size:13px;color:#8E8E93;margin-top:2px;">Target: ${b.target ?? "—"} · ${b.frequency ?? ""}</div>
        <div style="font-size:13px;color:#AEAEB2;margin-top:6px;line-height:1.45;">${b.howTo}</div>
      </div>`
    )
    .join("");

  return `<div id="benchmarks-section">
  <div class="section-label">Benchmarks</div>
  <div class="card" style="overflow:hidden;">${rows}</div>
</div>`;
}

function hexWithAlpha(cssColor: string, alpha: number): string {
  // Handle "rgb(r, g, b)" format
  const match = cssColor.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (match) return `rgba(${match[1]},${match[2]},${match[3]},${alpha})`;
  return cssColor;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/fragments/progress.ts
git commit -m "feat: add Progress page fragments for skills, roadmap, and benchmarks"
```

---

## Task 14: Setup Flow Fragment

**Files:**
- Create: `src/fragments/setup.ts`

- [ ] **Step 1: Implement first-run setup fragments**

Create `src/fragments/setup.ts`:

```typescript
import type { WeekTemplate } from "~/types";

export function setupPage(templates: WeekTemplate[]): string {
  const templateOptions = templates
    .map(
      (t) =>
        `<div class="card" style="cursor:pointer;" data-on:click="@post('/setup/complete', {templateId: '${t.id}', startDate: document.getElementById('start-date').value, apiKey: document.getElementById('api-key').value})">
        <div class="card-inner">
          <div style="font-size:17px;font-weight:600;">${t.name}</div>
          ${t.description ? `<div style="font-size:13px;color:#AEAEB2;margin-top:4px;">${t.description}</div>` : ""}
        </div>
      </div>`
    )
    .join("");

  return `<div id="setup">
  <div class="page-header">
    <div class="page-title">Setup</div>
    <div class="page-subtitle">Connect to Hevy and choose your schedule</div>
  </div>

  <div class="section-label">Hevy API Key</div>
  <div class="card">
    <div class="card-inner">
      <div style="font-size:13px;color:#AEAEB2;margin-bottom:12px;">Get your API key from Hevy Settings > Developer</div>
      <input id="api-key" type="password" placeholder="Enter your Hevy API key"
        style="width:100%;padding:12px;background:#2C2C2E;border:none;border-radius:8px;color:#FFF;font-size:15px;"
        data-bind:value="$apiKey">
      <div class="btn-row">
        <button class="btn-primary" data-on:click="@post('/setup/api-key', {apiKey: $apiKey})">Save Key</button>
      </div>
    </div>
  </div>

  <div class="section-label">Start Date</div>
  <div class="card">
    <div class="card-inner">
      <input id="start-date" type="date" value="${new Date().toISOString().split("T")[0]}"
        style="width:100%;padding:12px;background:#2C2C2E;border:none;border-radius:8px;color:#FFF;font-size:15px;">
    </div>
  </div>

  <div class="section-label">Schedule Template</div>
  ${templateOptions}
</div>`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/fragments/setup.ts
git commit -m "feat: add first-run setup flow fragment"
```

---

## Task 15: Router & Wiring

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Implement router with content negotiation**

Rewrite `src/index.ts`:

```typescript
import type { Env } from "./index";
import { isSSERequest, patchElements, mergeFragments, sseResponse } from "./sse/helpers";
import { getAuthenticatedUserOrDev } from "./auth/access";
import { getUser, upsertUser, getQueueItems, insertQueueItems, markQueueItemCompleted, updateQueueItemHevyRoutineId, getExerciseMappings, upsertExerciseMapping } from "./storage/queries";
import { generatePlaylist, getNextSession, getCompletedSessions } from "./domain/queue";
import { computeUpcoming } from "./domain/reflow";
import { buildRoutinePayload, matchCompletions, autoMatchExercises } from "./domain/hevy-sync";
import { evaluateReflow } from "./domain/reflow";
import { htmlShell } from "./fragments/layout";
import { carsCard, heroSessionCard, completedSection, upcomingSection } from "./fragments/today";
import { sessionDetailPage } from "./fragments/session-detail";
import { skillCards, roadmapSection, benchmarksSection } from "./fragments/progress";
import { setupPage } from "./fragments/setup";
import { HevyClient } from "./hevy/client";
import program from "../programs/mobility-joint-restoration.json";
import type { Program, Session } from "./types";

export interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
}

const typedProgram = program as unknown as Program;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      const user = getAuthenticatedUserOrDev(request, env);

      // Check if user exists (first-run check)
      const userRow = await getUser(env.DB, user.userId);

      // Static assets
      if (path === "/manifest.json" || path === "/sw.js") {
        return env.ASSETS?.fetch(request) ?? new Response("Not found", { status: 404 });
      }

      // API key update — accessible both during and after setup
      if (method === "POST" && path === "/setup/api-key") {
        const body = await request.json() as { apiKey: string };
        // Store the API key. TODO: encrypt before storing in production.
        if (userRow) {
          // Post-setup: update existing user
          await upsertUser(env.DB, {
            id: user.userId,
            active_program: userRow.active_program,
            template_id: userRow.template_id,
            start_date: userRow.start_date,
            hevy_api_key_encrypted: body.apiKey,
          });
        }
        // During setup (no user row yet): key is stored via /setup/complete
        // which receives it from the Datastar signal
        return sseResponse(patchElements('<div id="api-key-status" style="color:#30D158;font-size:13px;margin-top:8px;">Key saved ✓</div>', { selector: "#api-key-status" }));
      }

      if (!userRow) {
        if (method === "POST" && path === "/setup/complete") {
          const body = await request.json() as { templateId: string; startDate: string; apiKey?: string };
          await upsertUser(env.DB, {
            id: user.userId,
            active_program: typedProgram.meta.title,
            template_id: body.templateId,
            start_date: body.startDate,
            hevy_api_key_encrypted: body.apiKey,
          });
          // Generate queue
          const template = typedProgram.weekTemplates.find((t) => t.id === body.templateId);
          if (template) {
            const playlist = generatePlaylist(template, typedProgram.sessions, typedProgram.meta.durationWeeks ?? 8);
            await insertQueueItems(env.DB, user.userId, playlist);
          }
          return new Response(null, { status: 302, headers: { location: "/" } });
        }
        // Show setup page
        return new Response(
          htmlShell({
            title: "Setup",
            subtitle: typedProgram.meta.title,
            activeTab: "today",
            bodyContent: setupPage(typedProgram.weekTemplates),
            sseEndpoint: "/",
          }),
          { headers: { "content-type": "text/html" } }
        );
      }

      // GET / — Today
      if (path === "/" && method === "GET") {
        if (isSSERequest(request)) {
          return todaySSE(env, user.userId);
        }
        const currentProgression = getCurrentProgression(userRow.start_date);
        return new Response(
          htmlShell({
            title: "Today",
            subtitle: `${typedProgram.meta.title} · ${currentProgression?.phaseName ?? ""}`,
            activeTab: "today",
            sseEndpoint: "/",
          }),
          { headers: { "content-type": "text/html" } }
        );
      }

      // GET /progress — Progress
      if (path === "/progress" && method === "GET") {
        if (isSSERequest(request)) {
          return progressSSE();
        }
        return new Response(
          htmlShell({
            title: "Progress",
            subtitle: typedProgram.meta.title,
            activeTab: "progress",
            sseEndpoint: "/progress",
          }),
          { headers: { "content-type": "text/html" } }
        );
      }

      // GET /session/:id — Session Detail
      const sessionMatch = path.match(/^\/session\/(.+)$/);
      if (sessionMatch && method === "GET") {
        const sessionId = sessionMatch[1];
        const session = typedProgram.sessions.find((s) => s.id === sessionId);
        if (!session) return new Response("Session not found", { status: 404 });
        const currentProgression = getCurrentProgression(userRow.start_date);

        if (isSSERequest(request)) {
          return sseResponse(patchElements(sessionDetailPage(session, currentProgression), { selector: "#content", mode: "inner" }));
        }
        return new Response(
          htmlShell({
            title: session.title,
            subtitle: session.subtitle ?? "",
            activeTab: "today",
            bodyContent: `<div style="padding:12px 16px;"><a href="/" style="color:#377DFF;font-size:17px;">‹ Today</a></div>`,
            sseEndpoint: `/session/${sessionId}`,
          }),
          { headers: { "content-type": "text/html" } }
        );
      }

      // GET /skills/:id — Expand skill detail
      const skillMatch = path.match(/^\/skills\/(.+)$/);
      if (skillMatch && method === "GET" && isSSERequest(request)) {
        const skillId = skillMatch[1];
        const skill = typedProgram.skills?.find((s) => s.id === skillId);
        if (!skill) return new Response("Skill not found", { status: 404 });
        // Return the expanded skill card
        return sseResponse(patchElements(
          skillCards([skill]),
          { selector: `#skill-detail-${skillId}`, mode: "outer" }
        ));
      }

      // POST /push/:sessionId — Push to Hevy
      if (method === "POST" && path.startsWith("/push/")) {
        const sessionId = path.split("/push/")[1];
        return handlePush(env, user.userId, sessionId);
      }

      // POST /pull — Pull from Hevy
      if (method === "POST" && path === "/pull") {
        return handlePull(env, user.userId);
      }

      // POST /complete/:id — Manual complete
      if (method === "POST" && path.startsWith("/complete/")) {
        const itemId = parseInt(path.split("/complete/")[1]);
        const today = new Date().toISOString().split("T")[0];
        await markQueueItemCompleted(env.DB, itemId, today);
        return todaySSE(env, user.userId);
      }

      return new Response("Not found", { status: 404 });
    } catch (e) {
      if (e instanceof Response) return e;
      console.error(e);
      return new Response("Internal error", { status: 500 });
    }
  },
};

async function todaySSE(env: Env, userId: string): Promise<Response> {
  const items = await getQueueItems(env.DB, userId);
  const userRow = await getUser(env.DB, userId);
  const template = typedProgram.weekTemplates.find((t) => t.id === userRow?.template_id);
  const dailySession = typedProgram.sessions.find((s) => s.isDaily);
  const nextItem = getNextSession(items);
  const nextSession = nextItem ? typedProgram.sessions.find((s) => s.id === nextItem.session_id) : null;
  const today = new Date().toISOString().split("T")[0];
  const completed = getCompletedSessions(items, today);
  const pendingItems = items.filter((i) => i.status === "pending");
  const upcoming = template
    ? computeUpcoming(pendingItems.slice(1), template, typedProgram.sessions, 5) // skip the current "next"
    : [];

  const fragments: string[] = [];
  if (dailySession) fragments.push(patchElements(carsCard(dailySession), { selector: "#content", mode: "append" }));
  if (nextSession && nextItem) fragments.push(patchElements(heroSessionCard(nextSession, nextItem), { selector: "#content", mode: "append" }));

  const completedWithSessions = completed
    .map((item) => ({ session: typedProgram.sessions.find((s) => s.id === item.session_id)! }))
    .filter((c) => c.session);
  if (completedWithSessions.length > 0) {
    fragments.push(patchElements(completedSection(completedWithSessions), { selector: "#content", mode: "append" }));
  }

  if (upcoming.length > 0) {
    fragments.push(patchElements(upcomingSection(upcoming), { selector: "#content", mode: "append" }));
  }

  return sseResponse(mergeFragments(fragments));
}

function progressSSE(): Response {
  const fragments: string[] = [];

  if (typedProgram.skills) {
    fragments.push(patchElements(
      `<div class="section-label">Skills</div>${skillCards(typedProgram.skills)}`,
      { selector: "#content", mode: "append" }
    ));
  }

  if (typedProgram.roadmap) {
    fragments.push(patchElements(roadmapSection(typedProgram.roadmap), { selector: "#content", mode: "append" }));
  }

  if (typedProgram.benchmarks) {
    fragments.push(patchElements(benchmarksSection(typedProgram.benchmarks), { selector: "#content", mode: "append" }));
  }

  return sseResponse(mergeFragments(fragments));
}

async function handlePush(env: Env, userId: string, sessionId: string): Promise<Response> {
  const session = typedProgram.sessions.find((s) => s.id === sessionId);
  if (!session) return new Response("Session not found", { status: 404 });

  const userRow = await getUser(env.DB, userId);
  if (!userRow?.hevy_api_key_encrypted) {
    return sseResponse(patchElements(
      '<div style="color:#FF453A;font-size:13px;padding:16px;">Hevy API key not configured</div>',
      { selector: "#content", mode: "append" }
    ));
  }

  const client = new HevyClient(userRow.hevy_api_key_encrypted); // TODO: decrypt
  let mappings = await getExerciseMappings(env.DB, userId);

  // Auto-match exercises that don't have mappings yet
  const exerciseNames = session.exercises.map((e) => e.name);
  const mappedNames = new Set(mappings.map((m) => m.program_exercise_name));
  const unmappedNames = exerciseNames.filter((n) => !mappedNames.has(n));

  if (unmappedNames.length > 0) {
    const hevyTemplates = await client.getAllExerciseTemplates();
    const programNames = session.exercises.map((e) => e.name);
    const autoMatches = autoMatchExercises(unmappedNames, hevyTemplates);
    for (const [name, hevyId] of autoMatches) {
      await upsertExerciseMapping(env.DB, {
        user_id: userId,
        program_exercise_name: name,
        hevy_exercise_id: hevyId,
        confirmed_by_user: 0,
      });
    }
    mappings = await getExerciseMappings(env.DB, userId);
  }

  const payload = buildRoutinePayload(session, mappings);

  if (payload.unmapped.length > 0) {
    return sseResponse(patchElements(
      `<div style="color:#FF9F0A;font-size:13px;padding:16px;">Could not auto-match: ${payload.unmapped.join(", ")}. Manual mapping coming soon.</div>`,
      { selector: "#content", mode: "append" }
    ));
  }

  const items = await getQueueItems(env.DB, userId);
  const currentItem = items.find((i) => i.session_id === sessionId && i.status === "pending");

  try {
    let routine;
    if (currentItem?.hevy_routine_id) {
      routine = await client.updateRoutine(currentItem.hevy_routine_id, payload);
    } else {
      routine = await client.createRoutine(payload);
    }
    if (currentItem) {
      await updateQueueItemHevyRoutineId(env.DB, currentItem.id, routine.id);
    }
    return sseResponse(patchElements(
      '<div style="color:#30D158;font-size:13px;margin-top:8px;">Sent to Hevy ✓</div>',
      { selector: `#push-status-${sessionId}` }
    ));
  } catch (e) {
    return sseResponse(patchElements(
      `<div style="color:#FF453A;font-size:13px;margin-top:8px;">Failed to push: ${(e as Error).message}</div>`,
      { selector: `#push-status-${sessionId}` }
    ));
  }
}

async function handlePull(env: Env, userId: string): Promise<Response> {
  const userRow = await getUser(env.DB, userId);
  if (!userRow?.hevy_api_key_encrypted) {
    return sseResponse(patchElements('<div style="color:#FF453A;font-size:13px;">No API key</div>'));
  }

  const client = new HevyClient(userRow.hevy_api_key_encrypted); // TODO: decrypt
  const workouts = await client.getRecentWorkouts();
  const items = await getQueueItems(env.DB, userId);

  // Match completions — for now, use workout name matching to routine
  const matches = matchCompletions(items, workouts, (w) => {
    // Hevy doesn't expose routine_id on workout directly
    // Match by name for now — the pushed routine title matches session title
    const matchingItem = items.find(
      (i) => i.status === "pending" && i.hevy_routine_id && typedProgram.sessions.find((s) => s.id === i.session_id)?.title === w.name
    );
    return matchingItem?.hevy_routine_id ?? null;
  });

  for (const match of matches) {
    const today = new Date().toISOString().split("T")[0];
    await markQueueItemCompleted(env.DB, match.queueItemId, today, match.workoutId);
  }

  // Re-render today
  return todaySSE(env, userId);
}

function getCurrentProgression(startDate: string): typeof typedProgram.progressions[0] | undefined {
  const start = new Date(startDate);
  const now = new Date();
  const weekNum = Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

  return typedProgram.progressions.find(
    (p) => p.weekStart && p.weekEnd && weekNum >= p.weekStart && weekNum <= p.weekEnd
  );
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: No errors (may need to fix import paths).

- [ ] **Step 3: Manual smoke test**

```bash
npx wrangler dev --local
```

Visit `http://localhost:8787` — should show setup page on first load.

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: wire router with content negotiation, setup flow, and all handlers"
```

---

## Task 16: PWA Manifest & Service Worker

**Files:**
- Create: `public/manifest.json`, `public/sw.js`

- [ ] **Step 1: Create PWA manifest**

Create `public/manifest.json`:

```json
{
  "name": "Hevy Planner",
  "short_name": "Planner",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0D0D0F",
  "theme_color": "#0D0D0F",
  "description": "Training companion for Hevy — scheduling, reflow, and skill tracking"
}
```

- [ ] **Step 2: Create service worker**

Create `public/sw.js`:

```javascript
const CACHE_NAME = "hevy-planner-v1";
const SHELL_URLS = ["/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Network-first for SSE and API calls
  if (
    event.request.headers.get("accept")?.includes("text/event-stream") ||
    event.request.method !== "GET"
  ) {
    return;
  }
  // Cache-first for shell
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
```

- [ ] **Step 3: Register service worker in layout**

Add to `src/fragments/layout.ts` inside the `<head>`:

```html
<script>if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');</script>
```

- [ ] **Step 4: Commit**

```bash
git add public/manifest.json public/sw.js src/fragments/layout.ts
git commit -m "feat: add PWA manifest and service worker for home screen install"
```

---

## Task 17: End-to-End Smoke Test

- [ ] **Step 1: Start local dev server**

```bash
npm run db:migrate && npx wrangler dev --local
```

- [ ] **Step 2: Verify setup flow**

Open `http://localhost:8787`. Verify:
- Setup page loads with API key input, start date, template picker
- Selecting a template creates the user and queue
- Redirects to Today page

- [ ] **Step 3: Verify Today page**

- CARs card renders with "Push to Hevy" and "Details"
- Hero session card shows the first main session
- "Coming Up" shows next 5 sessions with spacers
- "Details" link navigates to session detail page

- [ ] **Step 4: Verify Session Detail page**

- Back link returns to Today
- All exercises render with sets, notes, video links
- Phase coaching callout appears
- Integration tags show (Core, Glute, T-Spine)

- [ ] **Step 5: Verify Progress page**

- Skills section renders with all 4 skills
- First skill is expanded
- Roadmap phases display with current phase highlighted
- Benchmarks list renders
- Tab bar navigation works between Today and Progress

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: smoke test corrections"
```
