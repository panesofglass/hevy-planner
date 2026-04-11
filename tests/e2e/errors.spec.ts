import { test, expect } from "@playwright/test";
import { BASE_URL, seedDatabase } from "./helpers";

// ---------------------------------------------------------------------------
// Error reporting architecture E2E tests (NEW — not from test-e2e.sh)
//
// Verifies that POST handler failures broadcast error cards to connected
// SSE clients via the SessionActor Durable Object. The error card appears
// as a prepended element in #content with id="error-card" and orange text.
//
// Test flow:
//   1. Navigate to / (opens SSE connection via Datastar data-init)
//   2. Make the failing POST request
//   3. Assert the error card appears in the DOM via SSE broadcast
// ---------------------------------------------------------------------------

test.describe("Error broadcast via SSE", () => {
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

  test("POST /api/pull with no API key broadcasts error to today page", async ({ page }) => {
    // Navigate to today page — this opens the SSE connection
    await page.goto("/");
    // Wait for initial SSE content to load
    await expect(page.locator("#content")).not.toBeEmpty({ timeout: 10_000 });

    // Trigger a pull sync — will fail because no Hevy API key is configured in test env
    const response = await page.request.post(`${BASE_URL}/api/pull`);
    // The POST itself returns a non-2xx status for transport-level failures
    expect(response.ok()).toBe(false);

    // The error should be broadcast to the SSE connection and appear in #content.
    // The SessionActor prepends an #error-card div with orange text.
    await expect(page.locator("#error-card")).toBeVisible({ timeout: 5_000 });
  });

  test("POST /api/advance-phase with unmet gates returns error", async ({ page }) => {
    // Phase 2 gates are not passed — this should return a 400 with error message
    const response = await page.request.post(
      `${BASE_URL}/api/advance-phase/phase2`
    );
    // The advance-phase handler returns HTTP 400 directly for validation errors
    expect(response.status()).toBe(400);
    const body = await response.text();
    expect(body).toContain("Gates not passed");
  });
});
