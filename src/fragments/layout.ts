// ──────────────────────────────────────────────────────────────────
// HTML shell — full document with CSS theme, Datastar, tab bar
// ──────────────────────────────────────────────────────────────────

export interface HtmlShellOptions {
  title: string;
  subtitle?: string;
  activeTab?: "today" | "progress";
  /** Path for SSE data-on-load (defaults to current page path) */
  ssePath?: string;
  /** Inline body HTML (used when SSE is not needed) */
  body?: string;
}

export function htmlShell(opts: HtmlShellOptions): string {
  const activeTab = opts.activeTab ?? "today";
  const sseAttr = opts.ssePath
    ? ` data-on:load="@get('${opts.ssePath}')"`
    : "";

  const bodyContent = opts.body
    ? opts.body
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
  <script type="module" src="https://cdn.jsdelivr.net/npm/@starfederation/datastar@1"></script>
  <script>if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');</script>
  <style>${CSS_THEME}</style>
</head>
<body>
  <header class="page-header">
    <h1 class="page-title">${escapeHtml(opts.title)}</h1>
    ${opts.subtitle ? `<p class="page-subtitle">${escapeHtml(opts.subtitle)}</p>` : ""}
  </header>

  <main class="page-main">
    ${bodyContent}
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
  </nav>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const CSS_THEME = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

:root {
  --bg: #0D0D0F;
  --card: #1C1C1E;
  --text: #FFFFFF;
  --text-secondary: #AEAEB2;
  --text-tertiary: #8E8E93;
  --separator: rgba(255,255,255,0.06);
  --blue: #377DFF;
  --green: #30D158;
  --orange: #FF9F0A;
  --purple: #BF5AF2;
  --radius: 12px;
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}

html {
  font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  min-height: 100dvh;
  padding-bottom: calc(72px + var(--safe-bottom));
}

.page-header {
  padding: 16px 20px 8px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.3px;
}

.page-subtitle {
  font-size: 15px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.page-main {
  padding: 8px 16px 24px;
}

/* ── Cards ── */
.card {
  background: var(--card);
  border-radius: var(--radius);
  padding: 16px;
  margin-bottom: 12px;
}

.card-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 8px;
}

.card-title {
  font-size: 17px;
  font-weight: 600;
}

.card-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.card-desc {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.45;
  margin-top: 8px;
}

/* ── Buttons ── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  border: none;
  border-radius: 10px;
  padding: 10px 20px;
  cursor: pointer;
  text-decoration: none;
  transition: opacity 0.15s;
}
.btn:active { opacity: 0.7; }

.btn-blue {
  background: var(--blue);
  color: #fff;
}

.btn-ghost {
  background: rgba(255,255,255,0.08);
  color: var(--text);
}

.btn-block {
  display: flex;
  width: 100%;
}

/* ── Sections ── */
.section-header {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 20px 4px 8px;
}

/* ── Tab bar ── */
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  background: rgba(28,28,30,0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid var(--separator);
  padding: 8px 0 calc(8px + var(--safe-bottom));
  z-index: 100;
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  text-decoration: none;
  color: var(--text-tertiary);
  font-size: 10px;
  font-weight: 500;
  padding: 4px 16px;
  transition: color 0.15s;
}

.tab-item.tab-active {
  color: var(--blue);
}

.tab-icon {
  width: 24px;
  height: 24px;
}

.tab-label {
  font-size: 10px;
}

/* ── Separators ── */
.separator {
  height: 1px;
  background: var(--separator);
  margin: 12px 0;
}

/* ── Completed items ── */
.completed-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
}

.completed-item + .completed-item {
  border-top: 1px solid var(--separator);
}

.completed-title {
  font-size: 15px;
  color: var(--text-tertiary);
  text-decoration: line-through;
  flex: 1;
}

.completed-check {
  color: var(--green);
  font-size: 16px;
}

/* ── Upcoming list ── */
.upcoming-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
}

.upcoming-item + .upcoming-item {
  border-top: 1px solid var(--separator);
}

.upcoming-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.upcoming-title {
  font-size: 15px;
  flex: 1;
}

.upcoming-count {
  font-size: 13px;
  color: var(--text-tertiary);
}

.upcoming-spacer .upcoming-title {
  color: var(--text-tertiary);
  font-style: italic;
}

/* ── Exercise list ── */
.exercise-item {
  padding: 14px 0;
}

.exercise-item + .exercise-item {
  border-top: 1px solid var(--separator);
}

.exercise-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.exercise-number {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-tertiary);
  min-width: 20px;
}

.exercise-name {
  font-size: 16px;
  font-weight: 600;
  flex: 1;
}

