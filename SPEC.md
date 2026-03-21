# Mobility Tracker — Product Spec

## What Is This?

A native iOS + watchOS app for tracking the Mobility & Joint Restoration Program. The app tells you what to do today, lets you tap through exercises as you complete them, automatically adjusts if you miss a workout, and logs everything to Apple Health.

No server, no accounts, no setup. Install it, pick a start date, and go.

A Cloudflare Workers backend (TypeScript + Datastar) may be added in a future phase for web access and program sharing. The domain logic is kept in a standalone Swift module so it can be reimplemented server-side without reworking the apps.

---

## Screens

### 1. Today (Home Screen)

What you see when you open the app. Shows today's workout queue in order.

```
┌─────────────────────────────────┐
│  MOBILITY TRACKER               │
│  Week 2 · Foundation Phase      │
│                                 │
│  ┌───────────────────────────┐  │
│  │  DAILY CARs               │  │
│  │ 5-7 min · 5 exercises     │  │
│  │                           │  │
│  │         [Start CARs]      │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │  Session B: Knees & Hips  │  │
│  │ 15-20 min · 6 exercises   │  │
│  │                           │  │
│  │      [Start Session]      │  │
│  └───────────────────────────┘  │
│                                 │
│  ── This Week ──────────────    │
│  Mon  CARs + Shoulders    ✓    │
│  Tue  CARs + Strength     ✓    │
│  Wed  CARs + Knees & Hips ←    │
│  Thu  CARs + Strength          │
│  Fri  CARs + Ankle             │
│  Sat  Recovery                  │
│  Sun  Rest                      │
│                                 │
│  [Today]  [History]  [Program]  │
└─────────────────────────────────┘
```

**Behavior:**
- Queue items appear in order: CARs first, then the day's main session
- Tapping "Start" opens the active workout screen
- Completed items show a checkmark and collapse
- When all items are done, the hero area shows "All done today" with a preview of tomorrow
- The week overview highlights today and shows completion state for each day

### 2. Active Workout

The tap-through flow for completing a workout. One exercise at a time, focused.

```
┌─────────────────────────────────┐
│  ← Back          Session B      │
│                  3 of 6         │
│                                 │
│  Banded Terminal Knee           │
│  Extensions                     │
│                                 │
│  3×15 each leg                  │
│                                 │
│  Attach band behind your knee   │
│  to a low anchor. Stand facing  │
│  away, slight bend. Squeeze to  │
│  full lockout against band      │
│  resistance. This isolates the  │
│  VMO — the inner quad muscle    │
│  that stabilizes the kneecap.   │
│                                 │
│  [▶ Video Tutorial]             │
│                                 │
│  ┌─────────────────────────┐    │
│  │                         │    │
│  │     [Done ✓]            │    │
│  │                         │    │
│  │     [Skip →]            │    │
│  └─────────────────────────┘    │
│                                 │
│  ●●●○○○  progress dots          │
└─────────────────────────────────┘
```

**Behavior:**
- Shows one exercise at a time with name, sets/reps, coaching notes, and video link
- "Done" advances to the next exercise
- "Skip" moves to next exercise (logged as skipped, not counted as completed)
- Progress dots show position in the session
- "Back" returns to the Today screen (workout is paused, not lost)
- When the last exercise is completed: workout is saved to history, logged to HealthKit, and the Today screen updates
- A timer runs in the background tracking total session duration (displayed at the top)

### 3. History

Weekly and monthly view of completed workouts.

```
┌─────────────────────────────────┐
│  HISTORY                        │
│                                 │
│  ── This Week ──────────────    │
│  Mon  Shoulders     22 min  ✓   │
│  Mon  Daily CARs     6 min  ✓   │
│  Tue  Daily CARs     5 min  ✓   │
│  Wed  (today)                   │
│                                 │
│  ── Last Week ──────────────    │
│  Mon  Shoulders     19 min  ✓   │
│  Mon  Daily CARs     7 min  ✓   │
│  Wed  Knees & Hips  18 min  ✓   │
│  Wed  Daily CARs     5 min  ✓   │
│  Fri  Ankle          16 min ✓   │
│  Fri  Daily CARs     6 min  ✓   │
│  Sat  Recovery       25 min ✓   │
│                                 │
│  ── Stats ──────────────────    │
│  Streak: 8 days                 │
│  This week: 4/10 sessions       │
│  Total sessions: 34             │
│                                 │
│  [Today]  [History]  [Program]  │
└─────────────────────────────────┘
```

