import { test as setup } from "@playwright/test";
import { AUTH_STATE_ADMIN, AUTH_STATE_STAFF } from "./fixtures/auth";
import { LoginPage } from "./pages/LoginPage";

/**
 * Один раз на прогон: сохраняем сессии для проектов с `storageState`.
 * Пути совпадают с `AUTH_STATE_*` в `fixtures/auth.ts` и `playwright.config.ts`.
 */
setup("authenticate staff", async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.signInAsStaff();
  await page.context().storageState({ path: AUTH_STATE_STAFF });
});

setup("authenticate admin", async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.signInAsAdmin();
  await page.context().storageState({ path: AUTH_STATE_ADMIN });
});
