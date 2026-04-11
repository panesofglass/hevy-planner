import { test, expect } from "@playwright/test";
import { BASE_URL, seedDatabase } from "./helpers";

// ---------------------------------------------------------------------------
// Program page E2E tests
//
// Ports test-e2e.sh Issue #10 (BODi integration). The /program page is
// static HTML — no SSE. Content assertions verify the BODi section,
// trainer info, hybrid schedules, and integration rules are rendered.
// ---------------------------------------------------------------------------

test.describe("Program page", () => {
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

  test("/program page renders without SSE", async ({ page }) => {
    const sseRequests: string[] = [];

    page.on("request", (req) => {
      const accept = req.headers()["accept"] || "";
      if (accept.includes("text/event-stream")) {
        sseRequests.push(req.url());
      }
    });

    await page.goto("/program");
    await page.waitForLoadState("networkidle");

    // No SSE requests should target the /program path
    const programSSE = sseRequests.filter(
      (url) => new URL(url).pathname === "/program"
    );
    expect(programSSE.length).toBe(0);
  });

  test("page contains BODi section", async ({ page }) => {
    await page.goto("/program");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("#content")).toContainText("BODi Integration");
  });

  test("page contains trainer info", async ({ page }) => {
    await page.goto("/program");
    await page.waitForLoadState("networkidle");

    const content = page.locator("#content");
    // Program JSON has trainers: Amoila Cesar, Joel Freeman, Sagi Kalev
    await expect(content).toContainText("Amoila Cesar");
  });

  test("page contains hybrid schedule section", async ({ page }) => {
    await page.goto("/program");
    await page.waitForLoadState("networkidle");

    const content = page.locator("#content");
    // Hybrid schedule names from program JSON
    await expect(content).toContainText("Hybrid");
    // Schedule contains day-by-day entries
    await expect(content).toContainText("Monday");
  });

  test("program JSON with BODi data passes schema validation", async ({ page }) => {
    // POST the bundled program JSON to the validate endpoint
    // Read the default program JSON from the server
    const programResponse = await page.request.get(`${BASE_URL}/programs/default.json`);
    expect(programResponse.ok()).toBe(true);
    const programJson = await programResponse.text();

    const response = await page.request.post(
      `${BASE_URL}/api/validate-program`,
      {
        headers: { "Content-Type": "application/json" },
        data: JSON.stringify({ programJson }),
      }
    );
    // 202 means valid (validation events broadcast via DO)
    // 400 means validation errors found
    expect(response.status()).toBe(202);
  });

  test("page contains integration rules", async ({ page }) => {
    await page.goto("/program");
    await page.waitForLoadState("networkidle");

    const content = page.locator("#content");
    // Integration rules section header
    await expect(content).toContainText("Integration Rules");
    // First rule: "Always do CARs before any BODi session"
    await expect(content).toContainText("CARs");
  });
});
