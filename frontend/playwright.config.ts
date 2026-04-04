import { defineConfig, devices } from "@playwright/test";

/**
 * E2E against local Docker stack: `docker compose up` (frontend :4173, API via /api proxy).
 * Install browsers: `cd frontend && npx playwright install chromium`
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173",
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
  },
});
