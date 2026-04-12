# Service Worker Redesign for SSE Architecture + Cloudflare Access

**Date**: 2026-04-12
**Issue**: #36
**Status**: Design approved

## Problem

The service worker is disabled (auto-unregistered on every page load) because cache-first strategy broke with Cloudflare Access + SSE architecture. The manifest lacks icons, preventing "Add to Home Screen" prompts.

## Decisions

| Question | Decision |
|----------|----------|
| Offline experience | Last-known-good cached pages + offline indicator banner |
| Cloudflare Access interaction | Network-first for HTML solves it — Access auth happens on network fetch, cached pages are fallback only |
| Datastar JS caching | Keep CDN, cache on first load (version-pinned URL = effectively immutable) |
| Icon design | Hevy dumbbell logo + calendar grid overlay in lower-right corner |
| Cache versioning for style.css | Network-first (same as HTML) — no versioning needed |
| Install prompt | Native browser prompt only — no custom banner |

## Architecture: Minimal Network-First SW

### Caching Strategy

Three request categories:

**Network-first** (HTML pages + CSS):
- Matches: navigations (`request.mode === 'navigate'`) and `/style.css`
- Try `fetch()` → on success, clone into cache, return response
- On network failure → serve cached copy (last-known-good)
- If no cache either → return hardcoded offline fallback page

**Cache-first** (immutable CDN assets):
- Matches: `cdn.jsdelivr.net` requests (version-pinned Datastar JS)
- Check cache → hit: return; miss: fetch, cache, return

**Passthrough** (everything else):
- SSE requests (`Accept: text/event-stream`) — no interception
- POST/PUT/DELETE — no interception
- Any other request — no interception

### Lifecycle

**Install**: No precaching. `skipWaiting()` to activate immediately.

**Activate**: Delete old caches (any name !== current `CACHE_NAME`). `clients.claim()` to take control.

**Cache naming**: `hevy-planner-v1`. Bump version to force full cache clear. Old caches purged on activate.

**Update flow**: Browser detects new `sw.js` via byte-diff, installs in background, `skipWaiting()` activates immediately, old caches purged. No user-facing update prompt.

### Registration

Replace the unregister script in `layout.ts:38-42` with:

```js
if('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

## Offline Behavior

### Cached page with banner (primary case)

When serving a cached HTML page because the network is down, the SW injects an offline indicator after `<body>`:

```html
<div style="background:#D97706;color:#fff;text-align:center;padding:8px;font-size:14px;">
  Offline — showing last saved view
</div>
```

Amber (#D97706) matches existing error card styling. Inline styles since CSS may also be from cache.

Implementation: read cached response body as text, insert banner after `<body>`, return new `Response` with same headers.

### Cold offline (no cache)

If a page has never been visited and network is down, return a self-contained offline page hardcoded in the SW:
- Dark theme (#0D0D0F background, white text)
- App name, message: "You're offline. Connect to the internet to load this page."
- No external dependencies (no CSS, no Datastar, no icons)

### SSE when offline

SSE connections fail to establish. Datastar handles this — the `data-init` GET won't connect, cached SSR content remains visible. User refreshes when connectivity returns.

### No offline mutations

POST/PUT/DELETE pass through and fail with network error. No offline queue — keeps things simple and honest.

## PWA Icons & Manifest

### Icon design

Simplified Hevy dumbbell logo with a small calendar grid overlapping the lower-right corner. Dark background (#0D0D0F), white/light iconography.

**Source**: Hevy logo SVG from https://www.svgrepo.com/svg/516864/hevy — will need manual download (site blocks automated fetch).

### Required assets

| File | Size | Purpose |
|------|------|---------|
| `public/icon-192.png` | 192x192 | Manifest standard icon |
| `public/icon-512.png` | 512x512 | Manifest large icon / splash |
| `public/icon-maskable-512.png` | 512x512 | Android adaptive icon (extra safe-zone padding) |
| `public/apple-touch-icon.png` | 180x180 | iOS home screen |

### Manifest changes

```json
{
  "name": "Hevy Planner",
  "short_name": "Planner",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0D0D0F",
  "theme_color": "#0D0D0F",
  "description": "Training companion for Hevy — scheduling, reflow, and skill tracking",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### Layout changes

Add to `<head>` in `layout.ts`:

```html
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

## Files Changed

| File | Change |
|------|--------|
| `public/sw.js` | Full rewrite — network-first strategy |
| `public/manifest.json` | Add icons array |
| `public/icon-192.png` | New — standard icon |
| `public/icon-512.png` | New — large icon |
| `public/icon-maskable-512.png` | New — maskable icon |
| `public/apple-touch-icon.png` | New — iOS icon |
| `src/fragments/layout.ts` | Replace unregister with register, add apple-touch-icon link |

## Testing

- Verify SW registers successfully (DevTools → Application → Service Workers)
- Navigate all pages online to populate cache
- Go offline (DevTools → Network → Offline), verify cached pages load with amber banner
- Visit uncached page offline, verify hardcoded fallback page
- Verify SSE passthrough — SSE connections work normally when online
- Verify POST/PUT/DELETE passthrough — mutations work normally
- Verify Datastar JS is cached from CDN on first visit
- Verify manifest icons appear in DevTools → Application → Manifest
- Test "Add to Home Screen" on mobile (or Lighthouse PWA audit)
- Deploy, verify Cloudflare Access auth still works with SW active
