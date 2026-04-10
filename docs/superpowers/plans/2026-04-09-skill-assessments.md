# Skill Assessments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users record per-skill text assessments that override program JSON defaults on the Progress page.

**Architecture:** New `skill_assessments` D1 table keyed by (user_id, program_id, skill_id). Route handler for POST with SSE response. Fragment updated to show currentState with inline edit UI using Datastar signals.

**Tech Stack:** Cloudflare Workers (TypeScript), D1 (SQLite), Datastar v1 (SSE + signals), Vitest

---

## File Structure

| Action | File | Purpose |
|--------|------|---------|
| Create | `migrations/0010_skill_assessments.sql` | D1 schema for skill_assessments table |
| Create | `test/fragments/progress.test.ts` | Unit tests for skillCards fragment |
| Create | `src/routes/skill-assessment.ts` | POST /api/skill-assessment/:id handler |
| Modify | `src/storage/queries.ts` | Add getUserSkillAssessments + upsertSkillAssessment |
| Modify | `src/fragments/progress.ts` | Show currentState, edit UI, accept assessments map |
| Modify | `src/routes/progress.ts` | Load assessments, pass to skillCards |
| Modify | `src/index.ts` | Register POST /api/skill-assessment/:id route |

---

### Task 1: D1 Migration

**Files:**
- Create: `migrations/0010_skill_assessments.sql`

- [ ] **Step 1: Create the migration file**

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

- [ ] **Step 2: Commit**

```bash
git add migrations/0010_skill_assessments.sql
git commit -m "Add skill_assessments migration"
```

---

### Task 2: Storage Queries

**Files:**
- Modify: `src/storage/queries.ts`

- [ ] **Step 1: Add getUserSkillAssessments query**

Append to `src/storage/queries.ts`:

```typescript
/** Load all skill assessments for a user's active program as a Map<skillId, currentState>. */
export async function getUserSkillAssessments(
  db: D1Database,
  userId: string,
  programId: number
): Promise<Map<string, string>> {
  const result = await db
    .prepare("SELECT skill_id, current_state FROM skill_assessments WHERE user_id = ? AND program_id = ?")
    .bind(userId, programId)
    .all<{ skill_id: string; current_state: string }>();
  return new Map(result.results.map((r) => [r.skill_id, r.current_state]));
}
```

- [ ] **Step 2: Add upsertSkillAssessment query**

Append to `src/storage/queries.ts`:

```typescript
/** Insert or update a user's skill assessment text. */
export async function upsertSkillAssessment(
  db: D1Database,
  userId: string,
  programId: number,
  skillId: string,
  currentState: string
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO skill_assessments (user_id, program_id, skill_id, current_state)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, program_id, skill_id) DO UPDATE SET
         current_state = excluded.current_state,
         updated_at = datetime('now')`
    )
    .bind(userId, programId, skillId, currentState)
    .run();
}
```

- [ ] **Step 3: Commit**

```bash
git add src/storage/queries.ts
git commit -m "Add skill assessment storage queries"
```

---

### Task 3: Fragment Tests — currentState Display

**Files:**
- Create: `test/fragments/progress.test.ts`

- [ ] **Step 1: Write failing tests for currentState rendering**

```typescript
import { describe, it, expect } from "vitest";
import { skillCards } from "~/fragments/progress";
import type { Skill } from "~/types";

const baseSkill: Skill = {
  id: "muscle-up",
  name: "Muscle Up",
  icon: "★",
  color: "rgb(224,134,96)",
  currentState: "3-5 pull-ups. No muscle-up experience.",
  timeline: "6-9 months",
  milestones: [{ name: "8-10 strict pull-ups" }],
};

