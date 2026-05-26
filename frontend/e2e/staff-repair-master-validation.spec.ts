import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { AUTH_STATE_ADMIN, openAdminApp } from "./fixtures/auth";
import { cleanupIsolatedRepair, createIsolatedRepair, type IsolatedRepairFixture } from "./fixtures/repairFactory";
import { StaffRepairsPage } from "./pages/StaffRepairsPage";

const MASTER_ERROR = "Assign a master before moving to this status.";

async function createUnassignedWaitingRepair(page: import("@playwright/test").Page) {
  const fixture = await createIsolatedRepair(page, {
    markerPrefix: "master-validation-e2e",
    status: "new",
    assignMaster: false,
    serviceName: "Master validation isolation service",
    vehicleModel: "Unassigned Master",
  });
  await page.reload();
  await openAdminApp(page);
  return fixture;
}

async function openUnassignedRepairCard(repairs: StaffRepairsPage, fixture: IsolatedRepairFixture) {
  await repairs.openRepairCardByTrackingCode(fixture.trackingCode);
  const dialog = repairs.repairDialogByVehicleLabel(fixture.vehiclePlate, fixture.vehicleMake, fixture.vehicleModel);
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  return dialog;
}

test.describe("Staff repairs — master validation on status transition @desktop", () => {
  test.describe.configure({ mode: "serial" });
  test.use({ storageState: AUTH_STATE_ADMIN });
  let fixture: IsolatedRepairFixture;

  test.beforeEach(async ({ page }) => {
    await openAdminApp(page);
    fixture = await createUnassignedWaitingRepair(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupIsolatedRepair(page, fixture);
  });

  test(
    // regression: unassigned card could bypass master requirement via status switcher
    "Status switcher: clicking In Progress without master shows inline error on Master field",
    async ({ page }) => {
      await e2eBehaviors("staff", "repairs · master validation · status switcher → in_progress");
      const repairs = new StaffRepairsPage(page);

      await repairs.gotoRepairsSection();
      await repairs.expectRepairsKanbanVisible();

      const dialog = await openUnassignedRepairCard(repairs, fixture);
      await dialog.getByRole("button", { name: "In Progress" }).click();

      const masterError = dialog.locator(".field-row__error");
      await expect(masterError).toBeVisible({ timeout: 5_000 });
      await expect(masterError).toContainText(MASTER_ERROR);

      const masterSelect = dialog.locator("#repair-field-master");
      await expect(masterSelect).toHaveAttribute("aria-invalid", "true");
    },
  );

  test(
    // regression: unassigned card could bypass master requirement via status switcher
    "Status switcher: clicking Completed without master shows inline error on Master field",
    async ({ page }) => {
      await e2eBehaviors("staff", "repairs · master validation · status switcher → completed");
      const repairs = new StaffRepairsPage(page);

      await repairs.gotoRepairsSection();
      await repairs.expectRepairsKanbanVisible();

      const dialog = await openUnassignedRepairCard(repairs, fixture);
      await dialog.getByRole("button", { name: "Completed" }).click();

      const masterError = dialog.locator(".field-row__error");
      await expect(masterError).toBeVisible({ timeout: 5_000 });
      await expect(masterError).toContainText(MASTER_ERROR);

      const masterSelect = dialog.locator("#repair-field-master");
      await expect(masterSelect).toHaveAttribute("aria-invalid", "true");
    },
  );

});

test.describe("Staff repairs — master validation on drag & drop @desktop", () => {
  test.describe.configure({ mode: "serial" });
  test.use({ storageState: AUTH_STATE_ADMIN });
  let fixture: IsolatedRepairFixture;

  test.beforeEach(async ({ page }) => {
    await openAdminApp(page);
    fixture = await createUnassignedWaitingRepair(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupIsolatedRepair(page, fixture);
  });

  test(
    // regression: unassigned card could be dragged to In Progress column bypassing master check
    "Drag unassigned card to In Progress column opens modal with master error highlighted",
    async ({ page }) => {
      await e2eBehaviors("staff", "repairs · master validation · drag to in_progress");
      const repairs = new StaffRepairsPage(page);

      await repairs.gotoRepairsSection();
      const board = page.getByLabel("Repairs kanban board");
      await expect(board).toBeVisible({ timeout: 25_000 });

      const card = await repairs.repairKanbanCardByTrackingCode(fixture.trackingCode);
      const inProgressCol = board.locator(".kanban-col").nth(1);
      await expect(inProgressCol).toBeVisible({ timeout: 10_000 });

      await card.dragTo(inProgressCol);

      const dialog = repairs.repairDialogByVehicleLabel(fixture.vehiclePlate, fixture.vehicleMake, fixture.vehicleModel);
      await expect(dialog).toBeVisible({ timeout: 10_000 });

      const masterError = dialog.locator(".field-row__error");
      await expect(masterError).toBeVisible({ timeout: 5_000 });
      await expect(masterError).toContainText(MASTER_ERROR);

      await dialog.getByRole("button", { name: "Cancel" }).click();
      await expect(dialog).toBeHidden();
      await expect(card).toBeVisible({ timeout: 10_000 });
    },
  );

  test(
    // regression: unassigned card could be dragged to Completed column bypassing master check
    "Drag unassigned card to Completed column opens modal with master error highlighted",
    async ({ page }) => {
      await e2eBehaviors("staff", "repairs · master validation · drag to completed");
      const repairs = new StaffRepairsPage(page);

      await repairs.gotoRepairsSection();
      const board = page.getByLabel("Repairs kanban board");
      await expect(board).toBeVisible({ timeout: 25_000 });

      const card = await repairs.repairKanbanCardByTrackingCode(fixture.trackingCode);
      const completedCol = board.locator(".kanban-col").nth(3);
      await expect(completedCol).toBeVisible({ timeout: 10_000 });

      await card.dragTo(completedCol);

      const dialog = repairs.repairDialogByVehicleLabel(fixture.vehiclePlate, fixture.vehicleMake, fixture.vehicleModel);
      await expect(dialog).toBeVisible({ timeout: 10_000 });

      const masterError = dialog.locator(".field-row__error");
      await expect(masterError).toBeVisible({ timeout: 5_000 });
      await expect(masterError).toContainText(MASTER_ERROR);
    },
  );
});
