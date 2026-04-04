import { defineConfig, devices } from "@playwright/test";

const isCi = !!process.env.CI;

const allureReporter = [
  "allure-playwright",
  {
    detail: true,
    suiteTitle: true,
    resultsDir: "allure-results",
    globalLabels: { epic: "end-to-end" },
  },
] as const;

const htmlReporter = [
  "html",
  { open: "never" as const, outputFolder: "playwright-report" },
] as const;

const junitReporter = [
  "junit",
  { outputFile: "test-results/e2e-junit.xml" },
] as const;

/** Локально — параллельно; в CI — github + list и один воркер для читаемого лога шага */
const reporters = isCi
  ? [["github"], ["list"], allureReporter, htmlReporter, junitReporter]
  : [["list"], allureReporter, htmlReporter, junitReporter];

/**
 * E2E against local Docker stack: `docker compose up` (frontend :4173, API via /api proxy).
 * Install browsers: `cd frontend && npx playwright install chromium`
 *
 * Projects:
 * - desktop-chrome — полная ширина; пропускает тесты с `@mobile-only` в имени/describe.
 * - mobile-chrome — Pixel 5 (viewport < 820px CSS breakpoint); пропускает `@desktop`.
 *
 * В CI тесты идут последовательно (workers=1, fullyParallel=false) — лог ближе к Vitest.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: !isCi,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  workers: isCi ? 1 : undefined,
  reporter: reporters,
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
