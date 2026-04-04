import { defineConfig, devices } from "@playwright/test";

/**
 * E2E against local Docker stack: `docker compose up` (frontend :4173, API via /api proxy).
 * Install browsers: `cd frontend && npx playwright install chromium`
 *
 * Projects:
 * - desktop-chrome — полная ширина; пропускает тесты с `@mobile-only` в имени/describe.
 * - mobile-chrome — Pixel 5 (viewport < 820px CSS breakpoint); пропускает `@desktop`.
 *
 * Общие сценарии (repair PDF и т.д.) гоняются в обоих проектах параллельно с остальными воркерами.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ["list"],
    [
      "allure-playwright",
      {
        detail: true,
        suiteTitle: true,
        /** Явная папка: совпадает с upload в pr.yml (`frontend/allure-results`). */
        resultsDir: "allure-results",
        /** Всегда в эпике end-to-end в merged Allure + allure-ci.mjs (дополняет e2eBehaviors). */
        globalLabels: { epic: "end-to-end" },
      },
    ],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    /** JUnit для dorny/test-reporter в report.yml (артефакт e2e-test-results). */
    ["junit", { outputFile: "test-results/e2e-junit.xml" }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173",
    trace: process.env.CI ? "retain-on-failure" : "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop-chrome",
      grepInvert: /@mobile-only/,
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "mobile-chrome",
      grepInvert: /@desktop/,
      use: {
        ...devices["Pixel 5"],
      },
    },
  ],
});
