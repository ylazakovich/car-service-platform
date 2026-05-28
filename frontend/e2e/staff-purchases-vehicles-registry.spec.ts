import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { AUTH_STATE_ADMIN, openAdminApp, openStaffApp } from "./fixtures/auth";
import {
  cleanupE2eData,
  createE2eCustomerWithVehicle,
  createE2ePurchase,
  createE2eUnit,
} from "./fixtures/e2eDataFactory";
import { cleanupIsolatedRepair, createIsolatedRepair } from "./fixtures/repairFactory";
import { StaffNavigationPage } from "./pages/StaffNavigationPage";
import { StaffRecordsRegistryPage } from "./pages/StaffRecordsRegistryPage";

/** Purchases / Vehicles registries create their own data; CI does not load demo data. */

test.describe("Purchases registry — table-only chrome @desktop", () => {
  test.use({ storageState: AUTH_STATE_ADMIN });

  test.beforeEach(async ({ page }) => {
    await openAdminApp(page);
    await new StaffNavigationPage(page).waitForStaffNavigationChrome();
    await expect(page.getByRole("button", { name: "Users" })).toBeVisible({ timeout: 30_000 });
  });

  test("admin sees compact rows without Cards/Compact or sort controls", async ({ page }) => {
    await e2eBehaviors("admin", "purchases · table-only registry");
    const unit = await createE2eUnit(page, "pur");
    const purchase = await createE2ePurchase(page, { unitId: unit.id, partPrefix: "E2E Castrol EDGE", delivered: false });
    try {
      await openAdminApp(page);
      const reg = new StaffRecordsRegistryPage(page);
      await reg.gotoPurchasesSection();
      await reg.expectPurchasesRegistryChrome();

      const row = reg.purchaseRowByPartSnippet(purchase.partName);
      await expect(row).toBeVisible({ timeout: 20_000 });
      await expect(row).toHaveAttribute("role", "button");
    } finally {
      await cleanupE2eData(page, { purchaseIds: [purchase.purchaseId], unitIds: [unit.id] });
    }
  });

  test("clicking a purchase row opens detail dialog", async ({ page }) => {
    await e2eBehaviors("admin", "purchases · row opens modal");
    const unit = await createE2eUnit(page, "purdlg");
    const purchase = await createE2ePurchase(page, { unitId: unit.id, partPrefix: "E2E Castrol EDGE", delivered: false });
    try {
      await openAdminApp(page);
      const reg = new StaffRecordsRegistryPage(page);
      await reg.gotoPurchasesSection();
      await reg.purchaseRowByPartSnippet(purchase.partName).click();

      const dialog = page.getByRole("dialog", { name: new RegExp(purchase.partName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") });
      await expect(dialog).toBeVisible({ timeout: 15_000 });
      await expect(dialog.getByRole("heading", { level: 3, name: new RegExp(purchase.partName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") })).toBeVisible({
        timeout: 10_000,
      });
    } finally {
      await cleanupE2eData(page, { purchaseIds: [purchase.purchaseId], unitIds: [unit.id] });
    }
  });
});

test.describe("Vehicles registry — table-only + act export hint @desktop", () => {
  test.describe.configure({ mode: "serial", timeout: 90_000 });

  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
  });

  test("staff sees compact rows without Cards/Compact or sort controls", async ({ page }) => {
    await e2eBehaviors("staff", "vehicles · table-only registry");
    const fixture = await createE2eCustomerWithVehicle(page, "vehicle-registry");
    try {
      const reg = new StaffRecordsRegistryPage(page);
      await reg.gotoVehiclesSection();
      await reg.expectVehiclesRegistryChrome();
      await reg.vehicleSearchInput("desktop").fill(fixture.vehiclePlate);

      await expect(page.locator(".vehicle-web-surface .purchases-compact-list")).toBeVisible({
        timeout: 45_000,
      });

      const row = reg.vehicleRowByPlate(fixture.vehiclePlate, "desktop");
      await expect(row).toBeVisible({ timeout: 45_000 });
    } finally {
      await cleanupE2eData(page, { vehicleIds: [fixture.vehicleId], customerIds: [fixture.customerId] });
    }
  });

  test("completed repair without PDF shows act-pending affordance", async ({ page }) => {
    await e2eBehaviors("staff", "vehicles · completed without exported act indicator");
    const fixture = await createIsolatedRepair(page, {
      markerPrefix: "vehicle-act-pending",
      status: "completed",
      assignMaster: true,
      serviceName: "Vehicle pending act service",
      vehicleModel: "Act Pending",
    });
    try {
      await openStaffApp(page);
      const reg = new StaffRecordsRegistryPage(page);
      await reg.gotoVehiclesSection();
      await reg.vehicleSearchInput("desktop").fill(fixture.vehiclePlate);

      const row = reg.vehicleRowByPlate(fixture.vehiclePlate, "desktop");
      await expect(row).toBeVisible({ timeout: 45_000 });
      await expect(row).toHaveClass(/vehicles-compact-row--needs-act/);
      await expect(row.locator(".vehicle-row-act-dot")).toBeVisible();
    } finally {
      await cleanupIsolatedRepair(page, fixture);
    }
  });
});

test.describe("Vehicles registry — mobile compact list @mobile-only", () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
  });

  test("mobile uses single-line rows and act indicator for test-owned plate", async ({ page }) => {
    await e2eBehaviors("staff", "vehicles · mobile · table row + act hint");
    const fixture = await createIsolatedRepair(page, {
      markerPrefix: "vehicle-act-mobile",
      status: "completed",
      assignMaster: true,
      serviceName: "Vehicle mobile pending act service",
      vehicleModel: "Mobile Act Pending",
    });
    try {
      await openStaffApp(page);
      const reg = new StaffRecordsRegistryPage(page);
      await reg.gotoVehiclesSection();
      await reg.vehicleSearchInput("mobile").fill(fixture.vehiclePlate);

      await expect(page.locator(".vehicles-mobile-surface .vehicles-mobile-compact-list")).toBeVisible({
        timeout: 45_000,
      });

      const row = reg.vehicleRowByPlate(fixture.vehiclePlate, "mobile");
      await expect(row).toBeVisible({ timeout: 45_000 });
      await expect(row).toHaveClass(/vehicles-compact-row--needs-act/);
      await expect(row.locator(".vehicle-row-act-dot")).toBeVisible();
    } finally {
      await cleanupIsolatedRepair(page, fixture);
    }
  });
});