**Behavior:**
- Grouped by week, most recent first
- Tapping a completed workout shows the detail: which exercises were done/skipped, duration, heart rate (if available from Watch)
- Simple stats at the top: current streak, sessions this week, total sessions
- Streak counts any day where at least CARs were completed

### 4. Program

Reference view of the full program. Read-only in v1.

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
│  [Active Recovery]              │
│                                 │
│  ── Current Phase ──────────    │
│  Weeks 1-2: Foundation          │
│  Learn the movements. Don't     │
│  chase depth or load.           │
│  - CARs: 70% effort             │
│  - All exercises at bodyweight   │
│  - ATG Split Squat: use bench   │
│                                 │
│  [Today]  [History]  [Program]  │
└─────────────────────────────────┘
```

**Behavior:**
- Tapping a session expands to show all exercises with full coaching notes and video links
- Current progression phase is highlighted with its guidance
- Upcoming phases shown dimmed
- Template selection (4-day, 5-day, 6-day) accessible from this screen via settings

### 5. watchOS — Workout

The Watch shows the essentials. No browsing, no history — just the next workout.

```
┌───────────────────┐
│  Daily CARs       │
│  5 exercises       │
│                   │
│  [Start]          │
│                   │
│  Then: Knees &    │
│  Hips (6 ex.)     │
└───────────────────┘

→ After tapping Start:

┌───────────────────┐
│  Neck CARs        │
│  1×5 each dir.    │
│                   │
│  Slow, controlled │
│  circles. Keep    │
│  shoulders still. │
│                   │
│  [Done ✓]         │
│  3 of 5           │
└───────────────────┘
```

**Behavior:**
- On launch: shows today's queue (CARs + main session)
- Tapping "Start" begins the workout and starts an HKWorkoutSession (live HR tracking)
- Exercises shown one at a time: name, sets, abbreviated notes
- "Done" advances; haptic tap confirms
- On completion: workout saved to HealthKit, Watch shows summary (duration, HR avg, exercises completed)
- Complication: shows next session name ("CARs + Knees" or "All done")

---

## User Flows

### First Launch

1. Welcome screen: "Mobility & Joint Restoration Program — 8 weeks to better movement"
2. Pick a start date (defaults to today, can backdate if already started)
3. Pick a template: 4-day, 5-day (recommended), or 6-day
4. Request HealthKit permissions (write workouts, read activity summary + heart rate)
5. Land on Today screen with the first day's queue populated

### Daily Use (iPhone)

1. Open app → Today screen shows queue (CARs + main session)
2. Tap "Start CARs" → Active Workout screen, exercise 1 of 5
3. Tap "Done" through each exercise
4. CARs complete → back to Today, CARs shows checkmark, main session is now the hero card
5. Tap "Start Session" → Active Workout, exercise 1 of 6
6. Tap through exercises
7. Session complete → saved to history, logged to HealthKit, Today shows "All done"

### Daily Use (Watch)

1. Raise wrist or tap complication → see today's queue
2. Tap "Start" → HKWorkoutSession begins, first exercise shown
3. Tap "Done" through each exercise (haptic confirmation on each)
4. Workout complete → summary screen (duration, avg HR), saved to HealthKit
5. Complication updates to next session or "All done"

### Missed Workout

1. It's Thursday. Wednesday's Session B was not completed.
2. Open the app Thursday morning.
3. Today screen shows: [CARs] [Strength note] (Thursday's normal schedule)
4. Session B has been re-enqueued to the first open day (Sunday, if room, else dropped for the week)
5. Week overview shows Wednesday as missed (dimmed, not checked)
6. Friday proceeds normally with Session C

### Week Boundary

1. It's Monday of week 2.
2. Any remaining skipped sessions from week 1 are dropped.
3. A fresh queue is generated from the template.
4. If week 2 is still "Foundation" phase, exercise descriptions include Foundation-phase coaching ("CARs: 70% effort", "use bench support", etc.)
5. When week 3 starts, descriptions update to "Build" phase coaching.

---

## Data Model (Swift)

### Program Data (bundled, read-only)

```swift
struct Program {
    let id: String
    let title: String
    let sessions: [Session]
    let weekTemplates: [WeekTemplate]
    let progressions: [Progression]
}

struct Session {
    let id: String              // "daily", "sessionA", "sessionB", etc.
    let title: String
    let subtitle: String
    let description: String
    let targetFrequency: Int    // per week
    let exercises: [Exercise]
}

struct Exercise {
    let id: String
    let name: String
    let sets: String            // "3x8 each side"
    let notes: String
    let videoURL: URL?
}

