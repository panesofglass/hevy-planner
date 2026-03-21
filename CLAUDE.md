# CLAUDE.md

## Project Overview

iOS + watchOS training app. Read `SPEC.md` for the product spec — screens, user flows, data schema, and queue/reflow rules.

The first bundled program is the Mobility & Joint Restoration Program. The app is designed to host any training program via a generic data schema.

## Tech Stack

- **iOS**: Swift, SwiftUI, SwiftData
- **watchOS**: Swift, SwiftUI, HealthKit (HKWorkoutSession)
- **Persistence**: SwiftData with CloudKit sync (iCloud)
- **Health**: HealthKit (workout logging, activity rings, heart rate)

## Architecture

Domain logic (queue engine, reflow, scheduling) lives in a **standalone Swift module** with no SwiftUI or SwiftData dependencies. Pure functions, fully testable. This is the code that would be reimplemented server-side if a web backend is added later.

The data schema in SPEC.md is platform-agnostic. The Swift implementation maps it to SwiftData @Model classes, but the schema itself could map to SQLite, JSON, or a server database.

## Project Structure

```
MobilityTracker/
├── Domain/            ← QueueEngine, pure functions (no UI/persistence deps)
├── Model/             ← SwiftData models (QueueItem, CompletedWorkout, UserState)
├── Data/              ← Bundled program definition (sessions, exercises, templates)
├── Views/
│   ├── Today/         ← Home screen (queue + week overview)
│   ├── Workout/       ← Active workout flow (one exercise at a time)
│   ├── History/       ← Completed workout history + stats
│   ├── Program/       ← Program reference + settings
│   └── Onboarding/    ← First launch flow
├── ViewModels/        ← Calls QueueEngine, persists via SwiftData
├── HealthKit/         ← Permissions, logging, reading
└── Watch/
    ├── Views/         ← Watch SwiftUI screens
    ├── Workout/       ← HKWorkoutSession management
    └── Complications/ ← Next session complication
```

## Style & Conventions

- Domain functions are pure: data in, data out. No side effects.
- SwiftData models use @Model macro
- Dark theme: #141210 background, #e8e4df text
- Commit messages: imperative mood, concise

## Common Mistakes to Avoid

- Do NOT put queue/reflow logic in view models or views — it belongs in Domain/QueueEngine
- Do NOT read workout history from HealthKit — track it in SwiftData
- QueueItemStatus enum must be String/Codable for SwiftData storage
- ExerciseLog must be Codable (stored as transformable in SwiftData)
- Watch HKWorkoutSession must be started BEFORE collecting heart rate samples
- `isDaily` flag lives on the Session definition, not hardcoded to CARs

## Current Phase

**Pre-build** — Product spec complete. Ready to initialize Xcode project and begin implementation.
