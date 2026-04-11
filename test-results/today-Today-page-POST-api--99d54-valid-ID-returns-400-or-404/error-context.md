# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: today.spec.ts >> Today page >> POST /api/complete with invalid ID returns 400 or 404
- Location: tests/e2e/today.spec.ts:65:7

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected value: 202
Received array: [400, 404]
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import { BASE_URL, seedDatabase, waitForContent } from "./helpers";
  3   | 
  4   | // ---------------------------------------------------------------------------
  5   | // Today page E2E tests
  6   | //
  7   | // These run against `wrangler dev` with Durable Objects. The database must be
  8   | // seeded before tests that expect rendered content. Datastar's SSE is triggered
  9   | // by `data-init` attributes — content appears asynchronously after page load.
  10  | // ---------------------------------------------------------------------------
  11  | 
  12  | test.describe("Today page", () => {
  13  |   test.beforeAll(async ({ browser }) => {
  14  |     const page = await browser.newPage();
  15  |     try {
  16  |       await seedDatabase(page);
  17  |     } catch {
  18  |       // Seed may fail if user already exists — that's fine
  19  |     } finally {
  20  |       await page.close();
  21  |     }
  22  |   });
  23  | 
  24  |   test("page loads and renders content via SSE", async ({ page }) => {
  25  |     await page.goto("/");
  26  | 
  27  |     // The HTML shell renders immediately with #content.
  28  |     // Datastar fires an SSE request from data-init, which populates #content.
  29  |     // Wait for any meaningful content to appear (queue card, setup page, etc.)
  30  |     await expect(page.locator("#content")).not.toBeEmpty({ timeout: 10_000 });
  31  |   });
  32  | 
  33  |   test("SSE connection uses text/event-stream", async ({ page }) => {
  34  |     const sseRequests: string[] = [];
  35  | 
  36  |     page.on("request", (req) => {
  37  |       const accept = req.headers()["accept"] || "";
  38  |       if (accept.includes("text/event-stream")) {
  39  |         sseRequests.push(req.url());
  40  |       }
  41  |     });
  42  | 
  43  |     await page.goto("/");
  44  |     // Wait for content to appear, which means the SSE round-trip completed
  45  |     await expect(page.locator("#content")).not.toBeEmpty({ timeout: 10_000 });
  46  | 
  47  |     expect(sseRequests.length).toBeGreaterThan(0);
  48  |     // The SSE request should target the root path
  49  |     expect(sseRequests.some((url) => new URL(url).pathname === "/")).toBe(true);
  50  |   });
  51  | 
  52  |   test("POST /api/pull returns 202", async ({ page }) => {
  53  |     const response = await page.request.post(`${BASE_URL}/api/pull`);
  54  |     // 202 if sync succeeds, 400 if no API key configured — both are valid
  55  |     expect([200, 202, 400]).toContain(response.status());
  56  |   });
  57  | 
  58  |   test("POST /api/complete/:id returns 202 or 400", async ({ page }) => {
  59  |     // Use ID 1 — may or may not exist. The route should respond, not 404.
  60  |     const response = await page.request.post(`${BASE_URL}/api/complete/1`);
  61  |     // 202 if item exists and was completed, 400/404 if not found
  62  |     expect([200, 202, 400, 404]).toContain(response.status());
  63  |   });
  64  | 
  65  |   test("POST /api/complete with invalid ID returns 400 or 404", async ({ page }) => {
  66  |     const response = await page.request.post(`${BASE_URL}/api/complete/999999`);
> 67  |     expect([400, 404]).toContain(response.status());
      |                        ^ Error: expect(received).toContain(expected) // indexOf
  68  |   });
  69  | });
  70  | 
  71  | test.describe("Static pages do not use SSE", () => {
  72  |   test("/progress serves full HTML without SSE", async ({ page }) => {
  73  |     const sseRequests: string[] = [];
  74  | 
  75  |     page.on("request", (req) => {
  76  |       const accept = req.headers()["accept"] || "";
  77  |       if (accept.includes("text/event-stream")) {
  78  |         sseRequests.push(req.url());
  79  |       }
  80  |     });
  81  | 
  82  |     await page.goto("/progress");
  83  |     // Wait for the page to fully load and settle
  84  |     await page.waitForLoadState("networkidle");
  85  | 
  86  |     // Progress is a static page — content is inline HTML, not SSE-driven
  87  |     const progressSSE = sseRequests.filter(
  88  |       (url) => new URL(url).pathname === "/progress"
  89  |     );
  90  |     expect(progressSSE.length).toBe(0);
  91  |   });
  92  | 
  93  |   test("/program serves full HTML without SSE", async ({ page }) => {
  94  |     const sseRequests: string[] = [];
  95  | 
  96  |     page.on("request", (req) => {
  97  |       const accept = req.headers()["accept"] || "";
  98  |       if (accept.includes("text/event-stream")) {
  99  |         sseRequests.push(req.url());
  100 |       }
  101 |     });
  102 | 
  103 |     await page.goto("/program");
  104 |     await page.waitForLoadState("networkidle");
  105 | 
  106 |     const programSSE = sseRequests.filter(
  107 |       (url) => new URL(url).pathname === "/program"
  108 |     );
  109 |     expect(programSSE.length).toBe(0);
  110 |   });
  111 | });
  112 | 
  113 | test.describe("POST handlers never return event-stream", () => {
  114 |   test("POST /api/pull content-type is not event-stream", async ({ page }) => {
  115 |     const response = await page.request.post(`${BASE_URL}/api/pull`);
  116 |     const contentType = response.headers()["content-type"] || "";
  117 |     expect(contentType).not.toContain("text/event-stream");
  118 |   });
  119 | 
  120 |   test("POST /api/setup content-type is not event-stream", async ({ page }) => {
  121 |     const response = await page.request.post(`${BASE_URL}/api/setup/3-day`, {
  122 |       headers: { "Content-Type": "application/json" },
  123 |       data: JSON.stringify({}),
  124 |     });
  125 |     const contentType = response.headers()["content-type"] || "";
  126 |     expect(contentType).not.toContain("text/event-stream");
  127 |   });
  128 | 
  129 |   test("POST /api/complete/:id content-type is not event-stream", async ({ page }) => {
  130 |     const response = await page.request.post(`${BASE_URL}/api/complete/1`);
  131 |     const contentType = response.headers()["content-type"] || "";
  132 |     expect(contentType).not.toContain("text/event-stream");
  133 |   });
  134 | });
  135 | 
```