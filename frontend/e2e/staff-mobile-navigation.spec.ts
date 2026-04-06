import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { openStaffApp } from "./fixtures/auth";
import { StaffMobileNavigationPage } from "./pages/StaffMobileNavigationPage";
import { StaffRepairsPage } from "./pages/StaffRepairsPage";

/**
 * @mobile-only — проект mobile-chrome (Pixel 5, ≤820px).
 * Покрывает мобильный staff-shell из ветки: шапка, drawer, task switcher, Add New Repair, список ТС, FAB «Jump to top».
 */
test.describe("Staff mobile shell and navigation @mobile-only", () => {
  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
  });

  test("workspace menu switches Vehicles and Repairs; header title matches section", async ({ page }) => {
    await e2eBehaviors("staff", "mobile · workspace menu · section header");
    const nav = new StaffMobileNavigationPage(page);
    await nav.waitForStaffNavigationChrome();

    if (!(await nav.workspaceMenuToggle().isVisible())) {
      test.skip(true, "Mobile workspace header toggle not visible (desktop layout?)");
    }

    // На ≤820px `.staff-mobile-switcher` скрыт в CSS — смена секций только через shell picker.
    await nav.openWorkspaceMenu();
    await nav.staffQuickNav().getByRole("button", { name: "Repairs" }).click();
    await nav.expectHeaderShows("Repairs");

    await nav.openWorkspaceMenu();
    await nav.staffQuickNav().getByRole("button", { name: "Vehicles" }).click();
    await nav.expectHeaderShows("Vehicles");
  });

  test("workspace menu lists only staff sections, then closes on backdrop", async ({ page }) => {
    await e2eBehaviors("staff", "mobile · workspace menu · backdrop");
    const nav = new StaffMobileNavigationPage(page);
    await nav.waitForStaffNavigationChrome();

    if (!(await nav.workspaceMenuToggle().isVisible())) {
      test.skip(true, "Mobile workspace header toggle not visible (desktop layout?)");
    }

    await nav.openWorkspaceMenu();
    const quickSections = page.locator(".shell-mobile-quick-sections");
    await expect(quickSections.getByRole("button", { name: "Dashboard" })).toHaveCount(0);
    await expect(quickSections.getByRole("button", { name: "Vehicles" })).toBeVisible();
    await expect(quickSections.getByRole("button", { name: "Repairs" })).toBeVisible();

    await nav.closeWorkspaceMenuViaBackdrop();
    await expect(nav.workspaceMenuToggle()).toHaveAttribute("aria-label", /Open workspace menu/);
  });

  test("Add New Repair from workspace menu opens create dialog", async ({ page }) => {
    await e2eBehaviors("staff", "mobile · Add New Repair · modal");
    const nav = new StaffMobileNavigationPage(page);
    await nav.waitForStaffNavigationChrome();

    if (!(await nav.workspaceMenuToggle().isVisible())) {
      test.skip(true, "Mobile workspace header toggle not visible (desktop layout?)");
    }

    await nav.openWorkspaceMenu();
    await page.getByRole("button", { name: "Add New Repair" }).click();

    await expect(page.getByRole("heading", { name: "Create Repair" })).toBeVisible({ timeout: 15_000 });
    const formModal = page.locator(".repair-form-modal");
    await formModal.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("heading", { name: "Create Repair" })).toBeHidden();
  });

  test("mobile vehicles list opens detail with Open Repairs affordance", async ({ page }) => {
    await e2eBehaviors("staff", "mobile · vehicles list · detail");
    const nav = new StaffMobileNavigationPage(page);
    await nav.gotoStaffSection("Vehicles");

    const openVehicle = page.getByRole("button", { name: /^Open vehicle / }).first();
    try {
      await openVehicle.waitFor({ state: "visible", timeout: 25_000 });
    } catch {
      test.skip(
        true,
        "Нет ТС в API (ожидается demo/demo_data.sql или иной сид с ТС) — в пустом реестре нет Mobile vehicles list",
      );
      return;
    }

    await expect(page.getByLabel("Mobile vehicles list")).toBeVisible();
    await openVehicle.click();

    await expect(page.getByLabel("Mobile vehicle details")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Open Repairs" })).toBeVisible();
  });

  test("Jump to top FAB scrolls up and focuses workspace menu toggle", async ({ page }) => {
    await e2eBehaviors("staff", "mobile · scroll · FAB");
    const nav = new StaffMobileNavigationPage(page);
    const repairs = new StaffRepairsPage(page);
    await repairs.gotoRepairsSection();
    await repairs.expectRepairsKanbanVisible();

    await page.evaluate(() => {
      const root = document.scrollingElement ?? document.documentElement;
      root.scrollTop = root.scrollHeight;
    });

    const fab = page.getByRole("button", { name: "Jump to top of page and focus workspace menu" });
    await expect(fab).toBeVisible({ timeout: 12_000 });
    await fab.click();

    await expect
      .poll(
        async () => {
          const y = await page.evaluate(() => window.scrollY || document.documentElement.scrollTop);
          return y;
        },
        { timeout: 8_000 },
      )
      .toBeLessThan(80);

    await expect(nav.workspaceMenuToggle()).toBeFocused({ timeout: 3_000 });
  });
});
