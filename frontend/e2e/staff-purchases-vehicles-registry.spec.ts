import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import {
  E2E_DEMO_PURCHASE_PART_SUBSTRING,
  E2E_DEMO_VEHICLE_NEEDS_ACT_PLATE,
} from "./e2e-seed";
import { AUTH_STATE_ADMIN, openAdminApp, openStaffApp } from "./fixtures/auth";
import { StaffMobileNavigationPage } from "./pages/StaffMobileNavigationPage";
import { StaffRecordsRegistryPage } from "./pages/StaffRecordsRegistryPage";

/**
 * Табличные реестры Purchases / Vehicles и индикатор «завершённый ремонт без выгруженного акта (PDF)».
 * Данные: `scripts/demo/demo_data.sql` (CI и локально после `bash scripts/db/load-demo.sh`).
 */

test.describe("Purchases registry — table-only chrome @desktop", () => {
  test.use({ storageState: AUTH_STATE_ADMIN });

  test.beforeEach(async ({ page }) => {
    await openAdminApp(page);
    await new StaffMobileNavigationPage(page).waitForStaffNavigationChrome();
    await expect(page.getByRole("button", { name: "Users" })).toBeVisible({ timeout: 30_000 });
  });

  test("admin sees compact rows without Cards/Compact or sort controls", async ({ page }) => {
    await e2eBehaviors("admin", "purchases · table-only registry");
    const reg = new StaffRecordsRegistryPage(page);
    await reg.gotoPurchasesSection();
    await reg.expectPurchasesRegistryChrome();

    const row = reg.purchaseRowByPartSnippet(E2E_DEMO_PURCHASE_PART_SUBSTRING);
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row).toHaveAttribute("role", "button");
  });

  test("clicking a purchase row opens detail dialog", async ({ page }) => {
    await e2eBehaviors("admin", "purchases · row opens modal");
    const reg = new StaffRecordsRegistryPage(page);
    await reg.gotoPurchasesSection();
    await reg.purchaseRowByPartSnippet(E2E_DEMO_PURCHASE_PART_SUBSTRING).click();

    const dialog = page.getByRole("dialog", { name: new RegExp(E2E_DEMO_PURCHASE_PART_SUBSTRING, "i") });
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByRole("heading", { level: 3, name: new RegExp(E2E_DEMO_PURCHASE_PART_SUBSTRING, "i") })).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe("Vehicles registry — table-only + act export hint @desktop", () => {
  test.describe.configure({ mode: "serial", timeout: 90_000 });

  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
  });

  test("staff sees compact rows without Cards/Compact or sort controls", async ({ page }) => {
    await e2eBehaviors("staff", "vehicles · table-only registry");
    const reg = new StaffRecordsRegistryPage(page);
    await reg.gotoVehiclesSection();
    await reg.expectVehiclesRegistryChrome();

    await expect(page.locator(".vehicle-web-surface .purchases-compact-list")).toBeVisible({
      timeout: 45_000,
    });

    const row = reg.vehicleRowByPlate(E2E_DEMO_VEHICLE_NEEDS_ACT_PLATE, "desktop");
    await expect(row).toBeVisible({ timeout: 45_000 });
  });

  test("demo vehicle with completed repair and no PDF shows act-pending affordance", async ({ page }) => {
    await e2eBehaviors("staff", "vehicles · completed without exported act indicator");
    const reg = new StaffRecordsRegistryPage(page);
    await reg.gotoVehiclesSection();

    const row = reg.vehicleRowByPlate(E2E_DEMO_VEHICLE_NEEDS_ACT_PLATE, "desktop");
    await expect(row).toBeVisible({ timeout: 45_000 });
    await expect(row).toHaveClass(/vehicles-compact-row--needs-act/);
    await expect(row.locator(".vehicle-row-act-dot")).toBeVisible();
  });
});

test.describe("Vehicles registry — mobile compact list @mobile-only", () => {
  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
  });

  test("mobile uses single-line rows and act indicator for seeded plate", async ({ page }) => {
    await e2eBehaviors("staff", "vehicles · mobile · table row + act hint");
    const reg = new StaffRecordsRegistryPage(page);
    await reg.gotoVehiclesSection();

    await expect(page.locator(".vehicles-mobile-surface .vehicles-mobile-compact-list")).toBeVisible({
      timeout: 45_000,
    });

    const row = reg.vehicleRowByPlate(E2E_DEMO_VEHICLE_NEEDS_ACT_PLATE, "mobile");
    await expect(row).toBeVisible({ timeout: 45_000 });
    await expect(row).toHaveClass(/vehicles-compact-row--needs-act/);
    await expect(row.locator(".vehicle-row-act-dot")).toBeVisible();
  });
});

test.describe("Purchases registry — mobile table @mobile-only", () => {
  test.use({ storageState: AUTH_STATE_ADMIN });

  test.beforeEach(async ({ page }) => {
    await openAdminApp(page);
    await new StaffMobileNavigationPage(page).waitForStaffNavigationChrome();
  });

  test("admin reaches Purchases and sees compact list on narrow viewport", async ({ page }) => {
    await e2eBehaviors("admin", "purchases · mobile · compact list");
    const reg = new StaffRecordsRegistryPage(page);
    await reg.gotoPurchasesSection();
    await reg.expectPurchasesRegistryChrome();

    const row = reg.purchaseRowByPartSnippet(E2E_DEMO_PURCHASE_PART_SUBSTRING);
    await expect(row).toBeVisible({ timeout: 20_000 });
  });
});