.exercise-sets {
  font-size: 14px;
  font-weight: 600;
  color: var(--blue);
}

.exercise-notes {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.45;
  margin: 6px 0 0 28px;
}

.exercise-video {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--blue);
  text-decoration: none;
  margin: 6px 0 0 28px;
}

.exercise-tags {
  display: flex;
  gap: 6px;
  margin: 6px 0 0 28px;
  flex-wrap: wrap;
}

.exercise-tag {
  font-size: 11px;
  font-weight: 600;
  color: var(--purple);
  background: rgba(191,90,242,0.12);
  padding: 2px 8px;
  border-radius: 6px;
}

/* ── Phase coaching callout ── */
.coaching-callout {
  background: rgba(255,159,10,0.08);
  border-radius: var(--radius);
  padding: 14px 16px;
  margin-bottom: 16px;
}

.coaching-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--orange);
  margin-bottom: 6px;
}

.coaching-focus {
  font-size: 14px;
  color: var(--text);
  line-height: 1.45;
}

.coaching-details {
  list-style: none;
  margin-top: 8px;
}

.coaching-details li {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.45;
  padding: 3px 0 3px 14px;
  position: relative;
}

.coaching-details li::before {
  content: "\\2022";
  position: absolute;
  left: 0;
  color: var(--orange);
}

/* ── Back nav ── */
.back-nav {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 15px;
  color: var(--blue);
  text-decoration: none;
  padding: 8px 0 12px;
}

/* ── Sticky footer ── */
.sticky-footer {
  position: sticky;
  bottom: calc(72px + var(--safe-bottom));
  padding: 12px 0;
  background: linear-gradient(transparent, var(--bg) 20%);
}

/* ── Skill cards ── */
.skill-card {
  background: var(--card);
  border-radius: var(--radius);
  margin-bottom: 12px;
  overflow: hidden;
}

.skill-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  cursor: pointer;
}

.skill-icon {
  font-size: 20px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  flex-shrink: 0;
}

.skill-name {
  font-size: 16px;
  font-weight: 600;
  flex: 1;
}

.skill-priority {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-tertiary);
  background: rgba(255,255,255,0.06);
  padding: 2px 8px;
  border-radius: 6px;
}

.skill-body {
  padding: 0 16px 16px;
}

.skill-timeline {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.milestone-list {
  list-style: none;
}

.milestone-item {
  display: flex;
  gap: 10px;
  padding: 8px 0;
}

.milestone-item + .milestone-item {
  border-top: 1px solid var(--separator);
}

.milestone-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 5px;
  flex-shrink: 0;
}

.milestone-name {
  font-size: 14px;
  font-weight: 600;
}

.milestone-desc {
  font-size: 13px;
  color: var(--text-secondary);
}

.milestone-week {
  font-size: 12px;
  color: var(--text-tertiary);
}

/* ── Roadmap ── */
.roadmap-item {
  display: flex;
  gap: 12px;
  padding: 14px 0;
}

.roadmap-item + .roadmap-item {
  border-top: 1px solid var(--separator);
}

.roadmap-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

.roadmap-name {
  font-size: 15px;
  font-weight: 600;
}

.roadmap-weeks {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.roadmap-summary {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.45;
  margin-top: 4px;
}

.roadmap-current .roadmap-name {
  color: var(--green);
}

/* ── Benchmarks ── */
.benchmark-item {
  padding: 14px 0;
}

.benchmark-item + .benchmark-item {
  border-top: 1px solid var(--separator);
}

.benchmark-name {
  font-size: 15px;
  font-weight: 600;
}

.benchmark-target {
  font-size: 13px;
  color: var(--blue);
  margin-top: 2px;
}

.benchmark-howto {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.45;
  margin-top: 4px;
}

/* ── Setup page ── */
.setup-container {
  max-width: 480px;
  margin: 0 auto;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 12px 14px;
  font-size: 16px;
  font-family: inherit;
  background: var(--card);
  color: var(--text);
  border: 1px solid var(--separator);
  border-radius: var(--radius);
  outline: none;
  transition: border-color 0.15s;
}

.form-input:focus {
  border-color: var(--blue);
}

.template-grid {
  display: grid;
  gap: 12px;
}

.template-card {
  background: var(--card);
  border-radius: var(--radius);
  padding: 16px;
  cursor: pointer;
  transition: background 0.15s, box-shadow 0.15s;
  border: 1px solid transparent;
}

.template-card:hover {
  background: #2C2C2E;
}

.template-card:active {
  background: #3A3A3C;
}

.template-name {
  font-size: 16px;
  font-weight: 600;
}

.template-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.4;
  margin-top: 4px;
}
`;
