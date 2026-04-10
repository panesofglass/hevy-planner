# Skill Assessments Design

## Problem

Skill cards on `/progress` render `currentState` text from program JSON, which is deeply personalized for the program author. Any other user sees someone else's assessment. No endpoint or UI exists to record user-specific skill baselines.

## Solution

Store per-user, per-program skill assessments in a separate D1 table. Display them on skill cards, falling back to program JSON defaults. Provide inline edit UI on each skill card.

## Database

**New table: `skill_assessments`** (migration `0010_skill_assessments.sql`)

```sql
CREATE TABLE skill_assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  program_id INTEGER NOT NULL REFERENCES programs(id),
  skill_id TEXT NOT NULL,
  current_state TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, program_id, skill_id)
);

CREATE INDEX idx_skill_assessments_user_program
  ON skill_assessments (user_id, program_id);
```

**Constraints:**
- `program_id` is required (skill IDs are scoped within a program)
- Assessments live in a separate table, NOT in the program JSON blob
- Assessments survive program re-import (keyed by program_id FK)
- `skill_progress` table (milestone_index) is untouched

## Storage Queries (`src/storage/queries.ts`)

Two new functions:

```typescript
// Load all assessments for a user's program as a Map
export async function getUserSkillAssessments(
  db: D1Database, userId: string, programId: number
): Promise<Map<string, string>>

// Upsert a single assessment
export async function upsertSkillAssessment(
  db: D1Database, userId: string, programId: number,
  skillId: string, currentState: string
): Promise<void>
```

`upsertSkillAssessment` uses `INSERT ... ON CONFLICT(user_id, program_id, skill_id) DO UPDATE SET current_state = excluded.current_state, updated_at = datetime('now')`.

## Route: `POST /api/skill-assessment/:skillId`

**File:** `src/routes/skill-assessment.ts`

1. Parse `skillId` from URL path (regex: `/^\/api\/skill-assessment\/([a-zA-Z0-9_-]+)$/`)
2. Load active program via `loadProgram(db, userId)` to get `program` and `programId`
3. Find skill in `program.skills` by id -- return 404 if not found
4. Parse `current_state` from form body (`application/x-www-form-urlencoded`)
5. Call `upsertSkillAssessment(db, userId, programId, skillId, currentState)`
6. Return SSE response with `patchElements()` targeting the skill card's assessment section

**Registration in `src/index.ts`:** Add regex match for `POST /api/skill-assessment/:id`.

## Fragment Updates (`src/fragments/progress.ts`)

### Updated `skillCards()` signature

```typescript
export function skillCards(
  skills: Skill[],
  assessments?: Map<string, string>
): string
```

### Skill card body additions

Between timeline and milestones, add:

1. **currentState display:** Show `assessments?.get(skill.id) ?? skill.currentState` if either exists. Wrapped in a `<div class="skill-current-state">` with an id for SSE targeting.
2. **Edit button:** An "Edit" link/button that toggles a Datastar signal `editing_${signalName}`.
3. **Edit form (hidden by default):** A textarea pre-filled with the current assessment text, plus a Save button. The Save button uses `data-on:click` to POST to `/api/skill-assessment/${skill.id}` with the textarea value.

### Datastar signal pattern

- Display signal: `skill_${id}` (existing expand/collapse)
- Edit signal: `editing_skill_${id}` (new, controls edit mode toggle)
- Edit mode shows textarea + Save; hides the display text + Edit button
- Save button: `data-on:click="$$post('/api/skill-assessment/${id}', {body: {current_state: $editing_skill_${id}_text}})"` (exact Datastar syntax TBD during implementation)

### Progress route update

`handleProgressSSE` must also load assessments and pass them to `skillCards()`:

```typescript
const { program, programId } = await loadProgram(env.DB, userId);
const assessments = await getUserSkillAssessments(env.DB, userId, programId);
// ...
addFragment(skillCards(program.skills, assessments));
```

## Acceptance Tests

1. **Save assessment:** POST returns 200, SSE patches skill card with user text
2. **Override program default:** GET /progress shows user text for assessed skills, program default for others
3. **Edit existing:** Second POST updates text via UPSERT
4. **Edit UI:** Each skill card has Edit action, textarea pre-filled with current text
5. **Invalid skill ID:** POST to nonexistent skill returns 404
6. **Persistence across operations:** Assessment survives program re-import/switch-back

## Non-goals

- AI-generated gap analysis
- Questionnaire-driven assessment
- Automated milestone tracking
- Changes to `skill_progress` table
