import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { AUTH_STATE_ADMIN, openAdminApp } from "./fixtures/auth";
import { cleanupE2eData, createE2ePurchase, createE2eUnit } from "./fixtures/e2eDataFactory";
import { StaffMobileNavigationPage } from "./pages/StaffMobileNavigationPage";
import { StaffRecordsRegistryPage } from "./pages/StaffRecordsRegistryPage";

/** Out-of-stock consumables create their own inventory snapshot; CI does not load demo data. */

test.describe("Consumables out of stock @desktop", () => {
  test.use({ storageState: AUTH_STATE_ADMIN });

  test.beforeEach(async ({ page }) => {
    await openAdminApp(page);
    await new StaffMobileNavigationPage(page).waitForStaffNavigationChrome();
    await expect(page.getByRole("button", { name: "Users" })).toBeVisible({ timeout: 30_000 });
  });

  test("admin expands Out of stock and sees desktop OOS row", async ({ page }) => {
    await e2eBehaviors("admin", "purchases · consumables · out of stock section");
    const purchaseIds: number[] = [];
    const unitIds: number[] = [];
    let purchase: { purchaseId: number; partName: string };

    try {
      const unit = await createE2eUnit(page, "oos");
      unitIds.push(unit.id);
      purchase = await createE2ePurchase(page, {
        unitId: unit.id,
        partPrefix: "E2E out of stock gloves",
        isShopConsumable: true,
        currentStockQuantity: "0.00",
        inventoryCheckedOn: new Date().toISOString().slice(0, 10),
      });
      purchaseIds.push(purchase.purchaseId);

      await openAdminApp(page);
      const reg = new StaffRecordsRegistryPage(page);
      await reg.gotoPurchasesConsumablesTab();

      const toggle = page.getByRole("button", { name: /Show Out of stock \(\d+\)|Hide Out of stock \(\d+\)/ });
      await expect(toggle).toBeVisible({ timeout: 25_000 });
      const toggleLabel = await toggle.textContent();
      if (toggleLabel?.trim().startsWith("Show")) {
        await toggle.click();
      }

      const oosRegion = page.getByRole("region", { name: "Out of stock consumables" });
      await expect(oosRegion.getByText(purchase.partName)).toBeVisible({ timeout: 15_000 });
      await expect(oosRegion.getByRole("spinbutton", { name: /On hand .+ out of stock/i }).first()).toBeVisible();
      await expect(oosRegion.locator("tbody.purchases-compact-list tr").filter({ hasText: purchase.partName })).toBeVisible();
    } finally {
      await cleanupE2eData(page, { purchaseIds, unitIds });
    }
  });
});

test.describe("Consumables out of stock @mobile-only", () => {
  test.use({ storageState: AUTH_STATE_ADMIN });

  test.beforeEach(async ({ page }) => {
    await openAdminApp(page);
    await new StaffMobileNavigationPage(page).waitForStaffNavigationChrome();
  });

  test("admin expands Out of stock on narrow viewport", async ({ page }) => {
    await e2eBehaviors("admin", "purchases · consumables · out of stock · mobile");
    let unit: { id: number } | null = null;
    let purchase: { purchaseId: number; partName: string } | null = null;

    try {
      unit = await createE2eUnit(page, "moos");
      purchase = await createE2ePurchase(page, {
        unitId: unit.id,
        partPrefix: "E2E mobile out of stock gloves",
        isShopConsumable: true,
        currentStockQuantity: "0.00",
        inventoryCheckedOn: new Date().toISOString().slice(0, 10),
      });

      await openAdminApp(page);
      const reg = new StaffRecordsRegistryPage(page);
      await reg.gotoPurchasesConsumablesTab();

      const toggle = page.getByRole("button", { name: /Show Out of stock \(\d+\)|Hide Out of stock \(\d+\)/ });
      await expect(toggle).toBeVisible({ timeout: 25_000 });
      const toggleLabel = await toggle.textContent();
      if (toggleLabel?.trim().startsWith("Show")) {
        await toggle.scrollIntoViewIfNeeded();
        await toggle.press("Enter");
      }

      const oosRegion = page.getByRole("region", { name: "Out of stock consumables" });
      await expect(oosRegion.getByText(purchase.partName)).toBeVisible({ timeout: 20_000 });
      const mobileOosName = oosRegion.locator(".purchases-mobile-consumable-list--oos .purchases-mobile-consumable-name").filter({ hasText: purchase.partName });
      const desktopOosQty = oosRegion.getByRole("spinbutton", { name: /On hand .+ out of stock/i });
      await expect(mobileOosName.or(desktopOosQty)).toBeVisible({ timeout: 20_000 });
    } finally {
      await cleanupE2eData(page, {
        purchaseIds: purchase ? [purchase.purchaseId] : [],
        unitIds: unit ? [unit.id] : [],
      });
    }
  });
});
