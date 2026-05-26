import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { openStaffApp } from "./fixtures/auth";
import { cleanupIsolatedRepair, createIsolatedRepair, type IsolatedRepairFixture } from "./fixtures/repairFactory";
import { StaffMobileNavigationPage } from "./pages/StaffMobileNavigationPage";
import { StaffRecordsRegistryPage } from "./pages/StaffRecordsRegistryPage";
import { StaffRepairsPage } from "./pages/StaffRepairsPage";

/**
 * Regression: after Make Act the Vehicle detail panel must show Act Total
 * without a page reload (fixed: fetchRepair used trailing slash → 404 → silent catch
 * set only has_pdf:true, skipped latest_act_document_total update).
 */
test.describe("Make Act → Vehicle panel shows act total without reload @desktop", () => {
  test.describe.configure({ mode: "serial" });
  let fixture: IsolatedRepairFixture;

  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
    fixture = await createIsolatedRepair(page, {
      markerPrefix: "make-act-e2e",
      status: "completed",
      assignMaster: true,
      serviceName: "Make Act isolation service",
    });
    await page.reload();
    await openStaffApp(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupIsolatedRepair(page, fixture);
  });

  test("act total appears in Vehicle detail panel immediately after Make Act", async ({ page }) => {
    await e2eBehaviors("staff", "repair · make-act · vehicle panel updates without reload");

    const repairs = new StaffRepairsPage(page);
    const registry = new StaffRecordsRegistryPage(page);

    await repairs.gotoRepairsSection();
    await repairs.openRepairCardByTrackingCode(fixture.trackingCode);
    await expect(repairs.repairDialogByVehicleLabel(fixture.vehiclePlate, fixture.vehicleMake, fixture.vehicleModel)).toBeVisible();

    // Intercept the GET /repairs/{id} call that markRepairPdfAvailable issues after export.
    const fetchRepairPromise = page.waitForResponse(
      (res) => res.request().method() === "GET" && /\/api\/repairs\/\d+$/.test(res.url()) && res.status() === 200,
      { timeout: 30_000 },
    );

    await repairs.openCertificateFromViewPdf();

    // Wait for the repair re-fetch to confirm the fix is in place (no trailing-slash 404).
    const fetchRepairResponse = await fetchRepairPromise;
    const repairData = await fetchRepairResponse.json() as { latest_act_document_total?: number | null };
    expect(repairData.latest_act_document_total).not.toBeNull();

    await repairs.closeCertificateDialog();
    await repairs.repairDialogByVehicleLabel(fixture.vehiclePlate, fixture.vehicleMake, fixture.vehicleModel)
      .getByRole("button", { name: "Cancel" })
      .click();

    // Step 2: go to Vehicles, open detail panel for this test-owned vehicle — WITHOUT page reload.
    await new StaffMobileNavigationPage(page).gotoStaffSection("Vehicles");
    await expect(page.locator(".vehicles-workspace")).toBeVisible({ timeout: 25_000 });

    const vehicleRow = registry.vehicleRowByPlate(fixture.vehiclePlate, "desktop");
    await expect(vehicleRow).toBeVisible({ timeout: 15_000 });
    await vehicleRow.click();

    const vehicleDialog = page.getByRole("dialog", { name: fixture.vehiclePlate });
    await expect(vehicleDialog).toBeVisible({ timeout: 15_000 });

    const actTotalsRegion = vehicleDialog.getByRole("region", { name: "Repairs and act totals" });
    await expect(actTotalsRegion).toBeVisible({ timeout: 10_000 });

    const repairRow = actTotalsRegion.getByRole("button", {
      name: new RegExp(`${fixture.trackingCode}.*open repair`),
    });
    await repairRow.scrollIntoViewIfNeeded({ timeout: 15_000 });

    const moneyCell = repairRow.locator(".vehicle-history-td--money");
    await expect(moneyCell).not.toHaveClass(/vehicle-history-td--money-na/);
    await expect(moneyCell).not.toHaveText("—");
    await expect(moneyCell).toContainText(/\d/);
  });
});
