# Mobility Tracker — Architecture Spec

## Project Overview

A personal workout tracking app for the **Mobility & Joint Restoration Program**, built as a hypermedia-first system. The server owns the UI and application logic; clients are thin rendering surfaces with platform-specific bridges.

The app will be open-sourced. All user data is private and protected by default.

### Goals

- Track daily CARs, focused sessions (A/B/C), and active recovery
- Automatic **reflow**: if a workout is missed, the sequence advances correctly rather than leaving gaps
- Surface the next workout at a glance (especially on Apple Watch)
- Integrate with **Apple HealthKit** to log workouts and read health data
- Serve as a learning project for **CloudflareFS (F#/Fable)**, **Datastar**, and **Swift/watchOS**

### Non-Goals (for v1)

- Social/sharing features
- Program editor UI (programs are seeded from data, editing is a future PWA feature)
- Android support
- AI-driven programming or adaptive difficulty

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers                         │
│                 (F# via Fable / CloudflareFS)                │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐   │
│  │                 Auth Middleware (F#)                   │   │
│  │  validateRequest : Request -> Result<UserId, AuthErr> │   │
│  │  Cloudflare Access (personal) | Bearer token (OSS)    │   │
│  └───────────────────────┬───────────────────────────────┘   │
│                          │                                    │
│  ┌──────────────┐  ┌─────┴─────┐  ┌──────────────┐          │
│  │ Datastar SSE │  │ JSON API  │  │  Static HTML  │          │
│  │  (fragments) │  │ (watchOS) │  │  (initial load│          │
│  └──────┬───────┘  └─────┬─────┘  │   + PWA shell)│          │
│         │                │        └──────┬───────┘          │
│  ┌──────┴────────────────┴───────────────┴───────┐          │
│  │              Domain Logic (F#)                 │          │
│  │  - Workout sequencing & reflow                │          │
│  │  - Progression tracking (weeks 1-2, 3-4, 5-8) │          │
│  │  - Queue state machine (DU-based)             │          │
│  │  - Daily CARs reset logic                     │          │
│  └──────────────────────┬────────────────────────┘          │
│                         │                                    │
│  ┌──────────────────────┴────────────────────────────────┐  │
│  │                   Storage (layered)                    │  │
│  │                                                        │  │
│  │  Durable Objects ─── active workout state, SSE host   │  │
│  │  D1 (SQLite) ─────── program data, history, analytics │  │
│  │  KV ──────────────── cached snapshots (next workout)  │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
        │                    │                │
   text/event-stream    application/json   text/html
        │                    │                │
   ┌────┴────┐         ┌────┴────┐      ┌────┴────┐
   │ iOS App │         │ watchOS │      │   PWA   │
   │WKWebView│         │ SwiftUI │      │ Browser │
   │+HealthKit         │+HealthKit│      │         │
   │+Keychain │         │+Keychain│      │         │
   └─────────┘         └─────────┘      └─────────┘
        │                    │
   direct API           direct API
   (WKWebView +         (URLSession,
    JS bridge)           no phone relay)
```

### Content Negotiation

All workout-facing endpoints support content negotiation via the `Accept` header:

| Accept Header         | Response Format         | Client              |
|-----------------------|-------------------------|----------------------|
| `text/event-stream`   | Datastar SSE fragments  | iOS WKWebView, PWA   |
| `text/html`           | Full HTML page           | Initial page load    |
| `application/json`    | Structured JSON          | watchOS, future APIs |
| (future) binary       | Protobuf / CBOR          | Optimized watch sync |

The F# domain logic is invoked once regardless of format; the response serializer is selected by `Accept`.

---

## Technology Stack

| Layer              | Technology                        | Notes                                           |
|--------------------|-----------------------------------|-------------------------------------------------|
| Backend runtime    | Cloudflare Workers                | Edge compute, global distribution               |
| Backend language   | F# via Fable → JavaScript         | CloudflareFS bindings for Workers API           |
| Datastar bindings  | Hawaii (TS → F# binding generator)| Generate F# types from Datastar TypeScript SDK  |
| Active state       | Cloudflare Durable Objects        | Per-user workout state machine, SSE host        |
| Database           | Cloudflare D1 (SQLite)            | Program data, workout history, analytics        |
| Read cache         | Cloudflare KV                     | "Next workout" snapshots, fast Watch reads      |
| Frontend (web)     | Datastar (~12KB) + HTML/CSS       | No build step, no npm, SSE-driven reactivity    |
| iOS app            | Swift, WKWebView, HealthKit       | Thin shell: web view + native bridges           |
| watchOS app        | Swift, SwiftUI, HealthKit         | Native UI consuming JSON API directly           |
| Auth (personal)    | Cloudflare Access (Zero Trust)    | JWT-based, no app-level auth code needed        |
| Auth (OSS)         | Bearer token (API key in D1)      | Hashed key in D1, stored in Keychain on device  |

### CloudflareFS + Datastar Integration

CloudflareFS provides typed F# access to Workers APIs (D1, KV, R2, DO) via Fable. The Datastar TypeScript SDK defines the SSE event format, fragment merge modes, and signal types.

**Binding strategy**: Use **Hawaii** to generate F# types from the Datastar TS SDK. The types (merge modes, event options, signal shapes) are the primary value — they prevent bugs at compile time. For the SSE emitter itself, write a thin manual implementation in F#. The protocol is standard SSE with specific `event:` names and `data:` payloads containing HTML fragments or JSON signals. This is ~50-100 lines of F# and avoids fragility if Hawaii can't fully map the SDK's runtime helpers.

Generated/manual F# helpers:

- `MergeFragments` — build `datastar-merge-fragments` SSE events with typed merge modes
- `MergeSignals` — push signal updates to the client
- `RemoveFragments` / `RemoveSignals` — cleanup events
- `ExecuteScript` — server-pushed JS execution (use sparingly)

---

## Storage Architecture

### Why Three Layers

The usage pattern drives the storage design: **intense bursts** during a workout (rapid exercise completions, sub-second response needed), followed by **read-heavy review** (progress over weeks, session history, analytics).

### Durable Objects — Active Workout State

Each user gets a single DO instance. During a workout, the DO holds the queue state machine in memory. Exercise completions are instant (no database round-trip). The DO:

- Hosts the SSE connection for Datastar (fragment pushes during a workout)
- Runs the queue state machine as F# discriminated unions
- Uses `alarm()` for daily CARs reset (fires at midnight or first access)
- Flushes completed workout data to D1 when a session ends
- Writes a "next workout" snapshot to KV after any queue state change

The workout queue state machine is modeled as:

```fsharp
type QueueItemStatus =
    | Pending                        // scheduled but not yet today
    | Ready                          // today's item, available to start
    | InProgress of startedAt: DateTime  // actively being worked
    | Completed of completedAt: DateTime // done, pending flush to D1
    | Skipped                        // date passed, will be re-enqueued or dropped
```

State transitions are pure functions — easy to test in isolation, deployed inside the DO.

### D1 (SQLite) — Durable History & Program Data

D1 stores everything that needs relational queries:

- Program definitions (sessions, exercises, templates, progressions)
- Completed workout history (with exercise-level logs)
- User state (active program, template, start date)
- Auth tokens (hashed) for OSS deployments

Used for: history views, analytics (which sessions are skipped most often, progression tracking over weeks), and seeding the DO on cold start.

### KV — Read Cache

KV stores pre-computed snapshots for fast reads:

- `next-workout:{userId}` — the next queued workout with full exercise details
- `week-overview:{userId}` — the current week's queue state

Written by the DO after every state change. Read by the watchOS app on launch and background refresh. Eventually consistent (fine for reads that are seconds old).

---

## Data Model

### Program (seeded, read-only in v1)

```
Program
  ├── id: string
  ├── title: string
  ├── sessions: Session[]
  │     ├── id: string (e.g., "daily", "sessionA")
  │     ├── title: string
  │     ├── subtitle: string
  │     ├── description: string
  │     ├── targetFrequency: int (per week)
  │     └── exercises: Exercise[]
  │           ├── name: string
  │           ├── sets: string
  │           ├── notes: string
  │           └── videoUrl: string | null
  ├── weekTemplates: WeekTemplate[]
  │     ├── name: string (e.g., "5-Day (Recommended)")
  │     ├── description: string
  │     └── days: DaySlot[]
  │           ├── dayOfWeek: int (0=Mon)
  │           ├── sessions: string[] (session IDs)
  │           └── note: string | null
  └── progressions: Progression[]
        ├── weekRange: string
        ├── focus: string
        └── details: string[]
```

### User State

```
UserState
  ├── userId: string
  ├── activeProgram: string (program ID)
  ├── activeTemplate: string (template name)
  ├── startDate: date
  ├── currentWeek: int (derived)
  └── currentPhase: string (derived from progressions)
```

### Workout Queue (lives in DO, flushed to D1)

```
WorkoutQueue
  ├── userId: string
  ├── queue: QueuedWorkout[]  (ordered list of today's + upcoming sessions)
  │     ├── sessionId: string
  │     ├── scheduledDate: date (suggested, not fixed)
  │     ├── position: int
  │     ├── isDaily: bool (true for CARs entries)
  │     └── status: Pending | Ready | InProgress | Completed | Skipped
  └── history: CompletedWorkout[]  (flushed to D1)
        ├── sessionId: string
        ├── completedAt: datetime
        ├── durationSeconds: int
        ├── exercises: ExerciseLog[]
        │     ├── exerciseId: string
        │     ├── completed: bool
        │     └── notes: string | null
        └── healthKitWorkoutId: string | null
```

### Reflow Logic

The queue is the core of the "missed workout" problem:

1. Each day, the queue is evaluated. **Daily CARs are inserted at the top** of the day's items if not already present, followed by the day's scheduled session(s) from the template. For a Wednesday on the 5-Day template: `[Daily CARs (ready), Session B: Knees & Hips (ready)]`. For a strength training Tuesday: `[Daily CARs (ready), note: "CARs as warmup + Session A prehab"]`.

2. The **next workout item** is always the first `Ready` item in today's queue. The user works through items in sequence: CARs first, then the main session.

3. When an item is **completed**, it moves to `Completed` status. The next `Ready` item (if any) becomes the active prompt. When all items for the day are done, the hero card shows the next day's preview.

4. **Daily CARs have special reset behavior**: they are never reflowed. If CARs are not completed by end of day, they are simply dropped. A fresh CARs entry is inserted at the top of the next day's queue. CARs always reset — they don't accumulate.

5. **Non-daily sessions follow reflow rules**: when a scheduled date passes without completion, the session's status becomes `Skipped` and it is **re-enqueued after the remaining scheduled sessions** for the week. Example: miss Session B on Wednesday → Thursday's queue is `[CARs, Strength note]`, Friday's is `[CARs, Session C]`, Saturday is `[Recovery]`, and Session B slides to Sunday if there's room, otherwise dropped.

6. At the **end of each week**, any remaining `Skipped` sessions are dropped. The next week's queue is generated fresh from the template.

7. The DO's `alarm()` fires daily to handle the CARs reset, date transitions, and skip detection.

---

## Authentication

### Design Principle

Auth is implemented as a single F# middleware function that every endpoint passes through. The same function handles both auth strategies:

```fsharp
type AuthResult =
    | Authenticated of UserId
    | Unauthorized of reason: string

let validateRequest (request: Request) : AuthResult =
    // Try Cloudflare Access JWT first (personal deployment)
    // Fall back to Bearer token (OSS deployment)
    // Both paths produce the same UserId on success
```

### Personal Deployment: Cloudflare Access

Cloudflare Access (Zero Trust) gates the entire Worker. The user authenticates once via browser; all subsequent requests carry a CF Access JWT. The Worker validates the JWT signature and extracts the user identity. No auth code in the iOS/Watch apps — the Access session covers the device.

### OSS Deployment: Bearer Token

For self-hosted/OSS use:

1. On first setup, the user generates an API key (via a CLI command or setup endpoint)
2. The key is hashed (SHA-256) and stored in D1
3. The iOS app stores the key in **Keychain** (not UserDefaults)
4. The watchOS app stores a copy in its own **Keychain** (independent of phone)
5. The WKWebView injects the token via a custom `WKURLSchemeHandler` or cookie so Datastar SSE requests carry credentials automatically
6. All API requests include `Authorization: Bearer <key>`

Both strategies coexist. Cloudflare Access is checked first; if no Access JWT is present, the Bearer token path is tried. A request that fails both is rejected.

---

## Datastar Fragment Contract

The server returns HTML fragments that Datastar merges into the DOM. Key fragments:

### `#next-workout` — The hero card on the home screen

Shows the next item in today's queue (CARs first, then main session):

```html
<!-- Pushed via SSE when the next workout changes -->
<div id="next-workout" data-merge-mode="morph">
  <span class="badge daily">Up Next</span>
  <h2>Daily CARs</h2>
  <p class="subtitle">Controlled Articular Rotations — 5-7 min</p>
  <p class="description">Do these every single day, no exceptions...</p>
  <div class="queue-peek">Then: Session B — Knees & Hips (15-20 min)</div>
  <button data-on-click="$$get('/api/workout/start/daily')">
    Start CARs
  </button>
</div>
```

### `#exercise-list` — Rendered when a workout is started

```html
<div id="exercise-list" data-merge-mode="morph">
  <div class="exercise-card" id="ex-0">
    <h3>90/90 Hip Switches</h3>
    <span class="sets">3×8 each side</span>
    <p class="notes">Sit with both legs at 90°. Rotate from one side...</p>
    <button data-on-click="$$get('/api/exercise/complete/ex-0')">
      Done
    </button>
  </div>
  <!-- more exercises -->
</div>
```

### `#week-overview` — Calendar/queue view

```html
<div id="week-overview" data-merge-mode="morph">
  <div class="day completed">Mon — Daily CARs + Shoulders ✓</div>
  <div class="day completed">Tue — Daily CARs + Strength ✓</div>
  <div class="day today">
    Wed — <span class="done">Daily CARs ✓</span> + Knees & Hips ← now
  </div>
  <div class="day upcoming">Thu — Daily CARs + Strength</div>
  <div class="day upcoming">Fri — Daily CARs + Ankle & Integration</div>
  <div class="day upcoming">Sat — Active Recovery</div>
  <div class="day rest">Sun — Full rest</div>
</div>
```

### Signal Contract

Datastar signals (reactive state shared between client and server):

```
workout.active: bool          — is a workout in progress?
workout.sessionId: string     — current session ID
workout.exerciseIndex: int    — current exercise position
workout.elapsed: int          — seconds since workout started
queue.todayItems: int         — number of items in today's queue
queue.todayCompleted: int     — how many completed so far
queue.nextSession: string     — ID of the next queued session
queue.nextDate: string        — suggested date for next session
user.currentWeek: int         — week number in program
user.currentPhase: string     — "Foundation" / "Build" / "Load"
```

---

## HealthKit Integration

### Data Written (iOS → HealthKit)

- **HKWorkout**: logged when a session is completed
  - Type: `.flexibility` (for mobility sessions) or `.cooldown` (for recovery)
  - Duration: elapsed time from start to last exercise completion
  - Metadata: session title, exercises completed

### Data Read (HealthKit → app)

- **HKActivitySummary**: move/exercise/stand rings (display on dashboard)
- **HKWorkout history**: show mobility sessions alongside other workouts
- **Heart rate** (if Watch is worn during session): display average HR for completed sessions

### Bridge Architecture (iOS)

```
Datastar HTML                    Swift Shell
─────────────                    ───────────
data-on-click="$$get(...)"  →   WKWebView handles navigation
                                      │
JS: postMessage('healthkit',     WKScriptMessageHandler
     {action: 'startWorkout',         │
      sessionId: 'sessionB'})    HealthKit API calls
                                      │
                                 evaluateJavaScript(
                                   "ds.signals.workout = ...")
                                      │
                                 Datastar picks up signal change
```

### watchOS — Direct API

The Watch app does NOT use Datastar or the phone as a relay. It communicates directly with the Workers API via `URLSession`:

1. On launch + background refresh: `GET /api/queue/next` (JSON, served from KV cache for speed)
2. Displays the next workout(s) in a SwiftUI list — shows CARs + main session for the day
3. Allows marking exercises complete: `POST /api/exercise/complete/:id` (hits the DO directly)
4. Starts an `HKWorkoutSession` for live heart rate tracking during the workout
5. Logs completed workout to HealthKit locally on the Watch
6. **Watch Connectivity** is used only for sharing HealthKit data that requires phone-side queries (e.g., historical workout summaries that the Watch can't query directly)

Auth: Bearer token stored in the Watch's independent Keychain.

---

## Offline Strategy (Nice-to-Have)

Offline support is not required for v1 but the architecture should not preclude it.

### Read Cache (Service Worker)

A service worker (supported in WKWebView on iOS 16.4+) caches:

- Datastar JS (~12KB)
- Shell HTML and CSS
- The current day's workout fragment (pre-rendered)

On connectivity loss, the cached workout is still viewable and interactive for read-only use.

### Offline Writes (Command Queue)

When the device is offline during a workout, the Swift shell queues commands locally:

```fsharp
type OfflineCommand =
    | CompleteExercise of exerciseId: string * completedAt: DateTime
    | CompleteWorkout of sessionId: string * completedAt: DateTime
    | SkipExercise of exerciseId: string
```

On reconnect, the Swift shell posts the command queue to the DO. The DO replays commands in order. The F# state machine is deterministic — replaying commands produces the correct final state regardless of arrival time.

### Watch Offline

The Watch caches the "next workout" JSON snapshot locally. If connectivity is unavailable, it can display the workout and queue completions locally, syncing when a connection is restored.

---

## Phased Build Plan

### Phase 0: Foundation (CloudflareFS + Datastar hello world)

- [ ] Set up CloudflareFS project with Fable toolchain
- [ ] Attempt Hawaii binding generation from Datastar TS SDK; assess coverage
- [ ] Write manual SSE emitter helpers in F# (MergeFragments, MergeSignals)
- [ ] Deploy a "hello world" Worker that serves an HTML page with one Datastar-reactive element
- [ ] Verify SSE streaming works on Cloudflare Workers
- **Gate**: A button click triggers an SSE response that updates a `<div>` via Datastar fragment merge

### Phase 1: Storage + Data Model + Auth

- [ ] Set up D1 schema for Program, UserState, CompletedWorkout history
- [ ] Set up Durable Object class for per-user workout queue state
- [ ] Set up KV namespace for cached snapshots
- [ ] Implement auth middleware (Cloudflare Access + Bearer token paths)
- [ ] Seed the Mobility & Joint Restoration Program data into D1
- [ ] Build F# domain types and queue state machine (discriminated unions)
- [ ] Implement basic endpoints: `GET /api/program`, `GET /api/queue/next`, `GET /api/queue/today`
- **Gate**: Authenticated request to `GET /api/queue/today` returns today's queue (CARs + scheduled session) as JSON. DO state persists across requests. KV snapshot is written on state change.

### Phase 2: Workout UI (Datastar)

- [ ] Build the home page: `#next-workout` hero card (CARs first, then main session) + `#week-overview`
- [ ] Build the workout flow: start → exercise list → mark complete → next exercise → finish
- [ ] Implement daily CARs reset logic in the DO (alarm-based)
- [ ] Implement reflow: missed session detection, re-enqueue, weekly reset
- [ ] SSE-push fragment updates as exercises are completed
- [ ] Style with minimal CSS (dark theme inspired by the original HTML artifact)
- **Gate**: In a browser: complete CARs, then complete a main session. Week view updates in real-time. Miss a day, verify reflow places the session later in the week. Daily CARs reset the next day.

### Phase 3: iOS Shell

- [ ] Create Xcode project: single-view app with WKWebView pointing at Workers URL
- [ ] Implement Keychain storage for Bearer token
- [ ] Inject auth credentials into WKWebView requests
- [ ] Implement WKScriptMessageHandler bridge for HealthKit
- [ ] Log completed workouts to HealthKit
- [ ] Read activity summary and display via Datastar signals
- **Gate**: Complete a workout on iPhone; verify it appears in Apple Health

### Phase 4: watchOS Companion

- [ ] Create watchOS target in the Xcode project
- [ ] Implement Keychain storage for Bearer token (independent from phone)
- [ ] Fetch today's queue via JSON API (`GET /api/queue/today`) on launch + background refresh
- [ ] Display CARs + main session in a SwiftUI list with completion toggles
- [ ] `POST /api/exercise/complete/:id` on tap
- [ ] Start HKWorkoutSession for live HR tracking
- [ ] Complication showing next session name
- **Gate**: Complete a workout from the Watch without the phone nearby. Data syncs to Workers backend and appears in workout history.

### Phase 5: PWA + Offline + Polish

- [ ] Add service worker for offline read caching in the browser
- [ ] Add web app manifest for "Add to Home Screen"
- [ ] Implement offline command queue in Swift shell (nice-to-have)
- [ ] Implement progression phase display (current week/phase, progression notes in exercise descriptions)
- [ ] Add workout history view (query D1, display trends)
- [ ] Performance pass: minimize SSE payload sizes, optimize D1 queries
- **Gate**: PWA installable from Safari. Workout history shows completion trends. If offline support is implemented: start a workout, lose connectivity, complete exercises, reconnect — verify state is correct.

---

## Decisions Log

Decisions made during planning, for reference:

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Three-layer storage**: DO (active state) + D1 (history) + KV (read cache) | Usage pattern is burst writes during workout (needs in-memory speed) then read-heavy review (needs relational queries). KV bridges the gap for Watch cold-start reads. |
| 2 | **Hawaii for types, manual SSE emitter** | Types prevent bugs at compile time. The SSE protocol is simple enough that a manual emitter is less fragile than depending on full SDK binding generation. |
| 3 | **Offline is nice-to-have, not v1** | Architecture supports it (command queue pattern, service worker caching) but building it is deferred to Phase 5. |
| 4 | **Watch uses direct API, not Watch Connectivity** | Watch may be the only device during a gym workout. Direct HTTP avoids phone dependency. Watch Connectivity reserved for HealthKit data that requires the phone. |
| 5 | **Dual auth: Cloudflare Access (personal) + Bearer token (OSS)** | Access is zero-effort for personal use. Bearer token is portable for OSS self-hosting. Same F# middleware handles both. |
| 6 | **Daily CARs are queue items that reset daily** | Unified queue model — everything is a queue entry. CARs are inserted at the top of each day's queue in the recommended sequence (CARs first, then main session). Never reflowed, just dropped and regenerated. |
