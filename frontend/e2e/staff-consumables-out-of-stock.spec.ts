import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { AUTH_STATE_ADMIN, openAdminApp } from "./fixtures/auth";
import { StaffMobileNavigationPage } from "./pages/StaffMobileNavigationPage";
import { StaffRecordsRegistryPage } from "./pages/StaffRecordsRegistryPage";

/**
 * Расходники с нулевым остатком после инвентаризации: регион «Out of stock consumables».
 * Демо: как минимум одна строка с инвентаризацией и нулём на остатке — см. `UPDATE` в `scripts/demo/demo_data.sql`.
 */

test.describe("Consumables out of stock @desktop", () => {
  test.use({ storageState: AUTH_STATE_ADMIN });

  test.beforeEach(async ({ page }) => {
    await openAdminApp(page);
    await new StaffMobileNavigationPage(page).waitForStaffNavigationChrome();
    await expect(page.getByRole("button", { name: "Users" })).toBeVisible({ timeout: 30_000 });
  });

  test("admin expands Out of stock and sees desktop OOS row", async ({ page }) => {
    await e2eBehaviors("admin", "purchases · consumables · out of stock section");
    const reg = new StaffRecordsRegistryPage(page);
    await reg.gotoPurchasesConsumablesTab();

    const toggle = page.getByRole("button", { name: /Show Out of stock \(\d+\)|Hide Out of stock \(\d+\)/ });
    await expect(toggle).toBeVisible({ timeout: 25_000 });
    const toggleLabel = await toggle.textContent();
    if (toggleLabel?.trim().startsWith("Show")) {
      await toggle.click();
    }

    const oosRegion = page.getByRole("region", { name: "Out of stock consumables" });
    await expect(oosRegion.getByRole("spinbutton", { name: /On hand .+ out of stock/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(oosRegion.locator("tbody.purchases-compact-list tr").first()).toBeVisible();
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
    const reg = new StaffRecordsRegistryPage(page);
    await reg.gotoPurchasesConsumablesTab();

    const toggle = page.getByRole("button", { name: /Show Out of stock \(\d+\)|Hide Out of stock \(\d+\)/ });
    await expect(toggle).toBeVisible({ timeout: 25_000 });
    const toggleLabel = await toggle.textContent();
    if (toggleLabel?.trim().startsWith("Show")) {
      // `.shell-scroll-to-header-fab` can cover the toggle on narrow viewports (same as Kanban "Show more").
      await toggle.click({ force: true });
    }

    const oosRegion = page.getByRole("region", { name: "Out of stock consumables" });
    await expect(oosRegion.locator(".purchases-mobile-consumable-list--oos")).toBeVisible({ timeout: 15_000 });
    /** Mobile OOS cards use the same aria-label as stock rows (`On hand {part}`), without the desktop «out of stock» suffix. */
    await expect(oosRegion.locator(".purchases-mobile-consumable-list--oos .purchases-mobile-consumable-name").first()).toBeVisible();
  });
});
