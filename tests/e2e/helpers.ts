import { Page, expect } from "@playwright/test";

export const BASE_URL = "http://localhost:8787";

/** Seed the database by posting the setup form with the 3-day template. */
export async function seedDatabase(page: Page): Promise<void> {
  const response = await page.request.post(`${BASE_URL}/api/setup/3-day`, {
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify({}),
  });
  expect(response.status()).toBe(202);
}

/** Wait for SSE content to appear in #content. */
export async function waitForContent(page: Page, text: string, timeout = 5000): Promise<void> {
  await expect(page.locator("#content")).toContainText(text, { timeout });
}
