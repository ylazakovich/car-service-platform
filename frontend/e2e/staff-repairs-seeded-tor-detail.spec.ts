import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { openStaffApp } from "./fixtures/auth";
import { cleanupIsolatedRepair, createIsolatedRepair, type IsolatedRepairFixture } from "./fixtures/repairFactory";
import { StaffRepairsPage } from "./pages/StaffRepairsPage";

/** Без `@desktop` / `@mobile-only` в имени describe — выполняется в desktop-chrome и mobile-chrome. */
test.describe("Staff repairs — isolated kanban and detail", () => {
  let fixture: IsolatedRepairFixture;

  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
    fixture = await createIsolatedRepair(page, {
      markerPrefix: "kanban-detail-e2e",
      status: "completed",
      assignMaster: true,
      serviceLines: [
        { name: "Kanban detail oil service", catalog_service_id: null, catalog_service_price: "100.00", sort_order: 0 },
        { name: "Kanban detail filter service", catalog_service_id: null, catalog_service_price: "50.00", sort_order: 1 },
      ],
    });
    await page.reload();
    await openStaffApp(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupIsolatedRepair(page, fixture);
  });

  test("kanban shows test-owned card summary; opening card shows repair dialog with PDF affordance", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · isolated repair · kanban + detail (cross-viewport)");
    const repairs = new StaffRepairsPage(page);
    await repairs.gotoRepairsSection();
    await repairs.expectRepairsKanbanVisible();

    const card = await repairs.repairKanbanCardByTrackingCode(fixture.trackingCode);
    await expect(card).toContainText("Kanban detail oil service +1");

    await repairs.openRepairCardByTrackingCode(fixture.trackingCode);
    await expect(repairs.repairDialogByVehicleLabel(fixture.vehiclePlate, fixture.vehicleMake, fixture.vehicleModel)).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole("button", { name: "More actions" }).click();
    await expect(repairs.repairPdfPrimaryButton()).toBeVisible();
  });
});
