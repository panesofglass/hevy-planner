# Service Worker & PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-enable the service worker with a network-first caching strategy that works with Cloudflare Access + SSE, and add PWA icons for installability.

**Architecture:** Minimal network-first SW with three strategies: network-first for HTML/CSS, cache-first for CDN-pinned Datastar JS, passthrough for SSE/mutations. Offline banner injected into cached HTML. PWA icons combine Hevy dumbbell + calendar grid.

**Tech Stack:** Service Worker API, Playwright (E2E), SVG → PNG rasterization

**Spec:** `docs/superpowers/specs/2026-04-12-service-worker-pwa-design.md`

---

### Task 1: Rewrite `public/sw.js` with network-first strategy

**Files:**
- Modify: `public/sw.js` (full rewrite)

- [ ] **Step 1: Write the install handler**

Replace the entire contents of `public/sw.js` with:

```js
const CACHE_NAME = "hevy-planner-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});
```

No precaching — cache is populated at runtime by successful fetches.

- [ ] **Step 2: Write the activate handler**

Append to `public/sw.js`:

```js
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});
```

- [ ] **Step 3: Write the offline fallback page constant**

Append to `public/sw.js`, above the fetch handler:

```js
const OFFLINE_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Hevy Planner — Offline</title>
  <style>
    body { background: #0D0D0F; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; }
    h1 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; }
    p { color: #888; font-size: 0.9rem; }
  </style>
</head>
<body>
  <div>
    <h1>You\u2019re offline</h1>
    <p>Connect to the internet to load this page.</p>
  </div>
</body>
</html>`;

const OFFLINE_BANNER = '<div style="background:#D97706;color:#fff;text-align:center;padding:8px;font-size:14px;">Offline \u2014 showing last saved view</div>';
```

- [ ] **Step 4: Write the helper to inject the offline banner into cached HTML**

Append to `public/sw.js`:

```js
async function serveCachedWithBanner(cachedResponse) {
  const html = await cachedResponse.text();
  const injected = html.replace("<body>", "<body>" + OFFLINE_BANNER);
  return new Response(injected, {
    status: cachedResponse.status,
    statusText: cachedResponse.statusText,
    headers: cachedResponse.headers,
  });
}
```

- [ ] **Step 5: Write the network-first fetch helper**

Append to `public/sw.js`:

```js
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return serveCachedWithBanner(cached);
    return new Response(OFFLINE_PAGE, {
      status: 503,
      headers: { "Content-Type": "text/html" },
    });
  }
}
```

- [ ] **Step 6: Write the cache-first fetch helper**

Append to `public/sw.js`:

```js
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}
```

- [ ] **Step 7: Write the fetch event handler**

Append to `public/sw.js`:

```js
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Passthrough: SSE, non-GET
  if (
    request.headers.get("accept")?.includes("text/event-stream") ||
    request.method !== "GET"
  ) {
    return;
  }

  // Cache-first: version-pinned CDN assets
  const url = new URL(request.url);
  if (url.hostname === "cdn.jsdelivr.net") {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Network-first: navigations and style.css
  if (request.mode === "navigate" || url.pathname === "/style.css") {
    event.respondWith(networkFirst(request));
    return;
  }

  // Everything else: passthrough
});
```

- [ ] **Step 8: Verify the complete file**

Read `public/sw.js` end-to-end and verify:
- `CACHE_NAME` at top
- `install` handler with `skipWaiting()`
- `activate` handler purging old caches + `clients.claim()`
- `OFFLINE_PAGE` and `OFFLINE_BANNER` constants
- `serveCachedWithBanner()`, `networkFirst()`, `cacheFirst()` helpers
- `fetch` handler with SSE passthrough, CDN cache-first, navigation/CSS network-first, default passthrough

- [ ] **Step 9: Commit**

```bash
git add public/sw.js
git commit -m "Rewrite service worker with network-first strategy (#36)"
```

---

### Task 2: Update `layout.ts` — register SW, add apple-touch-icon

**Files:**
- Modify: `src/fragments/layout.ts:36-43`

- [ ] **Step 1: Replace the unregister script with register + add apple-touch-icon**

In `src/fragments/layout.ts`, replace lines 36-43:

```typescript
  <link rel="manifest" href="/manifest.json" />
  <script type="module" src="https://cdn.jsdelivr.net/gh/starfederation/datastar@1.0.0-RC.8/bundles/datastar.js"></script>
  <script>
    if('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(r => r.forEach(reg => reg.unregister()));
    }
  </script>
  <link rel="stylesheet" href="/style.css">