struct WeekTemplate {
    let name: String            // "5-Day (Recommended)"
    let description: String
    let days: [DaySlot]
}

struct DaySlot {
    let dayOfWeek: Int          // 1=Monday (matching Calendar)
    let sessionIDs: [String]
    let note: String?           // "Strength training — CARs as warmup"
}

struct Progression {
    let weekRange: String       // "Weeks 1-2"
    let phaseName: String       // "Foundation"
    let focus: String
    let details: [String]
}
```

### User State (SwiftData, synced via iCloud)

```swift
@Model
class UserState {
    var activeTemplateIndex: Int    // which week template
    var startDate: Date
    var currentWeek: Int { /* derived from startDate */ }
    var currentPhase: String { /* derived from progressions */ }
}
```

### Workout Queue (SwiftData)

```swift
@Model
class QueueItem {
    var sessionID: String
    var scheduledDate: Date
    var position: Int
    var isDaily: Bool
    var status: QueueItemStatus     // pending, ready, inProgress, completed, skipped
    var startedAt: Date?
    var completedAt: Date?
}

enum QueueItemStatus: String, Codable {
    case pending        // scheduled but not yet today
    case ready          // today's item, available to start
    case inProgress     // actively being worked
    case completed      // done
    case skipped        // date passed without completion
}
```

### Workout History (SwiftData, synced via iCloud)

```swift
@Model
class CompletedWorkout {
    var sessionID: String
    var sessionTitle: String
    var completedAt: Date
    var durationSeconds: Int
    var exerciseLogs: [ExerciseLog]
    var healthKitWorkoutID: UUID?
    var averageHeartRate: Double?    // from Watch, if available
}

struct ExerciseLog: Codable {
    let exerciseID: String
    let completed: Bool
    let skipped: Bool
}
```

---

## Domain Logic (standalone module)

The queue state machine and reflow logic live in a pure Swift module with no SwiftUI or SwiftData dependencies. This is the code that would be reimplemented in TypeScript if a Workers backend is added later.

### Queue Engine

```swift
// Pure functions — no side effects, fully testable

struct QueueEngine {

    /// Generate today's queue items from the template
    static func generateDay(
        template: WeekTemplate,
        dayOfWeek: Int,
        date: Date,
        existingQueue: [QueueItem]
    ) -> [QueueItem]
    // Inserts CARs at position 0, then scheduled sessions in template order.
    // Skips if items for this date already exist.

    /// Advance the queue when an item is completed
    static func complete(
        item: QueueItem,
        at: Date,
        queue: [QueueItem]
    ) -> [QueueItem]
    // Marks item as .completed, sets completedAt.
    // If next item exists for today, it becomes .ready.

    /// Handle day transition: detect missed sessions, insert new CARs
    static func advanceDay(
        from previousDate: Date,
        to currentDate: Date,
        queue: [QueueItem],
        template: WeekTemplate
    ) -> [QueueItem]
    // 1. Any .ready or .pending items from previous dates -> .skipped
    // 2. Skipped non-daily items: re-enqueue after remaining week items
    // 3. Skipped daily items (CARs): drop, don't re-enqueue
    // 4. Generate new day's items (CARs first, then scheduled sessions)

    /// Handle week boundary: drop remaining skipped, generate fresh week
    static func advanceWeek(
        queue: [QueueItem],
        template: WeekTemplate,
        weekStartDate: Date
    ) -> [QueueItem]
    // Drops all .skipped items. Generates the full week's queue.

