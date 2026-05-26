import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { AUTH_STATE_ADMIN, openAdminApp, openStaffApp } from "./fixtures/auth";
import { cleanupIsolatedRepair, createIsolatedRepair, type IsolatedRepairFixture } from "./fixtures/repairFactory";
import { StaffMobileNavigationPage } from "./pages/StaffMobileNavigationPage";
import { StaffRepairsPage } from "./pages/StaffRepairsPage";

const SERVICE_LINE_1 = "Oil change + filter replacement";
const SERVICE_LINE_2 = "Tire service";
const SUMMARY = `${SERVICE_LINE_1} +1`;

async function createMultiServiceRepair(
  page: import("@playwright/test").Page,
  status: "new" | "completed" = "completed",
) {
  const fixture = await createIsolatedRepair(page, {
    markerPrefix: "service-lines-e2e",
    status,
    assignMaster: true,
    serviceLines: [
      { name: SERVICE_LINE_1, catalog_service_id: null, catalog_service_price: "100.00", sort_order: 0 },
      { name: SERVICE_LINE_2, catalog_service_id: null, catalog_service_price: "50.00", sort_order: 1 },
    ],
  });
  await page.reload();
  return fixture;
}

/** Staff: read-only Services line in modal when not assignee; Kanban shows compact "+N" summary. */
test.describe("Repair service lines — Kanban summary @desktop", () => {
  let fixture: IsolatedRepairFixture;

  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
    fixture = await createMultiServiceRepair(page);
    await openStaffApp(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupIsolatedRepair(page, fixture);
  });

  test("completed test-owned card shows multi-service summary (+N)", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · kanban · isolated multi-service summary");
    const repairs = new StaffRepairsPage(page);
    await repairs.gotoRepairsSection();
    await repairs.expectRepairsKanbanVisible();

    const card = await repairs.repairKanbanCardByTrackingCode(fixture.trackingCode);
    await expect(card).toContainText(SUMMARY);
  });
});

test.describe("Repair service lines — Kanban summary @mobile-only", () => {
  let fixture: IsolatedRepairFixture;

  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
    await new StaffMobileNavigationPage(page).expectMobileWorkspaceMenuToggle();
    fixture = await createMultiServiceRepair(page);
    await openStaffApp(page);
    await new StaffMobileNavigationPage(page).expectMobileWorkspaceMenuToggle();
  });

  test.afterEach(async ({ page }) => {
    await cleanupIsolatedRepair(page, fixture);
  });

  test("completed test-owned card shows multi-service summary (+N) on narrow viewport", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · kanban · isolated multi-service summary (mobile)");
    const repairs = new StaffRepairsPage(page);
    await repairs.gotoRepairsSection();
    await repairs.expectRepairsKanbanVisible();

    const card = await repairs.repairKanbanCardByTrackingCode(fixture.trackingCode);
    await expect(card).toContainText(SUMMARY);
  });
});

test.describe("Repair service lines — modal editor @desktop", () => {
  test.use({ storageState: AUTH_STATE_ADMIN });
  let fixture: IsolatedRepairFixture;

  test.beforeEach(async ({ page }) => {
    await openAdminApp(page);
    await expect(page.getByRole("button", { name: "Users" })).toBeVisible({ timeout: 30_000 });
    fixture = await createMultiServiceRepair(page, "new");
    await openAdminApp(page);
    await expect(page.getByRole("button", { name: "Users" })).toBeVisible({ timeout: 30_000 });
  });

  test.afterEach(async ({ page }) => {
    await cleanupIsolatedRepair(page, fixture);
  });

  test("admin sees Services editor with test-owned lines and Add service", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · modal · admin multi-line services editor");
    const repairs = new StaffRepairsPage(page);
    await repairs.gotoRepairsSection();
    await repairs.openRepairCardByTrackingCode(fixture.trackingCode);

    const dialog = repairs.repairDialogByVehicleLabel(fixture.vehiclePlate, fixture.vehicleMake, fixture.vehicleModel);
    await expect(dialog).toBeVisible({ timeout: 20_000 });

    await expect(dialog.locator(".service-list")).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByLabel(`Line 1: ${SERVICE_LINE_1}`)).toHaveValue(SERVICE_LINE_1, { timeout: 15_000 });
    await expect(dialog.getByLabel(`Line 2: ${SERVICE_LINE_2}`)).toHaveValue(SERVICE_LINE_2, { timeout: 15_000 });
    await expect(dialog.getByRole("button", { name: "Add service" })).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Repair service lines — modal editor @mobile-only", () => {
  test.use({ storageState: AUTH_STATE_ADMIN });
  let fixture: IsolatedRepairFixture;

  test.beforeEach(async ({ page }) => {
    await openAdminApp(page);
    await new StaffMobileNavigationPage(page).waitForStaffNavigationChrome();
    fixture = await createMultiServiceRepair(page, "new");
    await openAdminApp(page);
    await new StaffMobileNavigationPage(page).waitForStaffNavigationChrome();
  });

  test.afterEach(async ({ page }) => {
    await cleanupIsolatedRepair(page, fixture);
  });

  test("admin sees Services editor with test-owned lines and Add service on narrow viewport", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · modal · admin multi-line services editor (mobile)");
    const repairs = new StaffRepairsPage(page);
    await repairs.gotoRepairsSection();
    await repairs.openRepairCardByTrackingCode(fixture.trackingCode);

    const dialog = repairs.repairDialogByVehicleLabel(fixture.vehiclePlate, fixture.vehicleMake, fixture.vehicleModel);
    await expect(dialog).toBeVisible({ timeout: 20_000 });

    await expect(dialog.locator(".service-list")).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByLabel(`Line 1: ${SERVICE_LINE_1}`)).toHaveValue(SERVICE_LINE_1, { timeout: 15_000 });
    await expect(dialog.getByLabel(`Line 2: ${SERVICE_LINE_2}`)).toHaveValue(SERVICE_LINE_2, { timeout: 15_000 });
    await expect(dialog.getByRole("button", { name: "Add service" })).toBeVisible({ timeout: 10_000 });
  });
});
