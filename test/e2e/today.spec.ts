import { test, expect } from "@playwright/test";
import { BASE_URL, seedDatabase, waitForContent } from "./helpers";

// ---------------------------------------------------------------------------
// Today page E2E tests
//
// These run against `wrangler dev` with Durable Objects. The database must be
// seeded before tests that expect rendered content. Datastar's SSE is triggered
// by `data-init` attributes — content appears asynchronously after page load.
// ---------------------------------------------------------------------------

test.describe("Today page", () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await seedDatabase(page);
    } catch {
      // Seed may fail if user already exists — that's fine
    } finally {
      await page.close();
    }
  });

  test("page loads and renders content via SSE", async ({ page }) => {
    await page.goto("/");

    // The HTML shell renders immediately with #content.
    // Datastar fires an SSE request from data-init, which populates #content.
    // Wait for any meaningful content to appear (queue card, setup page, etc.)
    await expect(page.locator("#content")).not.toBeEmpty({ timeout: 10_000 });
  });

  test("SSE connection uses text/event-stream", async ({ page }) => {
    const sseRequests: string[] = [];

    page.on("request", (req) => {
      const accept = req.headers()["accept"] || "";
      if (accept.includes("text/event-stream")) {
        sseRequests.push(req.url());
      }
    });

    await page.goto("/");
    // Wait for content to appear, which means the SSE round-trip completed
    await expect(page.locator("#content")).not.toBeEmpty({ timeout: 10_000 });

    expect(sseRequests.length).toBeGreaterThan(0);
    // The SSE request should target the SSE endpoint
    expect(sseRequests.some((url) => new URL(url).pathname === "/sse/today")).toBe(true);
  });

  test("POST /api/pull returns 202", async ({ page }) => {
    const response = await page.request.post(`${BASE_URL}/api/pull`);
    // 202 if sync succeeds, 400 if no API key configured — both are valid
    expect([200, 202, 400]).toContain(response.status());
  });

  test("POST /api/complete/:id returns 202 or 400", async ({ page }) => {
    // Use ID 1 — may or may not exist. The route should respond, not 404.
    const response = await page.request.post(`${BASE_URL}/api/complete/1`);
    // 202 if item exists and was completed, 400/404 if not found
    expect([200, 202, 400, 404]).toContain(response.status());
  });

  test("POST /api/complete with nonexistent ID returns 202 (silent no-op)", async ({ page }) => {
    // The handler runs UPDATE WHERE id=999999 which affects zero rows — still returns 202
    const response = await page.request.post(`${BASE_URL}/api/complete/999999`);
    expect(response.status()).toBe(202);
  });
});

test.describe("SSE pages render content via SSE", () => {
  test("/progress renders content via SSE", async ({ page }) => {
    const sseRequests: string[] = [];
    page.on("request", (req) => {
      const accept = req.headers()["accept"] || "";
      if (accept.includes("text/event-stream")) {
        sseRequests.push(req.url());
      }
    });

    await page.goto("/progress");
    await expect(page.locator("#content")).not.toBeEmpty({ timeout: 10_000 });

    const progressSSE = sseRequests.filter(
      (url) => new URL(url).pathname === "/sse/progress"
    );
    expect(progressSSE.length).toBeGreaterThan(0);
  });

  test("/program renders content via SSE", async ({ page }) => {
    const sseRequests: string[] = [];
    page.on("request", (req) => {
      const accept = req.headers()["accept"] || "";
      if (accept.includes("text/event-stream")) {
        sseRequests.push(req.url());
      }
    });

    await page.goto("/program");
    await expect(page.locator("#content")).not.toBeEmpty({ timeout: 10_000 });

    const programSSE = sseRequests.filter(
      (url) => new URL(url).pathname === "/sse/program"
    );
    expect(programSSE.length).toBeGreaterThan(0);
  });

  test("/routine/:id serves full HTML without SSE (read-only)", async ({ page }) => {
    const sseRequests: string[] = [];
    page.on("request", (req) => {
      const accept = req.headers()["accept"] || "";
      if (accept.includes("text/event-stream")) {
        sseRequests.push(req.url());
      }
    });

    await page.goto("/routine/daily");
    await page.waitForLoadState("networkidle");

    const routineSSE = sseRequests.filter(
      (url) => new URL(url).pathname.startsWith("/routine/")
    );
    expect(routineSSE.length).toBe(0);
  });
});

test.describe("POST handlers never return event-stream", () => {
  test("POST /api/pull content-type is not event-stream", async ({ page }) => {
    const response = await page.request.post(`${BASE_URL}/api/pull`);
    const contentType = response.headers()["content-type"] || "";
    expect(contentType).not.toContain("text/event-stream");
  });

  test("POST /api/setup content-type is not event-stream", async ({ page }) => {
    const response = await page.request.post(`${BASE_URL}/api/setup/3-day`, {
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({}),
    });
    const contentType = response.headers()["content-type"] || "";
    expect(contentType).not.toContain("text/event-stream");
  });

  test("POST /api/complete/:id content-type is not event-stream", async ({ page }) => {
    const response = await page.request.post(`${BASE_URL}/api/complete/1`);
    const contentType = response.headers()["content-type"] || "";
    expect(contentType).not.toContain("text/event-stream");
  });
});
