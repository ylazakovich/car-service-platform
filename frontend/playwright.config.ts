import { defineConfig, devices } from "@playwright/test";

import { AUTH_STATE_STAFF } from "./e2e/fixtures/auth";
import { applyRepoRootDotEnv } from "./e2e/load-repo-env";

applyRepoRootDotEnv();

const isCi = !!process.env.CI;
const e2eSuite = process.env.PLAYWRIGHT_E2E_SUITE;
const suiteFilter =
  e2eSuite === "django-admin"
    ? { testMatch: /django-admin-.*\.spec\.ts/ }
    : e2eSuite === "app"
      ? { testIgnore: /django-admin-.*\.spec\.ts/ }
      : {};

const allureReporter = [
  "allure-playwright",
  {
    detail: true,
    suiteTitle: true,
    resultsDir: "allure-results",
    globalLabels: { epic: "end-to-end", layer: "e2e" },
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

/** Локально — list + Allure/HTML/JUnit; в CI — ещё github для аннотаций в Checks */
const reporters = isCi
  ? [["github"], ["list"], allureReporter, htmlReporter, junitReporter]
  : [["list"], allureReporter, htmlReporter, junitReporter];

/**
 * В CI — по умолчанию 5 воркеров (быстрее, чем 3; 8+ на слабом runner обычно даёт меньший выигрыш и больше гонок на общей демо-БД).
 * Переопределение: `PLAYWRIGHT_CI_WORKERS` (например `8` на крупном self-hosted).
 */
const e2eWorkersCi = Math.max(
  1,
  Number.parseInt(process.env.PLAYWRIGHT_CI_WORKERS ?? "5", 10) || 5,
);

/**
 * E2E against local Docker stack: `docker compose up` (frontend :4173, API via /api proxy).
 * Install browsers: `cd frontend && npx playwright install chromium`
 *
 * Projects:
 * - desktop-chrome — полная ширина; пропускает тесты с `@mobile-only` в имени/describe.
 * - mobile-chrome — Pixel 5 (viewport < 820px CSS breakpoint); пропускает `@desktop`.
 * - setup — `e2e/auth.setup.ts` пишет `e2e/.auth/*.json` (staff по умолчанию для обоих браузеров).
 *
 * В CI — workers см. `e2eWorkersCi` (по умолчанию 5), fullyParallel=false — тесты в одном файле по порядку (меньше гонок на общих демо-строках).
 * mobile-chrome ждёт desktop-chrome, чтобы не накладываться на cross-viewport мутации shared fixtures.
 */
export default defineConfig({
  globalSetup: "./e2e/global-setup.ts",
  testDir: "./e2e",
  ...suiteFilter,
  fullyParallel: !isCi,
  forbidOnly: isCi,
  /** Политика проекта: без ретраев — флаки чиним детерминизмом и готовностью стека (см. docs/testing/playwright-e2e-framework.md). */
  retries: 0,
  workers: isCi ? e2eWorkersCi : undefined,
  reporter: reporters,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173",
    trace: process.env.CI ? "retain-on-failure" : "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /e2e\/auth\.setup\.ts/,
    },
    {
      name: "desktop-chrome",
      dependencies: ["setup"],
      grepInvert: /@mobile-only/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: AUTH_STATE_STAFF,
      },
    },
    {
      name: "mobile-chrome",
      dependencies: ["setup", "desktop-chrome"],
      grepInvert: /@desktop/,
      use: {
        ...devices["Pixel 5"],
        storageState: AUTH_STATE_STAFF,
      },
    },
  ],
});
