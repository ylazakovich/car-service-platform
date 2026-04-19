/**
 * UI Collection — собирает скриншоты, HTML, JSON-элементы и JSON-кнопок
 * для всех секций приложения (desktop + mobile) в папку /output/.
 *
 * Запуск:
 *   cd frontend && npx playwright test e2e/ui-collection.spec.ts
 */
import { test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import { AUTH_STATE_ADMIN, openAdminApp } from "./fixtures/auth";
import { LoginPage } from "./pages/LoginPage";
import { StaffMobileNavigationPage } from "./pages/StaffMobileNavigationPage";

const OUTPUT_DIR = resolve(process.cwd(), "../output");

mkdirSync(OUTPUT_DIR, { recursive: true });

type Section = "Dashboard" | "Vehicles" | "Repairs" | "Purchases" | "Registers" | "Users";

const SECTIONS: Section[] = ["Dashboard", "Vehicles", "Repairs", "Purchases", "Registers", "Users"];

async function saveArtifacts(
  page: import("@playwright/test").Page,
  prefix: string,
  key: string,
): Promise<void> {
  const base = resolve(OUTPUT_DIR, `${prefix}_${key.toLowerCase()}`);

  await page.screenshot({ path: `${base}.png`, fullPage: false });

  const html = await page.content();
  writeFileSync(`${base}.html`, html, "utf-8");

  const elements = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("*"))
      .slice(0, 500)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        id: el.id || undefined,
        classes: typeof el.className === "string" ? el.className.trim() || undefined : undefined,
        text: el.textContent?.trim().slice(0, 80) || undefined,
        role: el.getAttribute("role") || undefined,
        ariaLabel: el.getAttribute("aria-label") || undefined,
      }));
  });
  writeFileSync(`${base}.json`, JSON.stringify(elements, null, 2), "utf-8");

  const buttons = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll<HTMLElement>(
        'button, [role="button"], a[href], input[type="submit"], input[type="button"]',
      ),
    ).map((el) => ({
      tag: el.tagName.toLowerCase(),
      text: el.textContent?.trim().slice(0, 80) || undefined,
      ariaLabel: el.getAttribute("aria-label") || undefined,
      href: el.getAttribute("href") || undefined,
      type: el.getAttribute("type") || undefined,
      disabled: (el as HTMLButtonElement).disabled || undefined,
    })),
  );
  writeFileSync(`${base}_buttons.json`, JSON.stringify(buttons, null, 2), "utf-8");

  console.log(`  ✓ ${prefix}_${key}: ${buttons.length} buttons`);
}

/** Login page — не требует авторизации, запускается в обоих проектах */
test.describe("UI collection · login page", () => {
  test("collect login page", async ({ page }, testInfo) => {
    const prefix = testInfo.project.name.startsWith("mobile") ? "mobile" : "desktop";
    const login = new LoginPage(page);
    await login.goto();
    await page.waitForLoadState("networkidle");
    await saveArtifacts(page, prefix, "login");
  });
});

/** Staff sections — admin storageState, запускается в обоих проектах */
test.describe("UI collection · staff sections", () => {
  test.use({ storageState: AUTH_STATE_ADMIN });

  for (const section of SECTIONS) {
    test(`collect section: ${section}`, async ({ page }, testInfo) => {
      const prefix = testInfo.project.name.startsWith("mobile") ? "mobile" : "desktop";

      await openAdminApp(page);
      const nav = new StaffMobileNavigationPage(page);
      await nav.gotoStaffSection(section);
      await page.waitForLoadState("networkidle");

      await saveArtifacts(page, prefix, section);
    });
  }
});
