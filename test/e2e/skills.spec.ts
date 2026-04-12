import { test, expect } from "@playwright/test";
import { BASE_URL, seedDatabase } from "./helpers";

// ---------------------------------------------------------------------------
// Skill assessment E2E tests
//
// Ports test-e2e.sh Issue #3. Skill assessments are saved via JSON POST
// with Datastar signal key format: assess_skill_{sanitized_id}.
// Serial execution: tests modify shared state (skill assessments in D1).
// ---------------------------------------------------------------------------

/** Build the JSON body that Datastar sends for a skill assessment. */
function assessmentBody(skillId: string, currentState: string): string {
  const signalKey = `assess_skill_${skillId.replace(/[^a-zA-Z0-9]/g, "_")}`;
  return JSON.stringify({ [signalKey]: currentState });
}

test.describe.serial("Skill assessments", () => {
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
    await expect(page.locator("#content")).not.toBeEmpty({ timeout: 10_000 });

    await expect(page.locator("#content")).toContainText("5 strict pull-ups");
  });

  test("user assessment overrides program default", async ({ page }) => {
    await page.goto("/progress");
    await expect(page.locator("#content")).not.toBeEmpty({ timeout: 10_000 });

    const content = page.locator("#content");
    // User assessment should appear
    await expect(content).toContainText("5 strict pull-ups");
    // Program default should NOT appear for this skill
    await expect(content).not.toContainText("previously 7-10 before shoulder");
  });

  test("updated assessment replaces old one (UPSERT)", async ({ page }) => {
    // Update with new text
    const response = await page.request.post(
      `${BASE_URL}/api/skill-assessment/muscle-up`,
      {
        headers: { "Content-Type": "application/json" },
        data: assessmentBody("muscle-up", "Up to 8 pull-ups now. Started false grip work."),
      }
    );
    expect(response.status()).toBe(202);

    await page.goto("/progress");
    await expect(page.locator("#content")).not.toBeEmpty({ timeout: 10_000 });

    const content = page.locator("#content");
    // New text should be present in the skill card
    await expect(content).toContainText("8 pull-ups");
    // The old assessment text "Can do 5 strict pull-ups" should not appear
    // in the skill card's "Where You Are" section (proves UPSERT, not append).
    // Use the specific skill card locator to avoid matching benchmark targets.
    const skillCard = page.locator("[data-signals\\:skill_muscle_up]");
    await expect(skillCard).toContainText("8 pull-ups");
    await expect(skillCard).not.toContainText("Can do 5 strict");
  });

  test("skill cards have assessment edit affordance", async ({ page }) => {
    await page.goto("/progress");
    await expect(page.locator("#content")).not.toBeEmpty({ timeout: 10_000 });

    const html = await page.locator("#content").innerHTML();
    expect(html).toContain("skill-assessment");
  });
});
