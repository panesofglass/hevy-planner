# Missing CSS Classes & Loading Indicators Design

**Date**: 2026-04-12
**Status**: Approved
**Issues**: #37, #38

## Problem

1. ~25 CSS classes are referenced in fragment HTML but undefined in the stylesheet. The Progress page is half-unstyled.
2. POST actions have zero loading feedback — no disabled state, no spinner, no "loading" text.

## #37: Missing CSS Classes

All classes added to `CSS_THEME` in `src/fragments/layout.ts`. Follow existing patterns: dark card backgrounds, accent color semantics (blue=action, green=success, orange=warning, purple=tags), 13-15px body text, 11-12px labels.

### Completed items (today.ts)

- `.completed-header` — `display:flex; align-items:center; gap:10px` (replaces the flex layout that `.completed-item` used to provide directly — the HTML now nests a header inside the item)
- `.workout-details` — `<details>` element. Margin-top, no default marker.
- `.workout-summary` — Clickable summary. 13px, blue color, cursor pointer. Custom disclosure triangle or caret.
- `.workout-exercises` — Container. Padding-top 8px.
- `.workout-exercise` — Flex row. 13px, padding 4px 0.
- `.workout-ex-name` — Secondary color, flex 1.
- `.workout-ex-sets` — Tertiary color, 12px, no-wrap.

### Gate tests (progress.ts roadmapSection)

- `.gate-checklist` — Container. Margin-top 10px, font-size 13px.
- `.gate-item` — Single gate line. Padding 4px 0, flex with gap.
- `.gate-passed` — Green color for check icon + name.
- `.gate-not-passed` — Orange color for X icon + name.
- `.gate-all-passed` — Green text, bold, margin-top 8px. Callout style matching coaching-callout pattern (green-tinted background, border-radius, padding).

### Skill assessments (progress.ts skillCardHtml)

- `.skill-current-state` — "Where You Are" block. Subtle background `rgba(255,255,255,0.04)`, border-radius, padding 10px 12px, margin-bottom 12px.
- `.current-state-label` — 11px, uppercase, tertiary color, letter-spacing 0.5px, margin-bottom 4px.
- `.current-state-text` — 14px, secondary color, line-height 1.45.
- `.skill-edit-row` — Margin-top 8px, text-align right.
- `.skill-edit-form` — Margin-top 8px.
- `.skill-edit-actions` — Flex, gap 8px, margin-top 8px.

### Benchmarks (progress.ts benchmarkCard)

- `.benchmark-trend` — 13px, secondary color.
- `.benchmark-last-tested` — 12px, tertiary color, margin-top 4px.
- `.benchmark-retest` — 12px, orange color, font-weight 600, margin-top 4px.
- `.benchmark-retest-info` — 12px, tertiary color, margin-top 4px.

### Shared buttons

- `.btn-sm` — Smaller variant: padding 6px 14px, font-size 13px, min-height 44px (iOS touch target).
- `.btn-primary` — Same as `.btn-blue` (green could confuse with success state; keep primary = blue).
- `.btn-link` — Text-only button: no background, blue color, no border, padding 8px 4px (min 44px touch target via line-height + padding), cursor pointer.

### Template card selected state

- `.selected` — Border: `1px solid var(--blue)`, subtle blue background tint `rgba(55,125,255,0.08)`.

### Disabled button

- `.btn[disabled]` — `opacity: 0.5; pointer-events: none;`

## #38: Loading Indicators

Uses Datastar's `data-indicator` attribute: creates a boolean signal that is `true` while a fetch is in flight.

### Pattern

```html
<button data-on:click="@post('/api/...')"
        data-indicator:_signalName
        data-attr:disabled="$_signalName">
  <span data-show="!$_signalName">Button Text</span>
  <span data-show="$_signalName">Loading…</span>
</button>
```

### Signal map

| Fragment | Button | Signal | Loading text |
|----------|--------|--------|-------------|
| today.ts carsCard | Push to Hevy | `_pushingDaily` | "Pushing..." |
| today.ts heroRoutineCard | Push to Hevy | `_pushingHero` | "Pushing..." |
| today.ts syncButton | Sync from Hevy | `_syncing` | "Syncing..." |
| today.ts syncButton | Enable auto-sync | `_registering` | "Enabling..." |
| today.ts syncButton | Disable | `_unregistering` | "Disabling..." |
| progress.ts skillCardHtml | Save assessment | `_savingAssess_{id}` | "Saving..." |
| progress.ts benchmarkCard | Save benchmark | `_savingBench_{id}` | "Saving..." |
| progress.ts roadmapSection | Advance Phase | `_advancing` | "Advancing..." |
| program.ts importProgramSection | Validate & Preview | `_validating` | "Validating..." |
| program.ts importProgramSection | Apply Program | `_importing` | "Importing..." |
| program.ts programLibrarySection | Switch To | `_switching_{id}` | "Switching..." |
| program.ts programLibrarySection | Delete | `_deleting_{id}` | "Deleting..." |

Signal names with `_{id}` are per-instance (e.g., `_savingBench_hip_ir` for a benchmark with id `hip_ir`). The id is sanitized to alphanumeric + underscore (same pattern as existing `sig` variables in the fragments).

### Buttons that already link externally (not POST)

"Open in Hevy" (`<a>` tag when already pushed) does NOT need an indicator — it's a plain link.

## Files touched

- `src/fragments/layout.ts` — Add all CSS class definitions to `CSS_THEME`
- `src/fragments/today.ts` — Add loading indicators to Push, Sync, Enable/Disable buttons
- `src/fragments/progress.ts` — Add indicators to Save, Advance buttons; fix `.completed-item` CSS for new structure
- `src/fragments/program.ts` — Add indicators to Validate, Apply, Switch, Delete buttons

## Testing

- Existing Playwright E2E tests verify pages render content — no new tests needed for CSS.
- Vitest unchanged (fragments are pure functions).
- Manual verification via Playwright screenshots (before/after comparison).
