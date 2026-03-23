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
- Datastar fragments return HTML strings. No JSX, no templating engine.
- D1 queries use prepared statements (no raw string interpolation).
- Program data lives in D1 — load per-request via `loadProgram(db, userId)`. No static imports for active program state.
- Dark theme: #141210 background, #e8e4df text.
- Commit messages: imperative mood, concise.

## Common Mistakes to Avoid

- Do NOT put queue/reflow logic in route handlers — it belongs in domain/
- Do NOT store Hevy API keys in plaintext — encrypt at rest in D1
- Do NOT poll Hevy on every page load — cache recent workout data, refresh on user action
- Do NOT define escapeHtml/escapeAttr/truncate locally in fragments — import from `src/utils/html.ts`
- Datastar SSE events must end with two newlines (`\n\n`)
- D1 has a 1MB response size limit per query — paginate workout history
- Hevy API rate limits are undocumented — add backoff/retry logic
- Do NOT assume Hevy API request/response shapes — verify against the live API (via MCP tools or curl) before writing client methods. Known quirks: POST `/exercise_templates` returns a plain string ID (not JSON), POST `/routines` returns `{ routine: [...] }` (array inside object), `folder_id` is required on routine creation, and field names differ from GET responses (e.g., `muscle_group` not `primary_muscle_group`).

## Current Phase

**v1 implementation** — Core app on `feature/v1-implementation` branch. Upload-based setup flow complete: user uploads program JSON, server validates (Ajv), shows template cards, then on selection creates all Hevy exercise templates + routines, stores program in D1, generates queue with routine IDs pre-set. All pages load program from D1 per-request. 39 tests passing. Next: runtime smoke test (apply migration, dev server, end-to-end upload flow).
