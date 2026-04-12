import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:8787",
    headless: true,
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:8787",
    reuseExistingServer: true,
    timeout: 10_000,
  },
});
