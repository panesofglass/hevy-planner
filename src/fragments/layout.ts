// ──────────────────────────────────────────────────────────────────
// HTML shell — full document with CSS theme, Datastar, tab bar
// ──────────────────────────────────────────────────────────────────

import { escapeHtml } from "../utils/html";

export interface HtmlShellOptions {
  title: string;
  subtitle?: string;
  activeTab?: "today" | "progress" | "program";
  /** Path for SSE data-on-load (defaults to current page path) */
  ssePath?: string;
  /** Inline body HTML (used when SSE is not needed) */
  body?: string;
}

export function htmlShell(opts: HtmlShellOptions): string {
  const activeTab = opts.activeTab ?? "today";
  const sseAttr = opts.ssePath
    ? ` data-init="@get('${opts.ssePath}', {headers: {'Accept': 'text/event-stream'}})"`
    : "";

  const bodyContent = opts.body
    ? opts.body.replace('<div id="content">', `<div id="content"${sseAttr}>`)
    : `<div id="content"${sseAttr}></div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="theme-color" content="#0D0D0F" />
  <title>${escapeHtml(opts.title)}</title>
  <link rel="manifest" href="/manifest.json" />
  <script type="module" src="https://cdn.jsdelivr.net/gh/starfederation/datastar@1.0.0-RC.8/bundles/datastar.js"></script>
  <script>
    if('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(r => r.forEach(reg => reg.unregister()));
    }
  </script>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <header class="page-header">
    <h1 class="page-title">${escapeHtml(opts.title)}</h1>
    ${opts.subtitle ? `<p class="page-subtitle">${escapeHtml(opts.subtitle)}</p>` : ""}
  </header>

  <main class="page-main">
    ${bodyContent}
    <div data-signals:hevy-url="''" data-effect="if ($hevyUrl) { window.open($hevyUrl, '_blank'); $hevyUrl = '' }" style="display:none"></div>
  </main>

  <nav class="tab-bar">
    <a href="/" class="tab-item${activeTab === "today" ? " tab-active" : ""}">
      <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
      <span class="tab-label">Today</span>
    </a>
    <a href="/progress" class="tab-item${activeTab === "progress" ? " tab-active" : ""}">
      <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
      <span class="tab-label">Progress</span>
    </a>
    <a href="/program" class="tab-item${activeTab === "program" ? " tab-active" : ""}">
      <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
      <span class="tab-label">Program</span>
    </a>
  </nav>
</body>
</html>`;
}

