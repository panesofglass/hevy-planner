# SSE Architecture: Adopt Official SDK + Separate Communication Channels

## Problem

The current SSE implementation is broken in two ways:

1. **Not streaming.** Every route builds SSE events as strings and returns them via `new Response(body)` — a closed, static response. Datastar expects a `ReadableStream`. It "mostly works" because the browser's SSE parser can extract events from a closed body, but it causes unreliable behavior.

2. **Commands and queries are coupled.** POST handlers (sync, complete, setup) do mutations *and* build SSE responses in the same function. The original design intent was: POST returns 202, a separate SSE stream pushes UI updates. What was built instead: POST returns a static SSE response containing the entire page state.

## Solution

Adopt the official `@starfederation/datastar-sdk` (web export, WinterCG target) and restructure into two separated communication channels using a Durable Object as a broadcast actor.

## Architecture

### Communication Channels

**Command channel** — POST/PUT/DELETE requests handled by the Worker:
- Validate input (return 4xx on failure)
- Perform mutations (D1 writes, Hevy API calls)
- Send a message to the Durable Object to broadcast result fragments
- Return 202

**Query channel** — SSE stream held by the Durable Object:
- Browser opens SSE connection to `GET /` with `Accept: text/event-stream`
- Worker proxies to the DO via `stub.fetch()`
- DO projects current state from D1 as progressive fragment patches via `ServerSentEventGenerator.stream()`
- DO holds connection open, forwarding broadcast messages from command handlers
- On disconnect (Safari background, network), Datastar reconnects via `retry`; DO re-projects current state

```
Browser                        Worker                      Durable Object
-------                        ------                      --------------
GET /           -------------> HTML shell (static)
                                (data-on:load triggers SSE)

GET / (SSE)     -------------> proxy to DO  -------------> subscribe, project state
                <------------------------------------------  stream fragments

POST /api/sync  -------------> validate
                                mutate D1
                                call Hevy API
                                send to DO   -------------> broadcast(fragments)
                <-- 202 ------                              --> stream to browser
```

### Content Negotiation

`GET /` uses the `Accept` header to determine response type:
- `text/html` — Worker returns HTML shell directly
- `text/event-stream` — Worker proxies to DO for SSE stream

This is the existing pattern in the router. Only `/` needs SSE.

### Static Pages

`/progress`, `/program`, `/routine/:id` do not need SSE. They read from D1 once and render. These become plain server-rendered HTML responses from the Worker — no content negotiation, no DO involvement.

POST handlers on these pages (log-benchmark, skill-assessment, advance-phase) mutate D1 and return 202. The Datastar action attribute chains a page re-fetch after the POST (e.g., `@post('/api/log-benchmark/x')` followed by re-navigation or a `@get` to refresh the section).

## Durable Object: SessionActor

One DO class, keyed per user ID. Three responsibilities:

