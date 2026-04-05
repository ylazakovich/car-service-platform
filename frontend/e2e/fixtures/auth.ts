import type { Page } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";

/** Пути относительно `frontend/` (рядом с `playwright.config.ts`). */
export const AUTH_STATE_STAFF = "e2e/.auth/staff.json";
export const AUTH_STATE_ADMIN = "e2e/.auth/admin.json";

/**
 * После применения `storageState` staff — зайти в SPA (куки уже в контексте).
 */
export async function openStaffApp(page: Page): Promise<void> {
  await page.goto("/app");
}

/**
 * После применения `storageState` admin — тот же entry `/app`, роль из токена/сессии.
 */
export async function openAdminApp(page: Page): Promise<void> {
  await page.goto("/app");
}

/** Полный логин без storageState (локальная отладка, кастомные окружения). */
export async function signInStaffAndLandApp(page: Page): Promise<LoginPage> {
  const login = new LoginPage(page);
  await login.goto();
  await login.signInAsStaff();
  return login;
}

/** Полный логин admin без storageState. */
export async function signInAdminAndLandDashboard(page: Page): Promise<LoginPage> {
  const login = new LoginPage(page);
  await login.goto();
  await login.signInAsAdmin();
  return login;
}
