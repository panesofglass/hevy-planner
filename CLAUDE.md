# CLAUDE.md

## Project Overview

A training companion web app that adds scheduling intelligence to Hevy. Read `SPEC.md` for the full product spec — screens, user flows, Hevy integration, and queue/reflow rules.

Hevy handles workout logging (sets, reps, PRs, Apple Watch). This companion handles everything else: program management, queue-based scheduling with automatic reflow, multi-phase roadmaps, benchmark tracking, and skill progression.

## Tech Stack

- **Runtime**: Cloudflare Workers (TypeScript)
- **Frontend**: Datastar (SSE-driven hypermedia, ~12KB, no build step)
- **SSE SDK**: `@starfederation/datastar-sdk` (web/WinterCG export)
- **Database**: Cloudflare D1 (SQLite at the edge)
- **Actor**: Cloudflare Durable Objects (SessionActor — SSE broadcast per page)
- **Integration**: Hevy API (routines, workouts, exercises)
- **Deployment**: Cloudflare Workers (wrangler)
- **Testing**: vitest (domain unit tests), Playwright (E2E browser tests)
- **PWA**: Service worker + web app manifest for home screen install

## Architecture

Two separated communication channels:

**Command channel** — POST/PUT/DELETE requests handled by the Worker. Validate input (return 4xx on failure), perform mutations (D1 writes, Hevy API calls), return 202. Route handlers never produce SSE. On success, the router triggers a reproject on the DO. On failure, the router broadcasts an error event to the DO.

**Query channel** — SSE stream held by a per-page Durable Object (SessionActor). `GET /` with `Accept: text/event-stream` proxies to the DO, which projects state from D1 as progressive Datastar fragment patches and holds the connection open for broadcasts.

```
Browser                        Worker                      Durable Object
───────                        ──────                      ──────────────
GET /           ────────────►  HTML shell (static)
                                (Datastar data-init triggers SSE)

GET / (SSE)     ────────────►  proxy to DO  ─────────────► project state from D1
                ◄──────────────────────────────────────────  stream fragments

POST /api/sync  ────────────►  validate, mutate D1
                ◄── 202 ──────
                               trigger reproject ────────► re-stream updated state
                                                           ──► push to browser
```

**DO keying**: one DO per page per user — `userId:today`, `userId:progress`, `userId:program`. Prevents cross-page content leaks. Each DO instance is independent.

**Static pages**: `/routine/:id` serves full HTML directly from the Worker. No SSE, no DO.

**Error reporting**: POST failures broadcast an error event (`{ type: "error", message }`) to the DO. The DO renders it as an orange card prepended to `#content`.

```
Workers (TypeScript)
├── Routes (request handling — validate, mutate, return 202/4xx)
├── Actor (SessionActor DO — SSE streams, broadcast, SDK dispatch)
├── Domain (queue engine, reflow, phase logic — pure functions)
├── Fragments (Datastar HTML fragment builders)
├── Hevy (API client — routines, workouts, exercises)
├── Storage (D1 queries, user state, queue, benchmarks)
└── Utils (escapeHtml, escapeAttr, truncate, date)
```

## Data Model

Programs use Hevy-compatible **Exercise Templates** + **Routines** (not "sessions"):

- **`exerciseTemplates`** — reusable exercise definitions with Hevy fields (type, equipmentCategory, primaryMuscleGroup) + coaching fields (notes, videoURL, tags, progressionByPhase). Defined once, referenced by routines.
- **`routines`** — ordered groups of exercise references. Each exercise entry has `exerciseTemplateId` + `sets` (the prescription for this routine context), with optional `notes` override.
- **`weekTemplates`** — days reference `routineIDs` (not sessionIDs).

D1 tables: `exercise_template_mappings` (our template ID → Hevy template ID), `routine_mappings` (our routine ID → Hevy routine ID), `queue_items` (uses `routine_id`).

## Project Structure

```
hevy-planner/
├── CLAUDE.md
├── SPEC.md
├── schema/
│   └── program.schema.json     ← JSON Schema for program definition
├── .claude/
│   ├── skills/
│   └── agents/
├── src/
│   ├── index.ts                ← Worker entry point, routing
│   ├── actor/
│   │   └── session-actor.ts    ← SessionActor DO: SSE streams + broadcast
│   ├── domain/                 ← Queue engine, reflow, phase logic (pure functions)
│   ├── hevy/                   ← Hevy API client
│   ├── fragments/              ← Datastar HTML fragment builders
│   ├── storage/                ← D1 queries
│   ├── utils/                  ← Shared helpers (escapeHtml, escapeAttr, truncate)
│   └── auth/                   ← API key management
├── tests/
│   └── e2e/                    ← Playwright browser tests
├── test/
│   └── domain/                 ← vitest domain unit tests
├── programs/
│   └── mobility-joint-restoration.json  ← first bundled program
├── migrations/                 ← D1 schema migrations
├── playwright.config.ts
├── wrangler.toml
└── package.json
```

