# CLAUDE.md

## Project Overview

A training companion web app that adds scheduling intelligence to Hevy. Read `SPEC.md` for the full product spec — screens, user flows, Hevy integration, and queue/reflow rules.

Hevy handles workout logging (sets, reps, PRs, Apple Watch). This companion handles everything else: program management, queue-based scheduling with automatic reflow, multi-phase roadmaps, benchmark tracking, and skill progression.

## Tech Stack

- **Runtime**: Cloudflare Workers (TypeScript)
- **Frontend**: Datastar (SSE-driven hypermedia, ~12KB, no build step)
- **Database**: Cloudflare D1 (SQLite at the edge)
- **Integration**: Hevy API (routines, workouts, exercises)
- **Deployment**: Cloudflare Workers (wrangler)
- **PWA**: Service worker + web app manifest for home screen install

## Architecture

The server owns the UI. Cloudflare Workers serves HTML pages with Datastar attributes. User interactions trigger SSE responses that push HTML fragment updates. No client-side framework, no build step, no SPA routing.

```
Workers (TypeScript)
├── Routes (request handling, content serving)
├── Domain (queue engine, reflow, phase logic — pure functions)
├── Datastar (SSE fragment builders, signal management)
├── Hevy (API client — routines, workouts, exercises)
└── Storage (D1 queries, user state, queue, benchmarks)
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
│   ├── domain/                 ← Queue engine, reflow, phase logic (pure functions)
│   ├── hevy/                   ← Hevy API client
│   ├── fragments/              ← Datastar HTML fragment builders
│   ├── storage/                ← D1 queries
│   ├── utils/                  ← Shared helpers (escapeHtml, escapeAttr, truncate)
│   └── auth/                   ← API key management
├── programs/
│   └── mobility-joint-restoration.json  ← first bundled program
├── migrations/                 ← D1 schema migrations
├── wrangler.toml
└── package.json
```

## Style & Conventions

- Domain functions are pure: data in, data out. No side effects.
- Datastar v1 attributes use colon separators: `data-on:click`, `data-on:submit__prevent`, `data-signals:name` (NOT hyphens: `data-on-click`, `data-signals-name`). Actions use `@` prefix: `@post('/url')`, `@get('/url')` (NOT `$$post`, `$$get`).
- Datastar fragments return HTML strings. No JSX, no templating engine.
- D1 queries use prepared statements (no raw string interpolation).
- Program data lives in D1 — load per-request via `loadProgram(db, userId)`. No static imports for active program state.
- `HevyEnumValues` uses camelCase field names (domain side). Route handlers translate to snake_case at Hevy API sync time: `exerciseType` → `exercise_type`, `equipmentCategory` → `equipment_category`, `primaryMuscleGroup` → `muscle_group` (Hevy uses `muscle_group`, not `primary_muscle_group`), `secondaryMuscleGroups` → `secondary_muscle_groups`.
- Dark theme: #141210 background, #e8e4df text.
- Commit messages: imperative mood, concise.

## Common Mistakes to Avoid

- Do NOT put queue/reflow logic in route handlers — it belongs in domain/
- Do NOT store Hevy API keys in plaintext — encrypt at rest in D1
- Do NOT poll Hevy on every page load — cache recent workout data, refresh on user action
- Do NOT define escapeHtml/escapeAttr/truncate locally in fragments — import from `src/utils/html.ts`
- Datastar SSE events must end with two newlines (`\n\n`)
- SSE endpoints must return HTTP 200 for domain errors — Datastar ignores non-2xx responses and the error fragment never renders. Use `sseResponse()` with an error fragment for validation failures (bad phase, gates not passed). Reserve non-2xx for transport failures (auth, unparseable request). E2E tests should assert error content in the SSE stream, not HTTP status codes.
- `patchElements()` selector must target a unique element — use `#id` selectors, not `.class`. A `.card` selector hits the first card on the page, not the intended one. Wrap sections in ID'd containers (e.g., `#roadmap-section`).
- `benchmark_results.tested_at` stores date-only (`"2026-04-10"`) but `programs.phase_advanced_at` stores datetime from SQLite `datetime('now')` (`"2026-04-10 14:32:05"`). When comparing across these columns, slice datetime to date-only first — string comparison `"2026-04-10" < "2026-04-10 14:32:05"` silently excludes same-day results.
- D1 has a 1MB response size limit per query — paginate workout history
- Hevy API rate limits are undocumented — add backoff/retry logic
- Do NOT assume Hevy API request/response shapes — verify against the live API (via MCP tools or curl) before writing client methods. Known quirks: POST `/exercise_templates` returns a plain string ID (not JSON), POST `/routines` returns `{ routine: [...] }` (array inside object), `folder_id` is required on routine creation, and field names differ from GET responses (e.g., `muscle_group` not `primary_muscle_group`). GET `/workouts` uses `title` (not `name`) for workout name.
- When building Maps from queue items for matching, use first-match-wins (`if (!map.has(key))`) so the front of the queue is matched, not the end. Multiple queue items share the same `hevy_routine_id`.
- When marking completions from Hevy, use the workout's `start_time` converted to user timezone (`request.cf.timezone`) — not `todayString()`. Users sync after midnight UTC but before local midnight, or sync the next day.
- Before matching workouts to queue items in sync, filter out workouts whose ID already appears as `hevy_workout_id` on a completed queue item. Otherwise each sync re-matches the same workout to a new pending item.
- Hevy API rejects `repRange: {start: null, end: null}` — use `{start: 0, end: 0}` instead. The schema says nullable but the API disagrees.
- Hevy `update-routine` replaces ALL exercises — always send the complete exercise list, not just changed exercises. Omitted exercises are deleted from the routine.
- `wrangler d1 execute --file` uses the /import API endpoint which can fail with OAuth token auth (error 10000). Use `--command` for small queries or `d1 migrations apply` for larger SQL.
- The `migrations/` directory is for schema migrations only — do NOT commit data-only migrations (UPDATE statements). For one-off data fixes, use `wrangler d1 execute --command` directly.

## Current Phase

**v1 deployed** — Core app on `main`, deployed to Cloudflare Workers production. Setup flow, Hevy sync (push + pull), queue with reflow, Daily CARs tracking, all pages rendering via Datastar SSE. 47 tests passing. All dates use user-local timezone via `request.cf.timezone`.
