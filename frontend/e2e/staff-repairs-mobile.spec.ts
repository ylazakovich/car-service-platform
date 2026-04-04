import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { navigateToStaffRepairs, openSeededRepairCard } from "./helpers/repair-board";

const STAFF_EMAIL = process.env.E2E_STAFF_EMAIL ?? "staff@autoservice.local";
const STAFF_PASSWORD = process.env.E2E_STAFF_PASSWORD ?? "change-me-in-production";

/**
 * @mobile-only — только проект mobile-chrome (см. playwright.config.ts grepInvert).
 * Проверяет мобильный список ремонтов и открытие сидированной карточки.
 */
test.describe("Staff repairs mobile @mobile-only", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("textbox", { name: "Email" }).fill(STAFF_EMAIL);
    await page.getByRole("textbox", { name: "Password" }).fill(STAFF_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/app/);
  });

  test("mobile list, tabbar, and seeded completed repair modal", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · mobile list · open seeded job");
    await expect(page.getByRole("navigation", { name: "Staff quick navigation" })).toBeVisible({
      timeout: 15_000,
    });

    await navigateToStaffRepairs(page);
    await expect(page.getByLabel("Mobile repairs list")).toBeVisible({ timeout: 25_000 });

    await openSeededRepairCard(page);
    await expect(page.getByRole("dialog", { name: /E2E-CI-001|Demo Sedan/ })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: "View PDF" })).toBeVisible();
  });
});