describe("skillCards", () => {
  it("renders currentState text from program default", () => {
    const html = skillCards([baseSkill]);
    expect(html).toContain("3-5 pull-ups. No muscle-up experience.");
  });

  it("does not render currentState section when skill has no currentState", () => {
    const skill: Skill = { id: "test", name: "Test" };
    const html = skillCards([skill]);
    expect(html).not.toContain("skill-current-state");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/fragments/progress.test.ts`
Expected: FAIL — skillCards does not currently render currentState text

---

### Task 4: Fragment — Render currentState

**Files:**
- Modify: `src/fragments/progress.ts`

- [ ] **Step 1: Add currentState display to skill card body**

In `src/fragments/progress.ts`, in the `skillCards` function, replace the skill card body section:

```typescript
  <div class="skill-body" data-show="$${signalName}">
    ${skill.timeline ? `<div class="skill-timeline">${escapeHtml(skill.timeline)}</div>` : ""}
    ${milestonesHtml}
  </div>
```

with:

```typescript
  <div class="skill-body" data-show="$${signalName}">
    ${currentStateHtml}
    ${skill.timeline ? `<div class="skill-timeline">${escapeHtml(skill.timeline)}</div>` : ""}
    ${milestonesHtml}
  </div>
```

where `currentStateHtml` is computed earlier in the `.map()` callback as:

```typescript
    const currentStateText = skill.currentState;
    const currentStateHtml = currentStateText
      ? `<div class="skill-current-state" id="assess-${escapeAttr(skill.id)}">
  <div class="current-state-label">Where You Are</div>
  <div class="current-state-text">${escapeHtml(currentStateText)}</div>
</div>`
      : "";
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run test/fragments/progress.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/fragments/progress.ts test/fragments/progress.test.ts
git commit -m "Render currentState on skill cards"
```

---

### Task 5: Fragment Tests — User Assessment Override

**Files:**
- Modify: `test/fragments/progress.test.ts`

- [ ] **Step 1: Write failing tests for assessment override**

Add to the `describe("skillCards")` block in `test/fragments/progress.test.ts`:

```typescript
  it("prefers user assessment over program default", () => {
    const assessments = new Map([["muscle-up", "Can do 5 strict pull-ups now."]]);
    const html = skillCards([baseSkill], assessments);
    expect(html).toContain("Can do 5 strict pull-ups now.");
    expect(html).not.toContain("3-5 pull-ups. No muscle-up experience.");
  });

  it("falls back to program default when no user assessment exists", () => {
    const assessments = new Map([["other-skill", "Some text"]]);
    const html = skillCards([baseSkill], assessments);
    expect(html).toContain("3-5 pull-ups. No muscle-up experience.");
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/fragments/progress.test.ts`
Expected: FAIL — skillCards does not accept an assessments parameter yet

---

### Task 6: Fragment — User Assessment Override

**Files:**
- Modify: `src/fragments/progress.ts`

- [ ] **Step 1: Update skillCards signature to accept assessments**

Change the function signature from:

```typescript
export function skillCards(skills: Skill[]): string {
```

to:

```typescript
export function skillCards(skills: Skill[], assessments?: Map<string, string>): string {
```

- [ ] **Step 2: Use assessment text when available**

In the `.map()` callback, change the `currentStateText` line from:

```typescript
    const currentStateText = skill.currentState;
```

to:

```typescript
    const currentStateText = assessments?.get(skill.id) ?? skill.currentState;
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `npx vitest run test/fragments/progress.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/fragments/progress.ts test/fragments/progress.test.ts
git commit -m "Prefer user assessment over program default in skill cards"
```

---

### Task 7: Fragment Tests — Edit Affordance

**Files:**
- Modify: `test/fragments/progress.test.ts`

- [ ] **Step 1: Write failing tests for edit UI**

Add to the `describe("skillCards")` block:

```typescript
  it("renders an Edit button on skills with currentState", () => {
    const html = skillCards([baseSkill]);
    expect(html).toContain("Edit");
    expect(html).toContain("editing_skill_muscle_up");
  });

  it("renders a textarea for editing pre-filled with current text", () => {
    const html = skillCards([baseSkill]);
    expect(html).toContain("textarea");
    expect(html).toContain("/api/skill-assessment/muscle-up");
  });

  it("pre-fills textarea with user assessment when available", () => {
    const assessments = new Map([["muscle-up", "Updated text."]]);
    const html = skillCards([baseSkill], assessments);
    // The signal initial value should contain the user assessment
    expect(html).toContain("Updated text.");
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/fragments/progress.test.ts`
Expected: FAIL — no edit affordance rendered yet

---

### Task 8: Fragment — Edit Affordance

**Files:**
- Modify: `src/fragments/progress.ts`

- [ ] **Step 1: Add edit signals and UI to skill cards**

In the `.map()` callback, add the edit signal name and edit HTML. The card's `data-signals:` attribute needs to include both the expand signal and the edit-mode + text signals.

Update the card return template. Replace the entire card `return` statement:

```typescript
    const editSignal = `editing_${signalName}`;
    const textSignal = `assess_${signalName}`;
    const jsText = JSON.stringify(currentStateText ?? "");

    const editHtml = currentStateText != null
      ? `<div class="skill-edit-row" data-show="!$${editSignal}">
  <button class="btn-link" data-on:click="$${editSignal} = true">Edit</button>
</div>
<div class="skill-edit-form" data-show="$${editSignal}">
  <textarea class="form-input" rows="3" data-bind:${textSignal}></textarea>
  <div class="skill-edit-actions">
    <button class="btn btn-blue btn-sm" data-on:click="@post('/api/skill-assessment/${escapeAttr(skill.id)}')">Save</button>
    <button class="btn btn-ghost btn-sm" data-on:click="$${editSignal} = false">Cancel</button>
  </div>
</div>`
      : "";

    return `<div class="skill-card" data-signals:${signalName}="${expanded}" data-signals:${editSignal}="false" data-signals:${textSignal}="${escapeAttr(jsText)}">
  <div class="skill-header" data-on:click="$${signalName} = !$${signalName}">
    <div class="skill-icon" style="${iconBg}; color:${iconColor}">${escapeHtml(skill.icon ?? "")}</div>
    <span class="skill-name">${escapeHtml(skill.name)}</span>
    ${priorityLabel ? `<span class="skill-priority">${escapeHtml(priorityLabel)}</span>` : ""}
  </div>
  <div class="skill-body" data-show="$${signalName}">
    ${currentStateHtml}
    ${editHtml}
    ${skill.timeline ? `<div class="skill-timeline">${escapeHtml(skill.timeline)}</div>` : ""}
    ${milestonesHtml}
  </div>
</div>`;
```

Note: `escapeAttr(jsText)` handles double-quote escaping for the HTML attribute. `JSON.stringify` handles JS string escaping (quotes, newlines, etc.).

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run test/fragments/progress.test.ts`
Expected: PASS

- [ ] **Step 3: Run all existing tests**

Run: `npx vitest run`
Expected: All tests pass (no regressions)

- [ ] **Step 4: Commit**

```bash
git add src/fragments/progress.ts test/fragments/progress.test.ts
git commit -m "Add inline edit affordance to skill cards"
```

---

### Task 9: Route Handler — POST /api/skill-assessment/:id

**Files:**
- Create: `src/routes/skill-assessment.ts`

- [ ] **Step 1: Create the route handler**

```typescript
import type { Env } from "../types";
import { sseResponse, patchElements } from "../sse/helpers";
import { loadProgram, upsertSkillAssessment, getUserSkillAssessments } from "../storage/queries";
import { skillCards } from "../fragments/progress";

/** POST /api/skill-assessment/:skillId — save or update a user's skill assessment */
export async function handleSkillAssessment(
  request: Request,
  env: Env,
  userId: string,
  skillId: string
): Promise<Response> {
  // Load active program to validate skill ID and get programId
  const { program, programId } = await loadProgram(env.DB, userId);

  const skill = program.skills?.find((s) => s.id === skillId);
  if (!skill) {
    return new Response("Skill not found", { status: 404 });
  }

  // Extract current_state from request body (Datastar sends signals as JSON)
  const body = (await request.json()) as Record<string, unknown>;
  const signalKey = `assess_skill_${skillId.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const currentState = typeof body[signalKey] === "string" ? (body[signalKey] as string) : undefined;

  if (!currentState || currentState.trim().length === 0) {
    return new Response("current_state is required", { status: 400 });
  }

  // Upsert the assessment
  await upsertSkillAssessment(env.DB, userId, programId, skillId, currentState.trim());

  // Return SSE response that patches the skill card
  const assessments = await getUserSkillAssessments(env.DB, userId, programId);
  const cardHtml = skillCards([skill], assessments);
  // Extract just the skill card div (strip the section header)
  const cardOnly = cardHtml.replace(`<div class="section-header">Skills</div>\n`, "");
  return sseResponse(
    patchElements(cardOnly, { selector: `[data-signals\\:skill_${skillId.replace(/[^a-zA-Z0-9]/g, "_")}]`, mode: "outer" })
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/skill-assessment.ts
git commit -m "Add POST /api/skill-assessment/:id route handler"
```

---

### Task 10: Route Registration

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Import the handler**

Add to the import block at the top of `src/index.ts`:

```typescript
import { handleSkillAssessment } from "./routes/skill-assessment";
```

- [ ] **Step 2: Register the route**

Add before the `// ── 404 ──` section in the router:

```typescript
      // ── POST /api/skill-assessment/:id ─────────────────────────
      const assessMatch = path.match(/^\/api\/skill-assessment\/([a-zA-Z0-9_-]+)$/);
      if (method === "POST" && assessMatch) {
        const skillId = decodeURIComponent(assessMatch[1]);
        return await handleSkillAssessment(request, env, auth.userId, skillId);
      }
```

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "Register skill assessment route"
```

---

### Task 11: Progress Route — Load Assessments

**Files:**
- Modify: `src/routes/progress.ts`

- [ ] **Step 1: Import getUserSkillAssessments**

Update the import in `src/routes/progress.ts`:

```typescript
import { loadProgram, getUserSkillAssessments } from "../storage/queries";
```

- [ ] **Step 2: Load assessments and pass to skillCards**

In `handleProgressSSE`, change from:

```typescript
  const { program } = await loadProgram(env.DB, userId);
```

to:

```typescript
  const { program, programId } = await loadProgram(env.DB, userId);
  const assessments = await getUserSkillAssessments(env.DB, userId, programId);
```

And change the `skillCards` call from:

```typescript
    addFragment(skillCards(program.skills));
```

to:

```typescript
    addFragment(skillCards(program.skills, assessments));
```

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/routes/progress.ts
git commit -m "Load user assessments in progress route"
```

---

### Task 12: Verify All Tests Pass

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: All tests pass including existing tests + new fragment tests

- [ ] **Step 2: TypeScript type check**

Run: `npx tsc --noEmit`
Expected: No type errors

---
