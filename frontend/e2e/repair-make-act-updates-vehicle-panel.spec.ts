import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { E2E_DEMO_REPAIR_TRACKING_CODE, E2E_DEMO_REPAIR_VEHICLE_PLATE } from "./e2e-seed";
import { openStaffApp } from "./fixtures/auth";
import { StaffMobileNavigationPage } from "./pages/StaffMobileNavigationPage";
import { StaffRecordsRegistryPage } from "./pages/StaffRecordsRegistryPage";
import { StaffRepairsPage } from "./pages/StaffRepairsPage";

/**
 * Regression: after Make Act the Vehicle detail panel must show Act Total
 * without a page reload (fixed: fetchRepair used trailing slash → 404 → silent catch
 * set only has_pdf:true, skipped latest_act_document_total update).
 *
 * Requires Docker Compose with demo data (`scripts/demo/demo_data.sql`).
 */
test.describe("Make Act → Vehicle panel shows act total without reload @desktop", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
  });

  test("act total appears in Vehicle detail panel immediately after Make Act", async ({ page }) => {
    await e2eBehaviors("staff", "repair · make-act · vehicle panel updates without reload");

    const repairs = new StaffRepairsPage(page);
    const registry = new StaffRecordsRegistryPage(page);

    // Step 1: open TOR-1001, generate act via Make Act / View PDF button
    await repairs.gotoRepairsSection();
    await repairs.openSeededRepairCard();
    await repairs.expectRepairDetailDialogVisible();

    // Intercept the GET /repairs/{id} call that markRepairPdfAvailable issues after export
    const fetchRepairPromise = page.waitForResponse(
      (res) =>
        res.request().method() === "GET" &&
        /\/api\/repairs\/\d+$/.test(res.url()) &&
        res.status() === 200,
      { timeout: 30_000 },
    );

    await repairs.openCertificateFromViewPdf();

    // Wait for the repair re-fetch to confirm the fix is in place (no trailing-slash 404)
    const fetchRepairResponse = await fetchRepairPromise;
    const repairData = await fetchRepairResponse.json() as { latest_act_document_total?: number | null };
    expect(repairData.latest_act_document_total).not.toBeNull();

    await repairs.closeCertificateDialog();

    // Close the repair modal by pressing Escape / clicking Cancel
    await page.getByRole("dialog", { name: /AA 1234 BB/ }).getByRole("button", { name: "Cancel" }).click();

    // Step 2: go to Vehicles, open detail panel for AA 1234 BB — WITHOUT page reload
    // Navigate directly without waitForResponse: vehicles data may already be in SPA state (no new network request)
    await new StaffMobileNavigationPage(page).gotoStaffSection("Vehicles");
    await expect(page.locator(".vehicles-workspace")).toBeVisible({ timeout: 25_000 });

    const vehicleRow = registry.vehicleRowByPlate(E2E_DEMO_REPAIR_VEHICLE_PLATE, "desktop");
    await expect(vehicleRow).toBeVisible({ timeout: 15_000 });
    await vehicleRow.click();

    const vehicleDialog = page.getByRole("dialog", { name: E2E_DEMO_REPAIR_VEHICLE_PLATE });
    await expect(vehicleDialog).toBeVisible({ timeout: 15_000 });

    // Step 3: the Repairs and act totals table should show a monetary value for TOR-1001 row
    const actTotalsRegion = vehicleDialog.getByRole("region", { name: "Repairs and act totals" });
    await expect(actTotalsRegion).toBeVisible({ timeout: 10_000 });

    const tor1001Row = actTotalsRegion.getByRole("button", {
      name: new RegExp(`${E2E_DEMO_REPAIR_TRACKING_CODE}.*open repair`),
    });
    // Scroll into view — other e2e tests may have created extra repairs for this vehicle
    await tor1001Row.scrollIntoViewIfNeeded({ timeout: 15_000 });

    // The money cell must NOT contain "—" (i.e. the null placeholder)
    const moneyCell = tor1001Row.locator(".vehicle-history-td--money");
    await expect(moneyCell).not.toHaveClass(/vehicle-history-td--money-na/);
    await expect(moneyCell).not.toHaveText("—");
    // Should contain a currency amount (e.g. "115,00 zł" or similar)
    await expect(moneyCell).toContainText(/\d/);
  });
});