1. **Hold the SSE stream** — uses `ServerSentEventGenerator.stream()` from the SDK. On connect, projects current state from D1 (today's queue, CARs status, completed items, upcoming). Streams fragments progressively.

2. **Receive broadcast messages** — command handlers send fragments to the DO via `stub.fetch()`. DO pushes them to all connected SSE streams.

3. **Die when idle** — no connections, no messages, DO gets evicted. Next interaction spins it up fresh.

The DO does NOT:
- Run domain logic (stays in `src/domain/`)
- Mutate D1 (commands do that in the Worker)
- Call the Hevy API (Worker handles that)

It is purely a message bus with a stream attached.

### Cost

Option 2 (long-lived SSE, no hibernation) is used. DO holds the stream open for the session duration. Safari kills the connection when backgrounded, Datastar reconnects when foregrounded.

At 128MB DO memory and ~30-minute workout sessions: ~225 GB-s per session. Free tier includes 400,000 GB-s/month (~1,778 sessions). Cost is effectively zero for personal use. If cost becomes an issue with many users, switch to short-lived SSE with intentional disconnect after broadcast — no architectural change required.

Note: DO hibernation only works with WebSockets, not SSE. SSE connections keep the DO alive.

### Reference Implementation

The canonical pattern is in `~/Code/frank/sample/Frank.Datastar.Hox/Program.fs`:
- `SseEvent` discriminated union with `subscribe`/`broadcast`/`unsubscribe`
- Single `/sse` resource holds the connection, forwards events from a channel
- All other resources are fire-and-forget: mutate state, broadcast result, return 202/4xx
- F#'s `MailboxProcessor` (actor) is the equivalent of the DO

## SDK Integration

Install `@starfederation/datastar-sdk` as the first runtime dependency. Use the `web` export (WinterCG APIs: `ReadableStream`, `Response`, `Request`).

The SDK lives exclusively in the DO:
- `ServerSentEventGenerator.stream()` for SSE connections
- `sse.patchElements()`, `sse.patchSignals()`, `sse.executeScript()` for broadcasting
- `ServerSentEventGenerator.readSignals()` for parsing Datastar signals from POST bodies (future: migrate forms to signals pattern)

The Worker never imports the SDK. Command handlers validate, mutate, and message the DO.

Delete `src/sse/helpers.ts` and `src/utils/sse.ts`. Everything they did is replaced by the SDK.

`isSSERequest()` remains as a one-liner in the router for content negotiation on `/`.

## Error Handling

**At the gate (Worker):**
- Auth failure -> 401
- Malformed request / validation failure -> 400
- Resource not found -> 404

These return before mutation. No SSE involved.

**During processing (Worker, post-acceptance):**
- Hevy API failure, D1 error, etc. -> Worker sends an error fragment to the DO to broadcast over the stream
- The 202 has already been returned; the SSE stream is the error channel for post-acceptance failures
- Error fragments use the existing orange-text card pattern patched into `#content`

**SSE connection failures:**
- Stream drops -> Datastar reconnects via `retry`, DO re-projects current state
- No error shown to user

## Route Migration

### Today (`/`) — SSE route

Current: `handleTodaySSE` builds all fragments as strings, returns `sseResponse(mergeFragments(...))`.

New: DO's connect handler does the same D1 reads but streams them progressively. CARs card first, hero routine, completed section, upcoming — each as a separate `sse.patchElements()` call. User sees content incrementally.

### POST handlers — fire and forget

Current: e.g., `handlePull` calls Hevy API, marks completions, then calls `handleTodaySSE` to build a full page SSE response.

New: `handlePull` calls Hevy API, marks completions, sends a message to DO with updated fragments. Returns 202. DO broadcasts to open stream.

### Static pages — simplify

`/progress`, `/program`, `/routine/:id` drop SSE entirely. Worker reads D1, renders full HTML, returns it. Fragment builders get wrapped in the HTML shell directly.

### POST handlers on static pages

log-benchmark, skill-assessment, advance-phase: mutate D1, return 202. Datastar action chains a `@get` or re-navigation to refresh the page with updated state.

### Future: Signals for forms

Align with Datastar's signal-based form pattern (as in Frank samples). `data-bind` on inputs keeps signals in sync; POST handlers read signals via SDK's `readSignals()`. Not blocking the migration, but noted as a convention change.

## Testing

### Remove

- `test-e2e.sh` — deleted after its test scenarios are ported to Playwright
- `test/sse/helpers.test.ts` — covers code replaced by the SDK

### Add: Playwright browser tests

Port all test intent from `test-e2e.sh` (benchmark logging, phase advancement, skill assessments, sync) into Playwright tests that verify behavior through the browser. Add new tests for the architecture:

- Page load -> SSE connects -> today's queue renders progressively
- POST /api/sync -> 202 -> stream pushes updated completion state
- POST /api/complete/:id -> 202 -> hero card updates
- SSE disconnect -> reconnect -> state re-projects correctly
- POST with bad input -> 400 (not 202)
- POST without auth -> 401

### Architectural assertions

- POST handlers never return `text/event-stream` content-type
- POST handlers return 202 on success
- Only `GET /` with `Accept: text/event-stream` produces an SSE stream

### Keep

Domain unit tests (vitest) — pure functions, no changes needed.
