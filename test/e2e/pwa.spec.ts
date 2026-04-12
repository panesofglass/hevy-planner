import { test, expect } from "@playwright/test";
import { BASE_URL, seedDatabase } from "./helpers";

// ---------------------------------------------------------------------------
// PWA & Service Worker E2E tests
//
// These run against `wrangler dev`. The service worker is registered via
// data-init on page load. Manifest and icon files are served as static assets
// from the Worker.
// ---------------------------------------------------------------------------

test.describe("PWA & Service Worker", () => {
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

  test("service worker registers successfully", async ({ page }) => {
    await page.goto("/");

    // Wait for the page shell to load before checking SW registration
    await page.waitForLoadState("domcontentloaded");

    const swState = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration("/");
      if (!reg) return null;

      const sw = reg.active || reg.installing || reg.waiting;
      if (!sw) return null;
      if (sw.state === "activated") return "activated";

      return waitForActivation(sw);

      function waitForActivation(worker: ServiceWorker): Promise<string> {
        return new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(worker.state), 5000);
          worker.addEventListener("statechange", function handler() {
            if (worker.state !== "activated") return;
            clearTimeout(timeout);
            worker.removeEventListener("statechange", handler);
            resolve("activated");
          });
        });
      }
    });

    expect(swState).toBe("activated");
  });

  test("manifest has required icon entries", async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/manifest.json`);
    expect(response.status()).toBe(200);

    const manifest = await response.json();
    const icons: Array<{ src: string; sizes: string; type?: string; purpose?: string }> =
      manifest.icons ?? [];

    // Must have at least 3 icon entries
    expect(icons.length).toBeGreaterThanOrEqual(3);

    // Must include a 192x192 icon
    const icon192 = icons.find((i) => i.sizes === "192x192");
    expect(icon192).toBeDefined();

    // Must include a maskable 512x512 icon
    const maskable512 = icons.find(
      (i) => i.sizes === "512x512" && i.purpose?.includes("maskable")
    );
    expect(maskable512).toBeDefined();
  });

  test("icon files are served correctly", async ({ page }) => {
    const iconPaths = [
      "/icon-192.png",
      "/icon-512.png",
      "/icon-maskable-512.png",
      "/apple-touch-icon.png",
    ];

    for (const iconPath of iconPaths) {
      const response = await page.request.get(`${BASE_URL}${iconPath}`);
      expect(response.status(), `${iconPath} should return 200`).toBe(200);

      const contentType = response.headers()["content-type"] ?? "";
      expect(
        contentType,
        `${iconPath} should have content-type image/png`
      ).toContain("image/png");
    }
  });

  test("SSE requests are not intercepted by service worker", async ({ page }) => {
    await page.goto("/");

    // If SSE is intercepted by the SW, content would never arrive.
    // Successful content render proves SSE passthrough works.
    await expect(page.locator("#content")).not.toBeEmpty({ timeout: 10_000 });
  });

  test("style.css is served correctly", async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/style.css`);
    expect(response.status()).toBe(200);

    const contentType = response.headers()["content-type"] ?? "";
    expect(contentType).toContain("text/css");
  });
});
