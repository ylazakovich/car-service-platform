import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { E2E_DEMO_REPAIR_KANBAN_SERVICES_SUMMARY, E2E_DEMO_REPAIR_TRACKING_CODE } from "./e2e-seed";
import { openStaffApp } from "./fixtures/auth";
import { StaffRepairsPage } from "./pages/StaffRepairsPage";

/**
 * @mobile-only — только проект mobile-chrome (см. playwright.config.ts grepInvert).
 * Проверяет мобильный список ремонтов и открытие демо-карточки (TOR-1001 из scripts/demo/demo_data.sql).
 */
test.describe("Staff repairs mobile @mobile-only", () => {
  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
  });

  test("mobile list, quick nav, and seeded completed repair modal", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · mobile list · open demo TOR-1001");
    const repairs = new StaffRepairsPage(page);

    await expect(repairs.staffMobileWorkspaceMenuToggle()).toBeVisible({ timeout: 15_000 });

    await repairs.gotoRepairsSection();
    await repairs.expectRepairsKanbanVisible();

    const demoCard = page
      .getByLabel("Repairs kanban board")
      .locator(".kanban-card")
      .filter({ hasText: `#${E2E_DEMO_REPAIR_TRACKING_CODE}` });
    await expect(demoCard).toContainText(E2E_DEMO_REPAIR_KANBAN_SERVICES_SUMMARY);

    await repairs.openSeededRepairCard();
    await repairs.expectRepairDetailDialogVisible();
    await expect(repairs.repairPdfPrimaryButton()).toBeVisible();
  });
});
