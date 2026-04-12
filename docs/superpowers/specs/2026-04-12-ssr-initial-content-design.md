# SSR Initial Content Design

**Date**: 2026-04-12
**Status**: Approved

## Problem

Pages currently render an empty `#content` div and wait for the SSE connection to populate it. This causes a blank flash on every page load. If SSE fails (D1 down, missing program), the user sees nothing.

## Approach

**Worker calls projection functions directly** (Approach A).

The GET handlers already have `env.DB` and `userId`. They call the same `build*Events()` functions the DO uses, extract the HTML, and embed it in the initial HTML response. SSE still connects immediately via `data-init` for live updates; the first SSE response idempotently morphs the same content (Datastar patchElements matches by element ID).

## Design

### HTML extraction helper

A helper in `src/index.ts` extracts HTML from `SseEvent[]`:

```ts
function eventsToHtml(events: SseEvent[]): string {
  return events
    .filter((e): e is Extract<SseEvent, { html: string }> => "html" in e)
    .map((e) => e.html)
    .join("\n");
}
```

This concatenates all fragment HTML from patch/append/error events, ignoring signals and remove events (which only matter for live updates).

### GET handler changes

Each GET handler (`/`, `/progress`, `/program`) calls the projection, extracts HTML, and passes it as pre-rendered body content:

```ts
// Example: GET /
const events = await buildTodayEvents(env.DB, auth.userId, tz);
const content = eventsToHtml(events);
return htmlResponse(htmlShell({
  title: APP_NAME,
  subtitle,
  activeTab: "today",
  ssePath: "/",
  body: `<div id="content">${content}</div>`,
}));
```

### `htmlShell` changes

Currently `body` and `ssePath` are mutually exclusive — `body` bypasses `data-init`. Change `htmlShell` so that when both are provided, `ssePath` adds `data-init` to the provided body's `#content` div. The simplest way: when `body` is provided, inject `data-init` as an attribute on the outer element.

Actually simpler: change the body construction so `body` always includes the SSE `data-init` when `ssePath` is also set. The `bodyContent` logic becomes:

```ts
const bodyContent = opts.body
  ? opts.body.replace('<div id="content">', `<div id="content"${sseAttr}>`)
  : `<div id="content"${sseAttr}></div>
    <div data-signals...></div>`;
```

### Error handling

If a projection throws, the GET handler catches and renders an inline error card — same UX the DO provides on SSE connect failure:

```ts
try {
  const events = await buildTodayEvents(env.DB, auth.userId, tz);
  content = eventsToHtml(events);
} catch (err) {
  content = `<pre style="color:var(--orange);white-space:pre-wrap;padding:16px">${escapeHtml(String(err))}</pre>`;
}
```

### The `hevyUrl` signal div

The today page has a hidden div with `data-signals:hevy-url` for the push-to-Hevy flow. This only appears on the today page and should still be included. The current `htmlShell` appends it when `body` is not provided. With SSR, the caller builds the full `body` including this div when needed.

## Files touched

- `src/index.ts` — import projections, add `eventsToHtml()`, update 3 GET handlers
- `src/fragments/layout.ts` — allow `body` + `ssePath` together

No changes to projections, session actor, or fragment builders.

## Testing

- Existing Playwright E2E tests already verify `#content` is non-empty after page load — they pass with or without SSR since they wait for content either way.
- Existing vitest tests for projections are unchanged.
- Manual verification: page content visible on first paint without waiting for SSE.
