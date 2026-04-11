import { test, expect } from "@playwright/test";
import { BASE_URL, seedDatabase } from "./helpers";

// ---------------------------------------------------------------------------
// Benchmark logging & phase advancement E2E tests
//
// Ports test-e2e.sh Issue #1 (benchmark logging) and Issue #2 (phase
// advancement). Tests run against `wrangler dev` with a seeded database.
// ---------------------------------------------------------------------------

// Phase 1 gate benchmark IDs — must all pass before phase can advance
const PHASE1_GATE_IDS = [
  "pain-free-planks",
  "strict-pullups-8",
  "clean-dips-15",
  "cossack-squat-full",
  "single-leg-balance-30",
  "wall-dorsiflexion-4in",
  "hollow-body-30s",
  "overhead-wall-test",
];

test.describe("Benchmark logging", () => {
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

  test("POST /api/log-benchmark/:id returns 202 on success", async ({ page }) => {
    const response = await page.request.post(
      `${BASE_URL}/api/log-benchmark/wall-dorsiflexion`,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        data: "value=3.5&passed=true&notes=Right+side+improving",
      }
    );
    expect(response.status()).toBe(202);
  });

  test("POST /api/log-benchmark/nonexistent-xyz returns 404", async ({ page }) => {
    const response = await page.request.post(
      `${BASE_URL}/api/log-benchmark/nonexistent-benchmark-xyz`,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        data: "value=1&passed=true",
      }
    );
    expect(response.status()).toBe(404);
  });

  test("missing value returns 400", async ({ page }) => {
    const response = await page.request.post(
      `${BASE_URL}/api/log-benchmark/wall-dorsiflexion`,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        data: "passed=true",
      }
    );
    expect(response.status()).toBe(400);
  });

  test("logged values appear on /progress page after refresh", async ({ page }) => {
    // Log a distinctive value
    await page.request.post(
      `${BASE_URL}/api/log-benchmark/wall-dorsiflexion`,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        data: "value=3.5&passed=true&notes=Playwright+test",
      }
    );

    // Load progress page — static HTML, not SSE
    await page.goto("/progress");
    await page.waitForLoadState("networkidle");

    // The logged value should appear somewhere on the page
    await expect(page.locator("#content")).toContainText("3.5");
  });

  test("bilateral tracking — log both sides, verify both on /progress", async ({ page }) => {
    // Log left side
    await page.request.post(
      `${BASE_URL}/api/log-benchmark/wall-dorsiflexion`,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        data: "value=4.5&passed=true&side=left&notes=Left+side",
      }
    );

    // Log right side
    await page.request.post(
      `${BASE_URL}/api/log-benchmark/wall-dorsiflexion`,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        data: "value=2.5&passed=false&side=right&notes=Right+Achilles+side",
      }
    );

    await page.goto("/progress");
    await page.waitForLoadState("networkidle");

    const content = page.locator("#content");
    await expect(content).toContainText(/left/i);
    await expect(content).toContainText(/right/i);
  });
});

test.describe("Phase advancement", () => {
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

  test("POST /api/advance-phase/nonexistent-xyz returns 404", async ({ page }) => {
    const response = await page.request.post(
      `${BASE_URL}/api/advance-phase/nonexistent-phase-xyz`
    );
    expect(response.status()).toBe(404);
  });

  test("POST /api/advance-phase/:id without gates passed returns 400", async ({ page }) => {
    // Phase 2 gates are not passed — should fail
    const response = await page.request.post(
      `${BASE_URL}/api/advance-phase/phase2`
    );
    expect(response.status()).toBe(400);
    const body = await response.text();
    expect(body).toContain("Gates not passed");
  });

  test("after logging all Phase 1 gate benchmarks, advance-phase returns 202", async ({ page }) => {
    // Log all 8 Phase 1 gate benchmarks as passed
    for (const gateId of PHASE1_GATE_IDS) {
      const resp = await page.request.post(
        `${BASE_URL}/api/log-benchmark/${gateId}`,
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          data: "value=pass&passed=true",
        }
      );
      expect(resp.status()).toBe(202);
    }

    // Now advance Phase 1
    const response = await page.request.post(
      `${BASE_URL}/api/advance-phase/phase1`
    );
    expect(response.status()).toBe(202);
  });

  test("phase change persists on /progress page reload", async ({ page }) => {
    // Ensure Phase 1 gates are passed and phase is advanced (idempotent setup)
    for (const gateId of PHASE1_GATE_IDS) {
      await page.request.post(
        `${BASE_URL}/api/log-benchmark/${gateId}`,
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          data: "value=pass&passed=true",
        }
      );
    }
    // Advance may fail if already advanced — that's fine
    await page.request.post(`${BASE_URL}/api/advance-phase/phase1`);

    // Reload progress page
    await page.goto("/progress");
    await page.waitForLoadState("networkidle");

    const content = page.locator("#content");
    // Phase 1 should show completed status
    await expect(content).toContainText(/completed/i);
  });

  test("cannot re-advance already completed phase (400)", async ({ page }) => {
    // Ensure Phase 1 is already advanced (from prior test or setup)
    for (const gateId of PHASE1_GATE_IDS) {
      await page.request.post(
        `${BASE_URL}/api/log-benchmark/${gateId}`,
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          data: "value=pass&passed=true",
        }
      );
    }
    await page.request.post(`${BASE_URL}/api/advance-phase/phase1`);

    // Try to re-advance Phase 1 — should fail
    const response = await page.request.post(
      `${BASE_URL}/api/advance-phase/phase1`
    );
    expect(response.status()).toBe(400);
    const body = await response.text();
    expect(body).toContain("already completed");
  });
});