```

With:

```typescript
  <link rel="manifest" href="/manifest.json" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <script type="module" src="https://cdn.jsdelivr.net/gh/starfederation/datastar@1.0.0-RC.8/bundles/datastar.js"></script>
  <script>
    if('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  </script>
  <link rel="stylesheet" href="/style.css">
```

Changes:
- Added `<link rel="apple-touch-icon">` after manifest link
- Replaced `getRegistrations().then(r => r.forEach(reg => reg.unregister()))` with `register('/sw.js')`

- [ ] **Step 2: Commit**

```bash
git add src/fragments/layout.ts
git commit -m "Register service worker and add apple-touch-icon link (#36)"
```

---

### Task 3: Create PWA icon SVG composite and rasterize to PNGs

**Files:**
- Create: `public/icon.svg` (composite: Hevy dumbbell + calendar grid)
- Create: `public/icon-192.png`
- Create: `public/icon-512.png`
- Create: `public/icon-maskable-512.png`
- Create: `public/apple-touch-icon.png`
- Reference: `public/hevy-logo.svg` (source Hevy dumbbell, already in repo)

- [ ] **Step 1: Create the composite SVG icon**

Create `public/icon.svg` — the Hevy dumbbell logo (white stroke on dark background) with a small calendar grid in the lower-right corner, slightly overlapping. The calendar grid is a simple 3x3 grid of small squares.

The source dumbbell SVG (`public/hevy-logo.svg`) has a 48x48 viewBox with class `c` styling (`fill:none; stroke:#000; stroke-linecap:round; stroke-linejoin:round`). For the icon we need:
- Dark background (#0D0D0F) filling the full canvas
- Dumbbell path recolored to white stroke
- Calendar grid in lower-right at roughly 30% of icon size

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <!-- Background -->
  <rect width="512" height="512" rx="80" fill="#0D0D0F"/>

  <!-- Hevy dumbbell — scaled from 48x48 to fit ~340x340, centered with slight upward offset -->
  <g transform="translate(86, 56) scale(7.08)" fill="none" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="m30.4809,29.4472v7.0532c0,1.8395,1.7614,3.167,3.5297,2.6602l6.5242-1.8697c1.5319-.439,2.6119-1.8002,2.6835-3.3921.1205-2.6811.2817-6.8836.2817-10.1869,0-3.1332-.182-6.4889-.3299-8.698-.1004-1.5006-1.0934-2.7908-2.5189-3.2702l-7.4323-2.4993c-1.5709-.5283-3.1969.6404-3.1969,2.2977v4.5241c0,2.6496-1.3709,5.1106-3.6237,6.5052l-4.7966,2.9693c-2.2529,1.3946-3.6237,3.8556-3.6237,6.5052v4.0467c0,1.892-1.8561,3.226-3.6494,2.623l-6.9797-2.3472c-1.4255-.4794-2.4185-1.7696-2.5189-3.2702-.1479-2.2091-.3299-5.5648-.3299-8.698,0-3.3033.1612-7.5058.2817-10.1869.0716-1.5919,1.1516-2.9531,2.6835-3.3921l6.9619-1.9952c1.549-.4439,3.092.719,3.092,2.3304v7.5085"/>
  </g>

  <!-- Calendar grid — lower right, 3x3 grid -->
  <g transform="translate(340, 340)">
    <!-- Calendar background -->
    <rect width="140" height="140" rx="16" fill="#1C1C1E" stroke="#333" stroke-width="2"/>
    <!-- Header bar -->
    <rect x="0" y="0" width="140" height="32" rx="16" fill="#D97706"/>
    <rect x="0" y="16" width="140" height="16" fill="#D97706"/>
    <!-- Grid cells: 3 columns x 3 rows -->
    <rect x="16" y="44" width="28" height="24" rx="4" fill="#333"/>
    <rect x="56" y="44" width="28" height="24" rx="4" fill="#333"/>
    <rect x="96" y="44" width="28" height="24" rx="4" fill="#333"/>
    <rect x="16" y="78" width="28" height="24" rx="4" fill="#333"/>
    <rect x="56" y="78" width="28" height="24" rx="4" fill="#FFFFFF"/>
    <rect x="96" y="78" width="28" height="24" rx="4" fill="#333"/>
    <rect x="16" y="112" width="28" height="24" rx="4" fill="#333"/>
    <rect x="56" y="112" width="28" height="24" rx="4" fill="#333"/>
    <rect x="96" y="112" width="28" height="24" rx="4" fill="#333"/>
  </g>
</svg>
```

The center cell of the grid is white to suggest "today." The calendar header bar is amber (#D97706) matching the app's accent color.

- [ ] **Step 2: Create the maskable SVG variant**

Create `public/icon-maskable.svg` — same design but with extra padding so the safe zone (inner 80%) contains all content. Scale the content to fit within the inner 80% (roughly 410x410 centered in 512x512):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <!-- Full bleed background — no rounded corners, maskable needs edge-to-edge -->
  <rect width="512" height="512" fill="#0D0D0F"/>

  <!-- Content scaled to 80% and centered (51px inset on each side) -->
  <g transform="translate(51, 51) scale(0.8)">
    <!-- Hevy dumbbell -->
    <g transform="translate(86, 56) scale(7.08)" fill="none" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="m30.4809,29.4472v7.0532c0,1.8395,1.7614,3.167,3.5297,2.6602l6.5242-1.8697c1.5319-.439,2.6119-1.8002,2.6835-3.3921.1205-2.6811.2817-6.8836.2817-10.1869,0-3.1332-.182-6.4889-.3299-8.698-.1004-1.5006-1.0934-2.7908-2.5189-3.2702l-7.4323-2.4993c-1.5709-.5283-3.1969.6404-3.1969,2.2977v4.5241c0,2.6496-1.3709,5.1106-3.6237,6.5052l-4.7966,2.9693c-2.2529,1.3946-3.6237,3.8556-3.6237,6.5052v4.0467c0,1.892-1.8561,3.226-3.6494,2.623l-6.9797-2.3472c-1.4255-.4794-2.4185-1.7696-2.5189-3.2702-.1479-2.2091-.3299-5.5648-.3299-8.698,0-3.3033.1612-7.5058.2817-10.1869.0716-1.5919,1.1516-2.9531,2.6835-3.3921l6.9619-1.9952c1.549-.4439,3.092.719,3.092,2.3304v7.5085"/>
    </g>

    <!-- Calendar grid -->
    <g transform="translate(340, 340)">
      <rect width="140" height="140" rx="16" fill="#1C1C1E" stroke="#333" stroke-width="2"/>
      <rect x="0" y="0" width="140" height="32" rx="16" fill="#D97706"/>
      <rect x="0" y="16" width="140" height="16" fill="#D97706"/>
      <rect x="16" y="44" width="28" height="24" rx="4" fill="#333"/>
      <rect x="56" y="44" width="28" height="24" rx="4" fill="#333"/>
      <rect x="96" y="44" width="28" height="24" rx="4" fill="#333"/>
      <rect x="16" y="78" width="28" height="24" rx="4" fill="#333"/>
      <rect x="56" y="78" width="28" height="24" rx="4" fill="#FFFFFF"/>
      <rect x="96" y="78" width="28" height="24" rx="4" fill="#333"/>
      <rect x="16" y="112" width="28" height="24" rx="4" fill="#333"/>
      <rect x="56" y="112" width="28" height="24" rx="4" fill="#333"/>
      <rect x="96" y="112" width="28" height="24" rx="4" fill="#333"/>
    </g>
  </g>
</svg>
```

- [ ] **Step 3: Rasterize SVGs to PNGs**

Use `rsvg-convert` (from `librsvg`) or `sips` (macOS built-in) to produce PNGs. Using `rsvg-convert`:

```bash
# Install if needed
brew list librsvg || brew install librsvg

# Standard icons from icon.svg
rsvg-convert -w 512 -h 512 public/icon.svg -o public/icon-512.png
rsvg-convert -w 192 -h 192 public/icon.svg -o public/icon-192.png

# Apple touch icon (180x180) from icon.svg
rsvg-convert -w 180 -h 180 public/icon.svg -o public/apple-touch-icon.png

# Maskable icon from maskable variant
rsvg-convert -w 512 -h 512 public/icon-maskable.svg -o public/icon-maskable-512.png
```

If `rsvg-convert` is not available, use the `resvg` npm package:

```bash
npx resvg-cli public/icon.svg public/icon-512.png -w 512 -h 512
npx resvg-cli public/icon.svg public/icon-192.png -w 192 -h 192
npx resvg-cli public/icon.svg public/apple-touch-icon.png -w 180 -h 180
npx resvg-cli public/icon-maskable.svg public/icon-maskable-512.png -w 512 -h 512
```

- [ ] **Step 4: Verify all PNGs exist and have correct dimensions**

```bash
file public/icon-192.png public/icon-512.png public/icon-maskable-512.png public/apple-touch-icon.png
```

Expected: each shows `PNG image data, <width> x <height>` with correct sizes.

- [ ] **Step 5: Commit**

```bash
git add public/icon.svg public/icon-maskable.svg public/icon-192.png public/icon-512.png public/icon-maskable-512.png public/apple-touch-icon.png
git commit -m "Add PWA icons: Hevy dumbbell + calendar grid (#36)"
```

---

### Task 4: Update `public/manifest.json` with icons

**Files:**
- Modify: `public/manifest.json`

- [ ] **Step 1: Add the icons array to manifest.json**

Replace the entire contents of `public/manifest.json` with:

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

- [ ] **Step 2: Commit**

```bash
git add public/manifest.json
git commit -m "Add PWA icon entries to manifest.json (#36)"
```

---

### Task 5: E2E tests for service worker behavior

**Files:**
- Create: `test/e2e/pwa.spec.ts`

- [ ] **Step 1: Write SW registration test**

Create `test/e2e/pwa.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";
import { seedDatabase } from "./helpers";

test.describe("PWA & Service Worker", () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await seedDatabase(page);
    } catch {
      // Seed may fail if user already exists
    } finally {
      await page.close();
    }
  });

  test("service worker registers successfully", async ({ page }) => {
    await page.goto("/");

    // Wait for SW to register and activate
    const swState = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return "unsupported";
      const reg = await navigator.serviceWorker.getRegistration("/");
      if (!reg) return "not-registered";
      // Wait for active worker
      const sw = reg.active || reg.waiting || reg.installing;
      if (!sw) return "no-worker";
      if (sw.state === "activated") return "activated";
      return new Promise<string>((resolve) => {
        sw.addEventListener("statechange", () => {
          if (sw.state === "activated") resolve("activated");
        });
        setTimeout(() => resolve(sw.state), 5000);
      });
    });

    expect(swState).toBe("activated");
  });

  test("manifest has required icon entries", async ({ page }) => {
    const response = await page.request.get("/manifest.json");
    expect(response.ok()).toBe(true);
    const manifest = await response.json();

    expect(manifest.icons).toHaveLength(3);
    expect(manifest.icons).toContainEqual(
      expect.objectContaining({ sizes: "192x192", type: "image/png" })
    );
    expect(manifest.icons).toContainEqual(
      expect.objectContaining({ sizes: "512x512", type: "image/png", purpose: "maskable" })
    );
  });

  test("icon files are served correctly", async ({ page }) => {
    for (const path of ["/icon-192.png", "/icon-512.png", "/icon-maskable-512.png", "/apple-touch-icon.png"]) {
      const response = await page.request.get(path);
      expect(response.ok(), `${path} should return 200`).toBe(true);
      expect(response.headers()["content-type"]).toContain("image/png");
    }
  });

  test("SSE requests are not intercepted by service worker", async ({ page }) => {
    await page.goto("/");

    // Wait for SSE content to appear — proves SSE passthrough works
    await expect(page.locator("#content")).not.toBeEmpty({ timeout: 10_000 });
  });

  test("style.css is served correctly", async ({ page }) => {
    const response = await page.request.get("/style.css");
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("text/css");
  });
});
```

- [ ] **Step 2: Run the tests to verify they pass**

```bash
npx playwright test test/e2e/pwa.spec.ts --reporter=list
```

Expected: all 5 tests pass.

- [ ] **Step 3: Commit**

```bash
git add test/e2e/pwa.spec.ts
git commit -m "Add E2E tests for PWA service worker and manifest (#36)"
```

---

### Task 6: Clean up source SVG and verify deployment

**Files:**
- Delete: `public/hevy-logo.svg` (source file, not needed in production)

- [ ] **Step 1: Remove the source Hevy logo SVG**

The `hevy-logo.svg` was a working file for icon creation. The composite `icon.svg` and `icon-maskable.svg` are the actual assets used. Remove the source:

```bash
rm public/hevy-logo.svg
```

- [ ] **Step 2: Run the full E2E test suite**

```bash
npx playwright test --reporter=list
```

Expected: all tests pass, including the new `pwa.spec.ts` tests.

- [ ] **Step 3: Run the vitest domain tests**

```bash
npx vitest run
```

Expected: all 98+ domain tests pass (no SW changes affect domain logic).

- [ ] **Step 4: Commit cleanup**

```bash
git add -u
git commit -m "Remove source hevy-logo.svg after icon rasterization (#36)"
```

- [ ] **Step 5: Verify local dev with SW active**

```bash
npm run dev
```

Open `http://localhost:8787` in Chrome. In DevTools:
1. **Application → Service Workers** — verify "hevy-planner" SW is registered and activated
2. **Application → Manifest** — verify icons appear with correct sizes
3. **Application → Cache Storage** — after navigating all pages, verify `hevy-planner-v1` cache contains `/`, `/progress`, `/program`, `/style.css`
4. **Network → Offline checkbox** — verify cached pages load with amber "Offline" banner
5. **Network → Offline + visit uncached page** — verify hardcoded offline fallback page appears