test.describe("Purchases registry — mobile table @mobile-only", () => {
  test.use({ storageState: AUTH_STATE_ADMIN });

  test.beforeEach(async ({ page }) => {
    await openAdminApp(page);
    await new StaffNavigationPage(page).waitForStaffNavigationChrome();
  });

  test("admin reaches Purchases and sees compact list on narrow viewport", async ({ page }) => {
    await e2eBehaviors("admin", "purchases · mobile · compact list");
    const unit = await createE2eUnit(page, "mpur");
    const purchase = await createE2ePurchase(page, { unitId: unit.id, partPrefix: "E2E mobile Castrol EDGE" });
    try {
      await openAdminApp(page);
      const reg = new StaffRecordsRegistryPage(page);
      await reg.gotoPurchasesSection();
      await reg.expectPurchasesRegistryChrome();

      const row = reg.purchaseRowByPartSnippet(purchase.partName);
      await expect(row).toBeVisible({ timeout: 20_000 });
    } finally {
      await cleanupE2eData(page, { purchaseIds: [purchase.purchaseId], unitIds: [unit.id] });
    }
  });

  test("clicking a purchase row opens detail dialog on narrow viewport", async ({ page }) => {
    await e2eBehaviors("admin", "purchases · mobile · row opens modal");
    const unit = await createE2eUnit(page, "mpurd");
    const purchase = await createE2ePurchase(page, { unitId: unit.id, partPrefix: "E2E mobile Castrol EDGE" });
    try {
      await openAdminApp(page);
      const reg = new StaffRecordsRegistryPage(page);
      await reg.gotoPurchasesSection();
      await reg.purchaseRowByPartSnippet(purchase.partName).click();

      const dialog = page.getByRole("dialog", { name: new RegExp(purchase.partName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") });
      await expect(dialog).toBeVisible({ timeout: 15_000 });
      await expect(dialog.getByRole("heading", { level: 3, name: new RegExp(purchase.partName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") })).toBeVisible({
        timeout: 10_000,
      });
    } finally {
      await cleanupE2eData(page, { purchaseIds: [purchase.purchaseId], unitIds: [unit.id] });
    }
  });

  test("admin sees Purchases section tabs (Warehouse / Consumables / Suppliers) on narrow viewport", async ({
    page,
  }) => {
    await e2eBehaviors("admin", "purchases · mobile · tablist");
    const reg = new StaffRecordsRegistryPage(page);
    await reg.gotoPurchasesSection();

    await expect(page.getByRole("tablist", { name: "Purchases sections" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("tab", { name: "Warehouse" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Consumables" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Suppliers" })).toBeVisible();
  });
});
