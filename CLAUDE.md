# Mobility Tracker — CLAUDE.md

## Project Overview

Hypermedia-first workout tracker for the Mobility & Joint Restoration Program. Read `SPEC.md` for the full architecture spec.

## Tech Stack

- **Backend**: F# via Fable → JavaScript, running on Cloudflare Workers (CloudflareFS bindings)
- **Frontend**: Datastar (~12KB) + server-rendered HTML, SSE-driven reactivity
- **Storage**: Durable Objects (active workout state) + D1/SQLite (history, program data) + KV (read cache)
- **iOS**: Swift thin shell with WKWebView + HealthKit bridge
- **watchOS**: SwiftUI + direct JSON API + HealthKit
- **Auth**: Cloudflare Access (personal) + Bearer token (OSS)

## Key Architectural Decisions

- Server owns the UI. Clients are rendering surfaces.
- Content negotiation: `text/event-stream` (Datastar SSE) for iOS/PWA, `application/json` for watchOS, `text/html` for initial page loads.
- Datastar binding strategy: Hawaii-generated F# types from TS SDK where possible, manual SSE emitter (~50-100 lines F#) for the event protocol.
- Workout queue is a state machine using F# discriminated unions, hosted in a per-user Durable Object.
- Daily CARs are queue items that reset every day (never reflowed, just dropped and regenerated).
- Watch communicates directly with Workers API (no phone relay).

## Project Structure

```
mobility-tracker/
├── CLAUDE.md              ← you are here
├── SPEC.md                ← architecture spec (read this first)
├── .claude/
│   └── commands/          ← slash commands for repeated workflows
├── worker/                ← CloudflareFS / Fable project (Cloudflare Worker)
│   ├── src/               ← F# source
│   │   ├── Domain/        ← pure domain logic (queue state machine, reflow)
│   │   ├── Api/           ← request routing, content negotiation, auth middleware
│   │   ├── Datastar/      ← SSE emitter, fragment builders
│   │   └── Storage/       ← D1, KV, DO bindings
│   └── wrangler.toml      ← Cloudflare Workers config
├── ios/                   ← Xcode project (iOS + watchOS)
│   ├── MobilityTracker/   ← iOS app (WKWebView shell + HealthKit bridge)
│   └── MobilityWatch/     ← watchOS app (SwiftUI + JSON API)
└── seed/                  ← program data seeding scripts
```

## Style & Conventions

- F# idiomatic style: discriminated unions for state, pure functions for transitions, pipeline operators
- Prefer `Result<'T, 'E>` over exceptions
- All domain logic must be testable without IO (pure functions, DI for storage)
- HTML fragments: minimal CSS, dark theme (#141210 background, #e8e4df text — matching original program artifact)
- Commit messages: imperative mood, concise

## Common Mistakes to Avoid

- Do NOT use the Datastar .NET SDK (StarFederation.Datastar) — it targets ASP.NET Core, not Fable/JS
- Do NOT use Watch Connectivity for API calls — Watch talks directly to Workers API
- Do NOT store auth tokens in UserDefaults — use Keychain on both iOS and watchOS
- Fable compiles F# to JS. Do not use .NET-specific APIs (System.IO, HttpClient, etc.) — use CloudflareFS bindings for Workers APIs
- KV is eventually consistent — never use it for write-then-read patterns during a workout session

## Local Development

- CloudflareFS project: see `worker/` directory
- Fable toolchain required: `dotnet tool restore` then `dotnet fable`
- Cloudflare Workers: `npx wrangler dev` for local dev, `npx wrangler deploy` for production
- iOS/watchOS: open `ios/MobilityTracker.xcodeproj` in Xcode

## Current Phase

**Phase 0: Foundation** — CloudflareFS + Datastar hello world. See SPEC.md § Phased Build Plan.