## Style & Conventions

- **POST/PUT/DELETE handlers return 202 on success, 4xx on validation/auth failure.** They never produce SSE. The Datastar SDK (`@starfederation/datastar-sdk/web`) is only imported in `src/actor/session-actor.ts`. Route handlers never import it.
- **`GET /`, `GET /progress`, and `GET /program` with `Accept: text/event-stream` produce SSE streams**, each served by a per-page SessionActor DO. `/routine/:id` serves full HTML — no SSE, no DO.
- **SseEvent types are domain-oriented**: `patch`, `append`, `remove`, `signals`, `error`. The DO decides how to call the SDK based on event type. Route handlers send events; they don't know about SDK methods.
- Domain functions are pure: data in, data out. No side effects.
- Datastar v1 attributes use colon separators: `data-on:click`, `data-on:submit__prevent`, `data-signals:name` (NOT hyphens). Actions use `@` prefix: `@post('/url')`, `@get('/url')` (NOT `$$post`, `$$get`).
- Datastar fragments return HTML strings. No JSX, no templating engine.
- D1 queries use prepared statements (no raw string interpolation).
- Program data lives in D1 — load per-request via `loadProgram(db, userId)`. No static imports for active program state.
- `HevyEnumValues` uses camelCase field names (domain side). Route handlers translate to snake_case at Hevy API sync time: `exerciseType` → `exercise_type`, `equipmentCategory` → `equipment_category`, `primaryMuscleGroup` → `muscle_group` (Hevy uses `muscle_group`, not `primary_muscle_group`), `secondaryMuscleGroups` → `secondary_muscle_groups`.
- Dark theme: #0D0D0F background, #FFFFFF text.
- Commit messages: imperative mood, concise.

## Common Mistakes to Avoid

- Do NOT produce SSE from POST handlers — they return 202 or 4xx. Errors go through the DO's error event type.
- Do NOT import the Datastar SDK in route handlers — only `src/actor/session-actor.ts` uses it.
- Do NOT put queue/reflow logic in route handlers — it belongs in domain/
- Do NOT store Hevy API keys in plaintext — encrypt at rest in D1
- Do NOT poll Hevy on every page load — cache recent workout data, refresh on user action
- Do NOT define escapeHtml/escapeAttr/truncate locally in fragments — import from `src/utils/html.ts`
- `patchElements()` selector must target a unique element — use `#id` selectors, not `.class`.
- `benchmark_results.tested_at` stores date-only (`"2026-04-10"`) but `programs.phase_advanced_at` stores datetime from SQLite `datetime('now')` (`"2026-04-10 14:32:05"`). When comparing across these columns, slice datetime to date-only first.
- D1 has a 1MB response size limit per query — paginate workout history
- Hevy API rate limits are undocumented — add backoff/retry logic
- Do NOT assume Hevy API request/response shapes — verify against the live API before writing client methods. Known quirks: POST `/exercise_templates` returns a plain string ID (not JSON), POST `/routines` returns `{ routine: [...] }` (array inside object), `folder_id` is required on routine creation, and field names differ from GET responses (e.g., `muscle_group` not `primary_muscle_group`). GET `/workouts` uses `title` (not `name`) for workout name.
- When building Maps from queue items for matching, use first-match-wins (`if (!map.has(key))`) so the front of the queue is matched, not the end.
- When marking completions from Hevy, use the workout's `start_time` converted to user timezone (`request.cf.timezone`) — not `todayString()`.
- Before matching workouts to queue items in sync, filter out workouts whose ID already appears as `hevy_workout_id` on a completed queue item.
- Hevy API rejects `repRange: {start: null, end: null}` — use `{start: 0, end: 0}` instead.
- Hevy `update-routine` replaces ALL exercises — always send the complete exercise list, not just changed exercises.
- `wrangler d1 execute --file` uses the /import API endpoint which can fail with OAuth token auth (error 10000). Use `--command` for small queries or `d1 migrations apply` for larger SQL.
- The `migrations/` directory is for schema migrations only — do NOT commit data-only migrations.

## Deployment

- Dev (`hevy-planner.ryanriley.workers.dev`) auto-deploys on push to `main`.
- Production is a manual `wrangler deploy --env production`.
- **Always apply D1 migrations to remote after deploying**: `wrangler d1 migrations apply hevy-planner-db --remote` (and `--env production` for prod). Missing migrations cause blank pages with no obvious error.

## Current Phase

**SSE architecture migration** — Adopting official `@starfederation/datastar-sdk`, separating command/query channels via Durable Object actor. 98 vitest domain tests + 42 Playwright E2E tests. Design spec: `docs/superpowers/specs/2026-04-11-sse-architecture-design.md`.
