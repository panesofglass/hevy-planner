import { test, expect } from "@playwright/test";
import { BASE_URL, seedDatabase } from "./helpers";

// ---------------------------------------------------------------------------
// Skill assessment E2E tests
//
// Ports test-e2e.sh Issue #3. Skill assessments are saved via JSON POST
// with Datastar signal key format: assess_skill_{sanitized_id}.
// ---------------------------------------------------------------------------

/** Build the JSON body that Datastar sends for a skill assessment. */
function assessmentBody(skillId: string, currentState: string): string {
  const signalKey = `assess_skill_${skillId.replace(/[^a-zA-Z0-9]/g, "_")}`;
  return JSON.stringify({ [signalKey]: currentState });
}

test.describe("Skill assessments", () => {
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

  test("POST /api/skill-assessment/:id returns 202", async ({ page }) => {
    const response = await page.request.post(
      `${BASE_URL}/api/skill-assessment/muscle-up`,
      {
        headers: { "Content-Type": "application/json" },
        data: assessmentBody("muscle-up", "Can do 5 strict pull-ups. No muscle-up experience."),
      }
    );
    expect(response.status()).toBe(202);
  });

  test("POST /api/skill-assessment/nonexistent-xyz returns 404", async ({ page }) => {
    const response = await page.request.post(
      `${BASE_URL}/api/skill-assessment/nonexistent-skill-xyz`,
      {
        headers: { "Content-Type": "application/json" },
        data: assessmentBody("nonexistent-skill-xyz", "test"),
      }
    );
    expect(response.status()).toBe(404);
  });

  test("missing current_state returns 400", async ({ page }) => {
    // Send empty signal value
    const response = await page.request.post(
      `${BASE_URL}/api/skill-assessment/muscle-up`,
      {
        headers: { "Content-Type": "application/json" },
        data: assessmentBody("muscle-up", ""),
      }
    );
    expect(response.status()).toBe(400);
  });

  test("assessment appears on /progress page", async ({ page }) => {
    // Save a distinctive assessment
    await page.request.post(
      `${BASE_URL}/api/skill-assessment/muscle-up`,
      {
        headers: { "Content-Type": "application/json" },
        data: assessmentBody("muscle-up", "Can do 5 strict pull-ups. No muscle-up experience."),
      }
    );

    await page.goto("/progress");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("#content")).toContainText("5 strict pull-ups");
  });

  test("user assessment overrides program default", async ({ page }) => {
    // Save assessment for muscle-up
    await page.request.post(
      `${BASE_URL}/api/skill-assessment/muscle-up`,
      {
        headers: { "Content-Type": "application/json" },
        data: assessmentBody("muscle-up", "Can do 5 strict pull-ups. No muscle-up experience."),
      }
    );

    await page.goto("/progress");
    await page.waitForLoadState("networkidle");

    const content = page.locator("#content");
    // User assessment should appear
    await expect(content).toContainText("5 strict pull-ups");
    // Program default should NOT appear for this skill
    await expect(content).not.toContainText("previously 7-10 before shoulder");
  });

  test("skill cards have assessment edit affordance", async ({ page }) => {
    await page.goto("/progress");
    await page.waitForLoadState("networkidle");

    // There should be a reference to the skill-assessment endpoint somewhere in the page
    const html = await page.locator("#content").innerHTML();
    expect(html).toContain("skill-assessment");
  });

  test("updated assessment replaces old one (UPSERT)", async ({ page }) => {
    // First assessment
    await page.request.post(
      `${BASE_URL}/api/skill-assessment/muscle-up`,
      {
        headers: { "Content-Type": "application/json" },
        data: assessmentBody("muscle-up", "Can do 5 strict pull-ups. No muscle-up experience."),
      }
    );

    // Update with new text
    await page.request.post(
      `${BASE_URL}/api/skill-assessment/muscle-up`,
      {
        headers: { "Content-Type": "application/json" },
        data: assessmentBody("muscle-up", "Up to 8 pull-ups now. Started false grip work."),
      }
    );

    await page.goto("/progress");
    await page.waitForLoadState("networkidle");

    const content = page.locator("#content");
    // New text should be present
    await expect(content).toContainText("8 pull-ups");
    // Old text should NOT be present (proves UPSERT, not append)
    await expect(content).not.toContainText("5 strict pull-ups");
  });
});