    /// Get the current progression phase for a given week number
    static func currentPhase(
        week: Int,
        progressions: [Progression]
    ) -> Progression?
}
```

### Key Design Rule

These functions take data in and return data out. No SwiftData queries, no HealthKit calls, no UI updates. The caller (a SwiftUI view model or a background task) is responsible for persisting the result and triggering side effects.

---

## HealthKit Integration

### Permissions Requested

- **Write**: HKWorkoutType (.flexibility, .cooldown)
- **Read**: HKActivitySummaryType, HKQuantityType(.heartRate), HKWorkoutType

### When Workouts Are Logged

- **iPhone**: After the last exercise in a session is completed (or skipped), an HKWorkout is saved with:
  - Type: .flexibility (mobility sessions) or .cooldown (recovery)
  - Start time: when "Start" was tapped
  - End time: when the last exercise was completed
  - Metadata: session title, exercises completed count

- **Watch**: Same as above, but wrapped in an HKWorkoutSession for live heart rate collection. Heart rate samples are automatically associated with the workout.

### Data Read

- Activity rings (move/exercise/stand) displayed on the Today screen if available
- Average heart rate shown on completed workout detail (if Watch was worn)
- Workout history from HealthKit is NOT read — the app tracks its own history in SwiftData to avoid HealthKit query complexity

---

## iCloud Sync

SwiftData with CloudKit integration provides automatic sync:

- UserState, QueueItem, CompletedWorkout all sync via iCloud
- iPhone to Mac sync is automatic
- Watch uses a shared CloudKit container for the same data
- No conflict resolution logic needed for single-user — last write wins
- If iCloud is unavailable, data persists locally and syncs when reconnected

---

## Settings

Accessible from the Program screen:

- **Template**: Switch between 4-day, 5-day, 6-day (regenerates future queue items)
- **Start Date**: Adjust if needed (recalculates current week/phase)
- **HealthKit**: Toggle workout logging on/off
- **Reset Program**: Start over from week 1 (confirmation required)

---

## Phase 2: Workers Backend (Future)

When the product proves itself and web access is desired:

1. Reimplement QueueEngine in TypeScript for Cloudflare Workers
2. Add D1 database mirroring the SwiftData schema
3. Add Datastar SSE frontend (hypermedia approach)
4. Add sync layer: iOS/Watch apps POST completions to the Workers API
5. Add auth (Cloudflare Access for personal, Bearer token for OSS)
6. PWA comes free from the Datastar frontend

The iOS/Watch apps continue working locally. The sync layer is additive — not a replacement for local SwiftData storage.

---

## Parallel Agent Strategy (Weekend Build)

Using Boris Cherny's method, the project can be split across parallel Claude Code agents:

### Agent 1: Domain Logic + Data Model
- Domain/ module: QueueEngine, all pure functions
- Model/ module: SwiftData models (QueueItem, CompletedWorkout, UserState)
- Program data definition (all sessions, exercises, templates, progressions as Swift structs)
- Unit tests for QueueEngine (reflow, CARs reset, week boundary, missed workouts)
- **Gate**: All unit tests pass. QueueEngine handles every scenario in the "User Flows" section.

### Agent 2: iOS App (SwiftUI)
- Today screen, Active Workout screen, History screen, Program screen
- Tab bar navigation
- View models that call QueueEngine and persist via SwiftData
- Dark theme styling (#141210 background, #e8e4df text)
- First launch onboarding flow
- **Gate**: Full workout flow works in the iOS Simulator. Can complete CARs + main session, see history, view program.

### Agent 3: watchOS App
- Workout list screen, Active Workout screen, Summary screen
- HKWorkoutSession integration for live HR
- Complication (next session name)
- Background refresh (update queue state)
- **Gate**: Full workout flow works in the Watch Simulator. Workout appears in HealthKit.

### Agent 4: HealthKit + Integration
- HealthKit permission requests
- Workout logging (iPhone + Watch paths)
- Activity ring display on Today screen
- Heart rate display on workout detail
- iCloud sync configuration (shared CloudKit container)
- Integration testing across iPhone + Watch
- **Gate**: Complete a workout on Watch, verify it appears in iPhone history and Apple Health.

### Sequencing

Agents 1 and 2 can start in parallel. Agent 2 depends on Agent 1's data model and QueueEngine API (but can stub initially). Agent 3 depends on the data model from Agent 1. Agent 4 depends on Agents 2 and 3 for integration points.

Recommended: start Agents 1 + 2 simultaneously. When Agent 1 finishes, start Agent 3. When Agents 2 + 3 finish, start Agent 4 for integration.

---

## Decisions Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Native Swift + SwiftData, no server for v1 | Fastest path to a usable product. Server is additive Phase 2. |
| 2 | Domain logic in standalone module | Keeps reflow/queue logic testable and portable to TypeScript if a backend is added later. |
| 3 | iCloud sync via CloudKit | Free, automatic, handles iPhone / Watch / Mac. No infrastructure to manage. |
| 4 | Program data bundled in app | Static content doesn't need a database. Embedded Swift structs or a JSON file in the app bundle. |
| 5 | Daily CARs are queue items that reset daily | Unified queue model. CARs always appear first, never reflowed, dropped and regenerated each day. |
| 6 | One exercise at a time in active workout | Focused, low-cognitive-load UI for mid-workout use. Sweaty hands, distracted mind — keep it simple. |
| 7 | Watch uses shared CloudKit, not Watch Connectivity for data | Simpler architecture. Watch Connectivity only for phone-dependent HealthKit queries. |
| 8 | Dark theme | Matches the original program artifact aesthetic. Easier on eyes during early-morning workouts. |
