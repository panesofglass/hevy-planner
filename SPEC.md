# Product Spec

## What Is This?

A training companion that adds the planning intelligence Hevy doesn't have. It tells you what to do today, automatically adjusts your schedule when you miss a workout, tracks long-term skill progression, and manages benchmark testing across a multi-phase roadmap — all built around programs you can define, import, and share.

Hevy handles the workout itself: exercise logging, Apple Watch, sets/reps, PRs, history. This companion handles everything upstream and downstream: scheduling, reflow, phase management, and program definition.

It runs as a web app hosted on Cloudflare Workers, accessed from any browser or as a PWA on your phone's home screen. It syncs with Hevy via the Hevy API.

### Goals

- Show the user exactly what to do today, in order, with coaching context
- Automatically reflow the schedule when a workout is missed
- Track progress across a multi-phase roadmap (weeks to months to a year)
- Gate advancement between phases on measurable benchmarks
- Track long-term skill goals (muscle-up, handstand, etc.) with milestone progression
- Push today's routine to Hevy so it's ready when you open the app
- Pull completion data from Hevy to advance the queue
- Define programs via an open JSON schema that anyone can create and share

### Non-Goals (v1)

- Replacing Hevy for workout logging (sets, reps, rest timers, PRs)
- Building native iOS or watchOS apps
- AI-generated programming or adaptive difficulty
- Social features

---

## How It Works With Hevy

### Sync Model

```
   Companion (Cloudflare)              Hevy
   ─────────────────────              ────
   Program loaded from JSON
   Queue generated from template
   "Today: CARs + Session B"
            │
            ├──push routine──────►  Routine appears in Hevy
            │                       User opens Hevy, does workout
            │                       Logs sets/reps on phone or Watch
            │
            ◄──pull completion───  Workout marked complete
            │
   Queue advances
   Reflow if needed
   Next day's routine ready
```

### Hevy API Integration

