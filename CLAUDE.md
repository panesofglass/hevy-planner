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

## Project Structure

```
mobility-tracker/
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
│   └── auth/                   ← API key management
├── programs/
│   └── mobility-joint-restoration.json  ← first bundled program
├── wrangler.toml
└── package.json
```

## Style & Conventions

- Domain functions are pure: data in, data out. No side effects.
- Datastar fragments return HTML strings. No JSX, no templating engine.
- D1 queries use prepared statements (no raw string interpolation).
- Dark theme: #141210 background, #e8e4df text.
- Commit messages: imperative mood, concise.

## Common Mistakes to Avoid

- Do NOT put queue/reflow logic in route handlers — it belongs in domain/
- Do NOT store Hevy API keys in plaintext — encrypt at rest in D1
- Do NOT poll Hevy on every page load — cache recent workout data, refresh on user action
- Datastar SSE events must end with two newlines (`\n\n`)
- D1 has a 1MB response size limit per query — paginate workout history
- Hevy API rate limits are undocumented — add backoff/retry logic

## Current Phase

**Pre-build** — Product spec complete. Ready to initialize the Workers project and begin implementation.
