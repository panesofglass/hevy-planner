import { test, expect } from "@playwright/test";
import { BASE_URL, seedDatabase } from "./helpers";

// ---------------------------------------------------------------------------
// Per-page DO isolation tests
//
// Verifies that SSE events targeted at one page's DO do not leak to other
// pages. The SessionActor is keyed by userId:page, so each page gets an
// independent DO instance.
// ---------------------------------------------------------------------------

test.describe("SSE page isolation", () => {
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

  test("today-page reproject does not affect /program content", async ({ browser }) => {
    // Open /program in one tab and capture its initial content
    const programPage = await browser.newPage();
    await programPage.goto("/program");
    await expect(programPage.locator("#content")).not.toBeEmpty({ timeout: 10_000 });
    const programContentBefore = await programPage.locator("#content").innerHTML();

    // Open / in another tab (opens SSE to today DO)
    const todayPage = await browser.newPage();
    await todayPage.goto("/");
    await expect(todayPage.locator("#content")).not.toBeEmpty({ timeout: 10_000 });

    // Trigger a today-page reproject via POST /api/complete
    await todayPage.request.post(`${BASE_URL}/api/complete/1`);

    // Wait a moment for any hypothetical leak to propagate
    await programPage.waitForTimeout(2_000);

    // /program content should be unchanged
    const programContentAfter = await programPage.locator("#content").innerHTML();
    expect(programContentAfter).toBe(programContentBefore);

    await todayPage.close();
    await programPage.close();
  });

  test("today-page error broadcast does not appear on /progress", async ({ browser }) => {
    // Open /progress
    const progressPage = await browser.newPage();
    await progressPage.goto("/progress");
    await expect(progressPage.locator("#content")).not.toBeEmpty({ timeout: 10_000 });

    // Trigger a today-page error (pull with no API key)
    const todayPage = await browser.newPage();
    await todayPage.goto("/");
    await expect(todayPage.locator("#content")).not.toBeEmpty({ timeout: 10_000 });
    await todayPage.request.post(`${BASE_URL}/api/pull`);

    // Wait for any hypothetical leak
    await progressPage.waitForTimeout(2_000);

    // Error card should NOT appear on /progress (different DO than today)
    await expect(progressPage.locator("#error-card")).toHaveCount(0);

    await todayPage.close();
    await progressPage.close();
  });
});
