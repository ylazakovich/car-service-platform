import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { openStaffApp } from "./fixtures/auth";
import { StaffRepairsPage } from "./pages/StaffRepairsPage";

/**
 * @mobile-only — только проект mobile-chrome (см. playwright.config.ts grepInvert).
 * Проверяет мобильный список ремонтов и открытие сидированной карточки.
 */
test.describe("Staff repairs mobile @mobile-only", () => {
  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
  });

  test("mobile list, tabbar, and seeded completed repair modal", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · mobile list · open seeded job");
    const repairs = new StaffRepairsPage(page);

    await expect(repairs.staffQuickNav()).toBeVisible({ timeout: 15_000 });

    await repairs.gotoRepairsSection();
    await repairs.expectMobileRepairsListVisible();

    await repairs.openSeededRepairCard();
    await repairs.expectRepairDetailDialogVisible();
    await expect(repairs.viewPdfButton()).toBeVisible();
  });
});
