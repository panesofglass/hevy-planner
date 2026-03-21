# Product Spec

## What Is This?

An iOS + watchOS training app. It tells you what to do today, lets you tap through exercises as you complete them, automatically adjusts if you miss a workout, and logs everything to Apple Health.

No accounts, no setup. Install it, pick a program, and go.

The first bundled program is the **Mobility & Joint Restoration Program** — an 8-week plan for joint health, shoulder rehab, knee/hip mobility, and Achilles recovery. The app is designed to host any training program: strength, calisthenics, mobility, or a combination.

### Goals

- Show the user exactly what to do today, in order
- Make completing a workout as few taps as possible
- Automatically reflow the schedule when life gets in the way
- Track progress over weeks and months
- Work on the wrist (Apple Watch) with no phone dependency during a workout

### Non-Goals (v1)

- Program editor (programs are bundled; import from JSON is a future feature)
- Social or sharing features
- Web or Android access
- AI-driven programming or adaptive difficulty

---

## Screens

### 1. Today (Home Screen)

What you see when you open the app. Shows today's workout queue in order.

```
┌─────────────────────────────────┐
│  [APP NAME]                     │
│  Week 2 · Foundation Phase      │
│                                 │
│  ┌───────────────────────────┐  │
│  │  DAILY CARs               │  │
│  │  5-7 min · 5 exercises    │  │
│  │                           │  │
│  │         [Start CARs]      │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │  Session B: Knees & Hips  │  │
│  │  15-20 min · 6 exercises  │  │
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
- Queue items appear in order: daily items first (e.g., CARs), then the day's main session
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
- When the last exercise is completed: workout is saved to history, logged to Apple Health, and the Today screen updates
- A timer runs in the background tracking total session duration (displayed at the top)

### 3. History

Weekly view of completed workouts with simple stats.

```
┌─────────────────────────────────┐
│  HISTORY                        │
│                                 │
│  ── Stats ──────────────────    │
│  Streak: 8 days                 │
│  This week: 4/10 sessions       │
│  Total sessions: 34             │
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
│  [Today]  [History]  [Program]  │
└─────────────────────────────────┘
```

**Behavior:**
- Stats at the top: current streak, sessions this week, total sessions
- Grouped by week, most recent first
- Tapping a completed workout shows detail: which exercises were done/skipped, duration, heart rate (if available from Watch)
- Streak counts any day where at least one session was completed

### 4. Program

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
- Template selection (4-day, 5-day, 6-day) accessible via settings

### 5. watchOS

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
- On launch: shows today's queue (daily items + main session)
- Tapping "Start" begins the workout with live heart rate tracking
- Exercises shown one at a time: name, sets, abbreviated notes
- "Done" advances; haptic tap confirms
- On completion: workout saved to Apple Health, summary shown (duration, HR avg, exercises completed)
- Complication: shows next session name or "All done"

---

## User Flows

### First Launch

1. Welcome screen with program title and brief description
2. Pick a start date (defaults to today, can backdate if already started)
3. Pick a schedule template: 4-day, 5-day (recommended), or 6-day
4. Request health tracking permissions
5. Land on Today screen with the first day's queue populated

### Daily Use (iPhone)

1. Open app → Today screen shows queue (daily items + main session)
2. Tap "Start" on the first item → Active Workout screen, exercise 1
3. Tap "Done" through each exercise
4. Session complete → back to Today, item shows checkmark, next item becomes the hero card
5. Repeat for remaining items
6. All done → Today shows completion state with tomorrow's preview

### Daily Use (Watch)

1. Raise wrist or tap complication → see today's queue
2. Tap "Start" → heart rate tracking begins, first exercise shown
3. Tap "Done" through each exercise (haptic confirmation on each)
4. Workout complete → summary screen (duration, avg HR)
5. Complication updates to next session or "All done"

### Missed Workout

1. It's Thursday. Wednesday's Session B was not completed.
2. Open the app Thursday morning.
3. Today screen shows Thursday's normal schedule.
4. Session B has been re-enqueued to the first open day this week (if room, else dropped).
5. Week overview shows Wednesday as missed (dimmed, not checked).
6. Friday proceeds normally with its scheduled session.

### Week Boundary

1. It's Monday of week 2.
2. Any remaining skipped sessions from week 1 are dropped.
3. A fresh queue is generated from the template.
4. If the program has progression phases, coaching notes update to reflect the current phase.

---

## Queue & Reflow Rules

The queue is the core of the scheduling system. These rules define how workouts are ordered, what happens when you miss one, and how the schedule recovers.

1. Each day, the queue is populated from the active template. **Daily sessions** (e.g., CARs) are inserted first, followed by the day's scheduled session(s), in template order.

2. The user works through items in sequence. The **next item** is always the first incomplete item in today's queue.

3. When an item is **completed**, it's marked done and the next item becomes active. When all items for the day are done, the hero card shows tomorrow's preview.

4. **Daily sessions have special reset behavior**: they are never reflowed. If not completed by end of day, they are dropped. A fresh daily entry is inserted at the top of the next day's queue. Daily sessions always reset — they don't accumulate.

5. **Non-daily sessions follow reflow rules**: when a scheduled date passes without completion, the session is **re-enqueued after the remaining scheduled sessions** for the week. If no open day remains, it's dropped for the week.

6. At the **end of each week**, any remaining skipped sessions are dropped. The next week's queue is generated fresh from the template.

---

## Data Schema

Programs are defined as structured data. In v1, the first program is bundled with the app. In the future, programs can be imported from JSON files, enabling community-created and personalized plans.

### Program

```
Program
  id: string
  title: string
  description: string
  durationWeeks: int (0 = ongoing)
  sessions: Session[]
  weekTemplates: WeekTemplate[]
  progressions: Progression[]