The [Hevy API](https://api.hevyapp.com/docs/) (requires Pro subscription) provides:

- **Routines**: Create, update, and list workout routines. The companion pushes today's session as a Hevy routine.
- **Workouts**: List completed workouts with full exercise/set detail. The companion polls for completions to advance the queue.
- **Exercises**: List available exercises and exercise templates. Used to map program exercises to Hevy's exercise library.
- **Routine Folders**: Organize routines by program or phase.

### Sync Triggers

- **On page load**: Pull recent workouts from Hevy, reconcile with queue state
- **On "Push to Hevy" tap**: Create or update today's routine in Hevy
- **On manual refresh**: Re-pull from Hevy to check for new completions
- **Future**: Webhook or polling interval for automatic sync

---

## Screens

### 1. Today (Home)

What you see when you open the app. Shows today's queue in order.

```
┌─────────────────────────────────┐
│  [APP NAME]                     │
│  Week 2 · Foundation Phase      │
│                                 │
│  ┌───────────────────────────┐  │
│  │  DAILY CARs               │  │
│  │  7-10 min · 7 exercises   │  │
│  │  [Push to Hevy]           │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │  Session B: Knees & Hips  │  │
│  │  15-20 min · 9 exercises  │  │
│  │  [Push to Hevy]           │  │
│  └───────────────────────────┘  │
│                                 │
│  ── This Week ──────────────    │
│  Mon  CARs + Shoulders    ✓    │
│  Tue  CARs + Core         ✓    │
│  Wed  CARs + Knees & Hips ←    │
│  Thu  CARs + Strength          │
│  Fri  CARs + Ankle             │
│  Sat  Recovery                  │
│  Sun  Rest                      │
│                                 │
│  [Today] [Roadmap] [Benchmarks] │
│            [Program]            │
└─────────────────────────────────┘
```

**Behavior:**
- Queue items appear in order: daily sessions first, then the day's main session
- Each card shows session title, duration, exercise count, and coaching description
- "Push to Hevy" creates or updates the routine in Hevy for that session
- Completed items (detected via Hevy API) show a checkmark and collapse
- When all items are done, the hero area shows "All done today" with tomorrow's preview
- The week overview highlights today and shows completion state for each day
- Updated via Datastar SSE: completion state refreshes without page reload

### 2. Session Detail

Tapping a session card expands it to show the full exercise list with coaching context.

```
┌─────────────────────────────────┐
│  ← Today                       │
│                                 │
│  Session B: Knees & Hips        │
│  15-20 min · 9 exercises        │
│                                 │
│  Your lateral lunge pain and    │
│  cross-legged sitting difficulty│
│  both point to tight hip        │
│  adductors and weak VMO...      │
│                                 │
│  ── Foundation Phase Notes ──   │
│  - Cossack Squat: hold          │
│    doorframe, partial depth     │
│  - ATG Split Squat: use bench   │
│  - Copenhagen plank from knees  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ 1. 90/90 Hip Switches     │  │
│  │    3×8 each side           │  │
│  │    [expand for notes]      │  │
│  ├───────────────────────────┤  │
│  │ 2. Glute Bridge w/ Hold ◆ │  │
│  │    3×12                    │  │
│  ├───────────────────────────┤  │
│  │ 3. Banded Clamshells ◆    │  │
│  │    3×15 each side          │  │
│  │    ...                     │  │
│  └───────────────────────────┘  │
│                                 │
│  [Push to Hevy]    [▶ Videos]   │
└─────────────────────────────────┘
```

**Behavior:**
- Full exercise list with sets/reps and coaching notes
- Phase-specific coaching adjustments shown at the top
- Exercises tagged with ◆ (or other markers) indicate cross-session exercises (e.g., core integration)
- Expanding an exercise shows full notes and a link to video tutorial
- "Push to Hevy" sends this session as a routine
- "Videos" opens a view with all video links for the session

### 3. Roadmap

Long-term view of the multi-phase training journey.

```
┌─────────────────────────────────┐
│  ROADMAP                        │
│                                 │
│  ● Phase 1: Joint Restoration   │
│    Weeks 1-8 · CURRENT          │
│    Week 2 of 8                  │
│    Gate: pass 7 benchmarks      │
│                                 │
│  ○ Phase 2: Strength Prereqs    │
│    Weeks 9-20                   │
│    Pull-up volume, straight-arm │
│    conditioning, wrist prep     │
│                                 │
│  ○ Phase 3: Skill Acquisition   │
│    Weeks 21-36                  │
│    Muscle-up transition,        │
│    planche leans, pistol depth  │
│                                 │
│  ○ Phase 4: Refinement          │
│    Weeks 37-52+                 │
│    Polish and progress          │
│                                 │
│  ── Skills ─────────────────    │
│  ★ Muscle Up      6-9 months   │
│  ◆ Tuck Planche   9-12 months  │
│  ● Pistol Squat   5-8 months   │
│  ▲ Handstand      9-15 months  │
│                                 │
│  [Today] [Roadmap] [Benchmarks] │
└─────────────────────────────────┘
```

**Behavior:**
- Shows all roadmap phases with current phase highlighted
- Each phase shows week range, summary, and gate test status
- Tapping a phase expands to show key focus, exercises introduced, and gate benchmarks
- Tapping a skill shows current state, requirements, gap analysis, timeline, and milestones
- Phase advancement: when all gate benchmarks pass, the user is prompted to advance

### 4. Benchmarks

Track measurable assessments over time.

```
┌─────────────────────────────────┐
│  BENCHMARKS                     │
│                                 │
│  ── Due This Week ──────────    │
│  Wall Dorsiflexion Test         │
│  Last: 3.5 in (R) · 2 wks ago  │
│  Target: 4-5 in                 │
│  [Log Result]                   │
│                                 │
│  Single-Leg Balance             │
│  Last: 22 sec (R) · 2 wks ago  │
│  Target: 30 sec                 │
│  [Log Result]                   │
│                                 │
│  ── Upcoming ───────────────    │
│  Hollow Body Hold    in 1 week  │
│  Overhead Reach      in 2 weeks │
│  Deep Squat          in 3 weeks │
│                                 │
│  ── History ────────────────    │
│  Wall Dorsiflexion: 2.5→3.0→3.5│
│  Balance (R): 12→18→22 sec     │
│                                 │
│  [Today] [Roadmap] [Benchmarks] │
└─────────────────────────────────┘
```

**Behavior:**
- Shows benchmarks due for retesting, sorted by urgency
- Each benchmark shows last result, target, and trend
- "Log Result" opens a simple input for recording the measurement
- History shows progression over time (sparkline or simple value list)
- Benchmarks linked to roadmap gate tests show pass/fail status

### 5. Program

Reference view of the active program. Read-only in v1.

```
┌─────────────────────────────────┐
│  PROGRAM                        │
│  Mobility & Joint Restoration   │
│                                 │
│  Week 2 of 8 · Foundation       │
│  Template: 5-Day (Recommended)  │
│                                 │
│  [Daily CARs]                   │
│  [A: Shoulder Rehab & Stability]│
│  [B: Knee & Hip Mobility]       │
│  [C: Ankle/Achilles & Integr.] │
│  [D: Core Stability]            │
│  [Active Recovery]              │
│                                 │
│  ── Foundations ─────────────   │
│  [Breathing & Bracing Protocol] │
│                                 │
│  ── Settings ───────────────    │
│  Template: 5-Day (Recommended)  │
│  Start Date: March 9, 2026      │
│  Hevy Sync: Connected           │
│  [Reset Program]                │
│                                 │
│  [Today] [Roadmap] [Benchmarks] │
└─────────────────────────────────┘
```

---

## User Flows

### First Launch / Setup

1. Open the app URL in browser (or install as PWA)
2. Connect Hevy: enter API key (from Hevy Settings > Developer)
3. Load a program: select bundled program or import from JSON file
4. Pick a start date (defaults to today)
5. Pick a schedule template (4-day, 5-day, 6-day)
6. Land on Today screen with the first day's queue populated

### Daily Use

1. Open companion → Today screen shows queue (CARs + main session)
2. Review session detail and coaching notes if needed
3. Tap "Push to Hevy" → routine appears in Hevy
4. Open Hevy on phone or Watch, do the workout, log sets/reps
5. Return to companion (or it auto-syncs) → workout detected as complete
6. Queue advances, next item updates, week overview reflects completion

### Missed Workout

1. It's Thursday. Wednesday's Session B was not completed.
2. Open the companion Thursday morning.
3. Today screen shows Thursday's normal schedule (CARs + strength note).
4. Session B has been re-enqueued to the first open day this week.
5. Week overview shows Wednesday as missed.
6. Friday proceeds normally with its scheduled session.

### Benchmark Testing

1. Benchmarks screen shows "Wall Dorsiflexion Test — due this week"
2. User performs the test, taps "Log Result", enters measurement
3. Result is saved, trend updates, gate test status recalculated
4. If all gate tests for current roadmap phase pass, user is prompted to advance

### Phase Advancement

1. All Phase 1 gate benchmarks pass
2. Roadmap screen shows "Phase 1 complete — ready to advance?"
3. User confirms → Phase 2 becomes active
4. New sessions/exercises are added to the queue from the Phase 2 program definition
5. Schedule template may update (or user is prompted to choose a new one)

---

## Queue & Reflow Rules

Same rules as before — the queue is the core scheduling engine:

1. Each day, the queue is populated from the active template. **Daily sessions** are inserted first, followed by the day's scheduled session(s), in template order.

2. The user works through items in sequence. The **next item** is always the first incomplete item in today's queue.

3. When Hevy reports an item as **completed**, it's marked done and the queue advances.

4. **Daily sessions have special reset behavior**: never reflowed when missed, just dropped. A fresh daily entry is inserted at the top of the next day's queue.

5. **Non-daily sessions follow reflow rules**: when a scheduled date passes without completion, the session is re-enqueued after the remaining scheduled sessions for the week. If no open day remains, it's dropped for the week.

6. At the **end of each week**, any remaining skipped sessions are dropped. The next week's queue is generated fresh from the template.

---

## Data Schema

Programs are defined via the JSON Schema in `schema/program.schema.json`. The schema covers:

- **Program metadata**: title, author, duration, tags
- **Sessions**: named groups of exercises, with an `isDaily` flag for daily-reset behavior
- **Exercises**: name, sets/reps, coaching notes, video links, cross-session tags, per-phase overrides
- **Week templates**: multiple schedule options (e.g., 4-day, 5-day, 6-day)
- **Progressions**: phase-based coaching adjustments within the program
- **Roadmap phases**: long-term phases with gate tests that reference benchmarks
- **Skills**: long-term goals with milestones and timelines
- **Benchmarks**: measurable assessments with targets and retest frequencies
- **Foundations**: protocols (breathing, bracing) that apply across the program
- **Theme**: optional per-program and per-session color theming

See `schema/program.schema.json` for the full definition.

### User Data (persisted in D1)

```
UserState
  userID: string
  activeProgramID: string
  activeTemplateID: string
  startDate: date
  currentRoadmapPhaseID: string
  hevyAPIKey: string (encrypted)

QueueItem
  sessionID: string
  scheduledDate: date
  position: int
  isDaily: bool
  status: pending | ready | completed | skipped
  hevyRoutineID: string?
  hevyWorkoutID: string?

BenchmarkResult
  benchmarkID: string
  recordedAt: datetime
  value: string
  notes: string?

CompletedWorkout
  sessionID: string
  completedAt: datetime
  hevyWorkoutID: string
  durationSeconds: int
```

### Hevy Exercise Mapping

Programs define exercises by name. The companion maps these to Hevy's exercise library when pushing routines. A mapping table in D1 stores confirmed matches:

```
ExerciseMapping
  programExerciseID: string
  hevyExerciseID: string
  confirmedByUser: bool
```

On first push, the companion attempts to auto-match by name. Unmatched exercises are flagged for the user to resolve manually.

---

## Settings

- **Hevy Connection**: API key management, sync status, last sync time
- **Template**: Switch between schedule templates (regenerates future queue items)
- **Start Date**: Adjust if needed (recalculates current week and phase)
- **Program**: View active program, import new program from JSON
- **Reset Program**: Start over from week 1 (confirmation required)

---

## Prerequisites & Costs

### What You Need

- **Hevy Pro subscription** ($9.99/month or $49.99/year) — required for API access. Get your API key from [Hevy Settings > Developer](https://hevy.com/settings?developer). [Hevy app](https://www.hevyapp.com/).
- **Cloudflare account** (free tier is sufficient to start) — [Sign up](https://dash.cloudflare.com/sign-up).
- **Node.js 18+** — for local development and the Wrangler CLI.
- **Wrangler CLI** — Cloudflare's deployment tool (`npm install -g wrangler`).

### Cloudflare Costs

The free tier covers most personal use:

| Resource | Free Tier | Notes |
|----------|-----------|-------|
| Workers requests | 100,000/day | More than enough for a personal app |
| D1 database | 5 GB storage, 5M rows read/day | Workout history for years |
| KV (if used) | 100,000 reads/day | Not required for v1 |
| Custom domain | Bring your own | Optional; `*.workers.dev` subdomain is free |

**Estimated cost for personal use: $0/month** beyond the Hevy Pro subscription.

If usage grows (multiple users, heavy API polling), the Workers Paid plan is $5/month and covers 10M requests/month with higher D1 limits.

### Hevy API Limits

The Hevy API documentation does not publish explicit rate limits. The app should implement conservative backoff/retry logic and cache aggressively. For a single user syncing a few times per day, rate limits are unlikely to be an issue.

---

## Decisions Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Companion to Hevy, not a standalone tracker | Hevy already has native apps, Watch support, exercise logging, PRs. Don't rebuild what works. |
| 2 | Cloudflare Workers + Datastar | The entire product is a web app. Datastar's SSE-driven hypermedia is a natural fit. No native apps needed. |
| 3 | TypeScript on Workers | First-class Cloudflare support. Datastar TS SDK works directly. Claude knows it deeply for agent-assisted builds. |
| 4 | D1 for persistence | Relational queries for queue state, workout history, benchmark trends. SQLite at the edge. |
| 5 | Programs defined via JSON Schema | Open, shareable, community-extensible. Anyone can create a program. |
| 6 | Daily sessions are queue items that reset daily | Unified queue model. Daily items always appear first, never reflowed. |
| 7 | Hevy API for sync, not scraping or manual entry | Official API with routine and workout CRUD. Requires Pro subscription. |
| 8 | PWA for mobile access | No App Store needed. Install from browser. Works on any device with a browser. |
