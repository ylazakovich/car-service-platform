import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { openStaffApp } from "./fixtures/auth";
import { cleanupE2eData, cleanupRepairsByIssueMarker, createE2eCustomerWithVehicle, createE2eService } from "./fixtures/e2eDataFactory";
import { StaffRepairsPage } from "./pages/StaffRepairsPage";

function uniqueIssueMarker(): string {
  return `e2e-intake-${Date.now()}`;
}

test.describe("Staff repair intake — create kanban card @desktop", () => {
  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
  });

  test("desktop: New Repair → intake → card on board", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · intake · create card (desktop)");
    const repairs = new StaffRepairsPage(page);
    const marker = uniqueIssueMarker();
    let fixture: Awaited<ReturnType<typeof createE2eCustomerWithVehicle>> | null = null;
    let service: Awaited<ReturnType<typeof createE2eService>> | null = null;

    try {
      fixture = await createE2eCustomerWithVehicle(page, "intake-create");
      service = await createE2eService(page, "E2E intake service");
      await openStaffApp(page);
      await repairs.gotoRepairsSection();
      await repairs.expectRepairsKanbanVisible();

      await repairs.openNewRepairIntakeModal();
      await repairs.fillCreateRepairForm(marker, fixture.vehiclePlate, service.name);
      await repairs.submitCreateRepair();

      await expect(page.getByRole("dialog", { name: /New Repair/ })).toBeHidden({
        timeout: 25_000,
      });
      await repairs.expectKanbanCardShowsIssueNotes(marker);
    } finally {
      await cleanupRepairsByIssueMarker(page, marker);
      await cleanupE2eData(page, {
        serviceIds: service ? [service.id] : [],
        vehicleIds: fixture ? [fixture.vehicleId] : [],
        customerIds: fixture ? [fixture.customerId] : [],
      });
    }
  });
});

test.describe("Staff repair intake — create kanban card @mobile-only", () => {
  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
  });

  test("mobile: New Repair → intake → card on board", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · intake · create card (mobile)");
    const repairs = new StaffRepairsPage(page);
    const marker = uniqueIssueMarker();
    let fixture: Awaited<ReturnType<typeof createE2eCustomerWithVehicle>> | null = null;
    let service: Awaited<ReturnType<typeof createE2eService>> | null = null;

    try {
      fixture = await createE2eCustomerWithVehicle(page, "intake-create-mobile");
      service = await createE2eService(page, "E2E mobile intake service");
      await openStaffApp(page);
      await expect(repairs.staffMobileWorkspaceMenuToggle()).toBeVisible({ timeout: 20_000 });

      await repairs.gotoRepairsSection();
      await repairs.expectRepairsKanbanVisible();

      await repairs.openNewRepairIntakeModal();
      await repairs.fillCreateRepairForm(marker, fixture.vehiclePlate, service.name);
      await repairs.submitCreateRepair();

      await expect(page.getByRole("dialog", { name: /New Repair/ })).toBeHidden({
        timeout: 25_000,
      });
      await repairs.expectKanbanCardShowsIssueNotes(marker);
    } finally {
      await cleanupRepairsByIssueMarker(page, marker);
      await cleanupE2eData(page, {
        serviceIds: service ? [service.id] : [],
        vehicleIds: fixture ? [fixture.vehicleId] : [],
        customerIds: fixture ? [fixture.customerId] : [],
      });
    }
  });
});