```

### Session

```
Session
  id: string                    e.g., "daily-cars", "shoulder-rehab"
  title: string
  subtitle: string              e.g., "15-20 min — Do 2x per week"
  description: string           coaching context for the session
  isDaily: bool                 true = resets daily, not reflowed
  exercises: Exercise[]
```

### Exercise

```
Exercise
  id: string
  name: string
  sets: string                  e.g., "3×8 each side"
  notes: string                 coaching notes, cues, progression tips
  videoURL: string?             link to tutorial video
```

### Week Template

```
WeekTemplate
  name: string                  e.g., "5-Day (Recommended)"
  description: string
  days: DaySlot[]
```

### Day Slot

```
DaySlot
  dayOfWeek: int                1=Monday, 7=Sunday
  sessionIDs: string[]          references to Session.id
  note: string?                 e.g., "Strength training — CARs as warmup"
```

### Progression

```
Progression
  weekRange: string             e.g., "Weeks 1-2"
  phaseName: string             e.g., "Foundation"
  focus: string                 one-line summary
  details: string[]             specific coaching adjustments for this phase
```

### Queue Item (persisted user data)

```
QueueItem
  sessionID: string
  scheduledDate: date
  position: int
  isDaily: bool
  status: pending | ready | inProgress | completed | skipped
  startedAt: datetime?
  completedAt: datetime?
```

### Completed Workout (persisted user data)

```
CompletedWorkout
  sessionID: string
  sessionTitle: string
  completedAt: datetime
  durationSeconds: int
  exerciseLogs: ExerciseLog[]
  averageHeartRate: double?
```

### Exercise Log

```
ExerciseLog
  exerciseID: string
  completed: bool
  skipped: bool
```

### User State (persisted user data)

```
UserState
  activeProgramID: string
  activeTemplateIndex: int
  startDate: date
```

---

## Apple Health Integration

### What the App Writes

When a session is completed, a workout record is saved to Apple Health:
- Workout type based on session content (flexibility, strength, etc.)
- Start time: when "Start" was tapped
- End time: when the last exercise was completed
- Metadata: session title, exercise completion count

On Apple Watch, the workout also captures live heart rate data.

### What the App Reads

- Activity rings (move/exercise/stand) displayed on the Today screen
- Average heart rate shown on completed workout detail (when Watch was worn)
- The app tracks its own workout history rather than reading it back from Apple Health

---

## Settings

Accessible from the Program screen:

- **Template**: Switch between schedule templates (regenerates future queue items)
- **Start Date**: Adjust if needed (recalculates current week and phase)
- **Health Tracking**: Toggle workout logging on/off
- **Reset Program**: Start over from week 1 (confirmation required)

---

## Future Directions

These are not in scope for v1 but inform design decisions:

- **Program import**: Load programs from JSON files, enabling community-created plans
- **Program editor**: Create and modify programs within the app
- **Goal tracking**: Target specific milestones (first muscle-up, squat depth, etc.)
- **Exercise progressions**: Load increases, rep schemes, deload weeks
- **Web backend**: Cloudflare Workers + Datastar for web access, sharing, and analytics
- **Export**: Share workout history and program definitions

---

## Decisions Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | No server for v1 | Fastest path to a usable product. Server is an additive future phase. |
| 2 | Domain logic separated from UI and persistence | Keeps scheduling and reflow logic testable and portable to other platforms. |
| 3 | Program data bundled in app, schema supports future JSON import | Ships fast now, extensible later. |
| 4 | Daily sessions are queue items that reset daily | Unified queue model. Daily items always appear first, never reflowed, dropped and regenerated each day. |
| 5 | One exercise at a time in active workout | Focused, low-cognitive-load UI for mid-workout use. |
| 6 | `isDaily` flag on sessions rather than hardcoding CARs behavior | Any program can designate daily sessions (warmups, stretching, etc.) |
| 7 | Data schema is platform-agnostic | Defined independent of any persistence technology. Can map to SwiftData, SQLite, JSON, or a server database. |
| 8 | Dark theme | Easier on eyes during early-morning workouts. |
