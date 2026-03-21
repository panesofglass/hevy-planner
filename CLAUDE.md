# Mobility Tracker — CLAUDE.md

## Project Overview

Native iOS + watchOS workout tracker for the Mobility & Joint Restoration Program. Read `SPEC.md` for the full product spec including screens, user flows, and data model.

## Tech Stack

- **iOS**: Swift, SwiftUI, SwiftData
- **watchOS**: Swift, SwiftUI, HealthKit (HKWorkoutSession)
- **Storage**: SwiftData with CloudKit sync (iCloud)
- **Health**: HealthKit (workout logging, activity rings, heart rate)
- **No server for v1** — Cloudflare Workers + Datastar is a future Phase 2

## Key Architectural Decisions

- Domain logic (QueueEngine, reflow, state machine) lives in a **standalone Swift module** with no SwiftUI or SwiftData dependencies. Pure functions, fully testable, portable to TypeScript later.
- Daily CARs are queue items that reset every day (never reflowed, just dropped and regenerated).
- Watch uses shared CloudKit container for data sync (not Watch Connectivity).
- Program data is bundled in the app as Swift structs (read-only in v1).
- One exercise shown at a time during active workouts — focused, low-cognitive-load.

## Project Structure

```
mobility-tracker/
├── CLAUDE.md              ← you are here
├── SPEC.md                ← product spec (read this first)
├── .claude/
│   ├── skills/            ← reusable skill definitions
│   └── agents/            ← agent definitions for complex workflows
└── MobilityTracker/       ← Xcode project
    ├── Domain/            ← QueueEngine, pure functions (no UI/persistence deps)
    ├── Model/             ← SwiftData models (QueueItem, CompletedWorkout, UserState)
    ├── Data/              ← Program definition (sessions, exercises, templates)
    ├── Views/             ← SwiftUI views
    │   ├── Today/         ← Home screen (queue + week overview)
    │   ├── Workout/       ← Active workout flow (one exercise at a time)
    │   ├── History/       ← Completed workout history
    │   ├── Program/       ← Program reference + settings
    │   └── Onboarding/    ← First launch flow
    ├── ViewModels/        ← View models calling QueueEngine, persisting via SwiftData
    ├── HealthKit/         ← HealthKit integration (permissions, logging, reading)
    └── Watch/             ← watchOS target
        ├── Views/         ← Watch SwiftUI screens
        ├── Workout/       ← HKWorkoutSession management
        └── Complications/ ← Next session complication
```

## Style & Conventions

- Swift idiomatic style: enums for state, structs for data, protocols for abstraction
- Domain functions are pure: data in, data out. No side effects.
- SwiftData models use @Model macro
- Dark theme: #141210 background, #e8e4df text (matching original program artifact)
- Commit messages: imperative mood, concise

## Common Mistakes to Avoid

- Do NOT put queue/reflow logic in view models or views — it belongs in Domain/QueueEngine
- Do NOT use Watch Connectivity for data sync — use shared CloudKit container
- Do NOT read workout history from HealthKit — track it in SwiftData to avoid query complexity
- Do NOT use UserDefaults for anything — SwiftData + iCloud handles all persistence
- QueueItemStatus enum must be String/Codable for SwiftData storage
- ExerciseLog must be Codable (stored as transformable in SwiftData)
- Watch HKWorkoutSession must be started BEFORE collecting heart rate samples

## Parallel Agent Strategy

See SPEC.md § Parallel Agent Strategy for the full breakdown. Summary:

1. **Agent 1**: Domain logic + data model + unit tests (start immediately)
2. **Agent 2**: iOS SwiftUI app (start in parallel with Agent 1, stub domain initially)
3. **Agent 3**: watchOS app (start after Agent 1 finishes)
4. **Agent 4**: HealthKit + iCloud integration (start after Agents 2+3)

## Current Phase

**Pre-build** — Product spec complete. Ready to initialize Xcode project and begin parallel agent work.
