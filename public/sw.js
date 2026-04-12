const CACHE_NAME = "hevy-planner-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

const SHELL_PAGES = ["/", "/progress", "/program", "/style.css"];

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
      .then(() => {
        // Pre-cache all pages so offline navigation works after first visit
        return caches.open(CACHE_NAME).then((cache) =>
          Promise.all(
            SHELL_PAGES.map((url) =>
              fetch(url).then((res) => {
                if (res.ok) cache.put(url, res);
              }).catch(() => {})
            )
          )
        );
      })
  );
});

const OFFLINE_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Hevy Planner — Offline</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      min-height: 100vh;
      background: #0D0D0F;
      color: #FFFFFF;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .message {
      text-align: center;
      padding: 24px;
    }
    h1 {
      font-size: 1.5rem;
      margin-bottom: 12px;
    }
    p {
      color: #A0A0A0;
      font-size: 1rem;
    }
  </style>
</head>
<body>
  <div class="message">
    <h1>Hevy Planner — Offline</h1>
    <p>You're offline. Connect to the internet to load this page.</p>
  </div>
</body>
</html>`;

const OFFLINE_BANNER =
  '<div style="background:#D97706;color:#fff;text-align:center;padding:8px;font-size:14px;">Offline — showing last saved view</div>';

async function serveCachedWithBanner(cachedResponse) {
  const text = await cachedResponse.text();
  const patched = text.replace("<body>", "<body>" + OFFLINE_BANNER);
  const headers = new Headers(cachedResponse.headers);
  return new Response(patched, { status: cachedResponse.status, headers });
}

const FETCH_TIMEOUT = 10_000;

function fetchWithTimeout(request) {
  return fetch(request, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });
}

async function fetchAndCacheNetworkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetchWithTimeout(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      return serveCachedWithBanner(cached);
    }
    return new Response(OFFLINE_PAGE, {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

async function fetchAndCacheCacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetchWithTimeout(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("", { status: 504 });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (
    request.headers.get("accept")?.includes("text/event-stream") ||
    request.method !== "GET"
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetchAndCacheNetworkFirst(request));
    return;
  }

  const url = new URL(request.url);

  if (url.hostname === "cdn.jsdelivr.net") {
    event.respondWith(fetchAndCacheCacheFirst(request));
    return;
  }

  if (url.pathname === "/style.css") {
    event.respondWith(fetchAndCacheNetworkFirst(request));
    return;
  }
});
