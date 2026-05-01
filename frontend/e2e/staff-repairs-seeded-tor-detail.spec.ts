import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { E2E_DEMO_REPAIR_KANBAN_SERVICES_SUMMARY, E2E_DEMO_REPAIR_TRACKING_CODE } from "./e2e-seed";
import { openStaffApp } from "./fixtures/auth";
import { StaffRepairsPage } from "./pages/StaffRepairsPage";

/**
 * Без `@desktop` / `@mobile-only` в имени describe — выполняется в desktop-chrome и mobile-chrome.
 * Демо-ремонт TOR-1001 из `scripts/demo/demo_data.sql`.
 */
test.describe("Staff repairs — seeded TOR-1001 kanban and detail", () => {
  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
  });

  test("kanban shows demo card summary; opening card shows repair dialog with PDF affordance", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · TOR-1001 · kanban + detail (cross-viewport)");
    const repairs = new StaffRepairsPage(page);
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
