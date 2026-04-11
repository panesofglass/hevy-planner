import { Page, expect } from "@playwright/test";

export const BASE_URL = "http://localhost:8787";

/** Seed the database if not already seeded. Checks if / returns content. */
export async function seedDatabase(page: Page): Promise<void> {
  // Check if already seeded by requesting / and seeing if we get the setup page
  const check = await page.request.get(`${BASE_URL}/`, {
    headers: { "Accept": "text/html" },
  });
  const html = await check.text();
  // If the setup page is shown, we need to seed
  if (html.includes("Setup") && html.includes("api/setup")) {
    const response = await page.request.post(`${BASE_URL}/api/setup/4-day`, {
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({}),
    });
    expect(response.status()).toBe(202);
  }
  // Otherwise already seeded — skip
}

/** Wait for SSE content to appear in #content. */
export async function waitForContent(page: Page, text: string, timeout = 5000): Promise<void> {
  await expect(page.locator("#content")).toContainText(text, { timeout });
}
