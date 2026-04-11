# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: errors.spec.ts >> Error broadcast via SSE >> POST /api/advance-phase with unmet gates returns error
- Location: tests/e2e/errors.spec.ts:45:7

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "Gates not passed"
Received string:    "Phase is not current"
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { BASE_URL, seedDatabase } from "./helpers";
  3  | 
  4  | // ---------------------------------------------------------------------------
  5  | // Error reporting architecture E2E tests (NEW — not from test-e2e.sh)
  6  | //
  7  | // Verifies that POST handler failures broadcast error cards to connected
  8  | // SSE clients via the SessionActor Durable Object. The error card appears
  9  | // as a prepended element in #content with id="error-card" and orange text.
  10 | //
  11 | // Test flow:
  12 | //   1. Navigate to / (opens SSE connection via Datastar data-init)
  13 | //   2. Make the failing POST request
  14 | //   3. Assert the error card appears in the DOM via SSE broadcast
  15 | // ---------------------------------------------------------------------------
  16 | 
  17 | test.describe("Error broadcast via SSE", () => {
  18 |   test.beforeAll(async ({ browser }) => {
  19 |     const page = await browser.newPage();
  20 |     try {
  21 |       await seedDatabase(page);
  22 |     } catch {
  23 |       // Seed may fail if user already exists
  24 |     } finally {
  25 |       await page.close();
  26 |     }
  27 |   });
  28 | 
  29 |   test("POST /api/pull with no API key broadcasts error to today page", async ({ page }) => {
  30 |     // Navigate to today page — this opens the SSE connection
  31 |     await page.goto("/");
  32 |     // Wait for initial SSE content to load
  33 |     await expect(page.locator("#content")).not.toBeEmpty({ timeout: 10_000 });
  34 | 
  35 |     // Trigger a pull sync — will fail because no Hevy API key is configured in test env
  36 |     const response = await page.request.post(`${BASE_URL}/api/pull`);
  37 |     // The POST itself returns a non-2xx status for transport-level failures
  38 |     expect(response.ok()).toBe(false);
  39 | 
  40 |     // The error should be broadcast to the SSE connection and appear in #content.
  41 |     // The SessionActor prepends an #error-card div with orange text.
  42 |     await expect(page.locator("#error-card")).toBeVisible({ timeout: 5_000 });
  43 |   });
  44 | 
  45 |   test("POST /api/advance-phase with unmet gates returns error", async ({ page }) => {
  46 |     // Phase 2 gates are not passed — this should return a 400 with error message
  47 |     const response = await page.request.post(
  48 |       `${BASE_URL}/api/advance-phase/phase2`
  49 |     );
  50 |     // The advance-phase handler returns HTTP 400 directly for validation errors
  51 |     expect(response.status()).toBe(400);
  52 |     const body = await response.text();
> 53 |     expect(body).toContain("Gates not passed");
     |                  ^ Error: expect(received).toContain(expected) // indexOf
  54 |   });
  55 | });
  56 | 
```