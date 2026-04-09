import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import {
  E2E_DEMO_CUSTOMER_WITH_VEHICLES_NAME,
  E2E_DEMO_SERVICE_NAME_IN_CATALOG,
} from "./e2e-seed";
import { AUTH_STATE_ADMIN, openAdminApp } from "./fixtures/auth";
import { StaffMobileNavigationPage } from "./pages/StaffMobileNavigationPage";
import { StaffRegistersPage } from "./pages/StaffRegistersPage";

/**
 * **Registers** (admin): units of measure, services catalog, customers with vehicles.
 * Данные: `demo/demo_data.sql` + миграции (UoM seed).
 */

test.describe("Registers workspace @desktop", () => {
  test.use({ storageState: AUTH_STATE_ADMIN });

  test.beforeEach(async ({ page }) => {
    await openAdminApp(page);
    await new StaffMobileNavigationPage(page).waitForStaffNavigationChrome();
    await expect(page.getByRole("button", { name: "Registers" })).toBeVisible({ timeout: 30_000 });
  });

  test("admin opens Registers on Units tab and sees seeded UoM code", async ({ page }) => {
    await e2eBehaviors("admin", "registers · units of measure tab");
    const reg = new StaffRegistersPage(page);
    await reg.gotoRegistersSection();
    await reg.expectUnitsTabActive();
    await expect(reg.uomCodeCell("pcs")).toBeVisible({ timeout: 20_000 });
  });

  test("admin switches to Services, search filters catalog row", async ({ page }) => {
    await e2eBehaviors("admin", "registers · services search");
    const reg = new StaffRegistersPage(page);
    await reg.gotoRegistersSection();
    await expect
      .poll(async () => page.getByRole("tab", { name: "Units of measure" }).getAttribute("aria-selected"))
      .toBe("true");

    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/services") && r.request().method() === "GET" && r.status() === 200,
        { timeout: 30_000 },
      ),
      reg.openTab("Services"),
    ]);

    await reg.expectServicesWorkspaceVisible();
    await expect(page.locator(".services-register-page").getByText("Loading…")).toHaveCount(0, { timeout: 20_000 });

    await reg.servicesSearchInput().fill(E2E_DEMO_SERVICE_NAME_IN_CATALOG);
    const row = reg.serviceRowByNameSnippet(E2E_DEMO_SERVICE_NAME_IN_CATALOG);
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row.getByRole("group", { name: new RegExp(E2E_DEMO_SERVICE_NAME_IN_CATALOG, "i") })).toBeVisible();
  });

  test("admin switches to Customers and sees demo customer with vehicles", async ({ page }) => {
    await e2eBehaviors("admin", "registers · customers with vehicles");
    const reg = new StaffRegistersPage(page);
    await reg.gotoRegistersSection();
    await reg.openTab("Customers");
    await reg.expectCustomersWorkspaceVisible();

    const row = reg.customerRowByName(E2E_DEMO_CUSTOMER_WITH_VEHICLES_NAME);
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row.getByRole("button", { name: "Edit" })).toBeVisible();
  });
});

test.describe("Registers workspace @mobile-only", () => {
  test.use({ storageState: AUTH_STATE_ADMIN });

  test.beforeEach(async ({ page }) => {
    await openAdminApp(page);
    await new StaffMobileNavigationPage(page).waitForStaffNavigationChrome();
    await expect(page.getByRole("button", { name: "Registers" })).toBeVisible({ timeout: 30_000 });
  });

  test("admin reaches Registers tabs and Services catalog on narrow viewport", async ({ page }) => {
    await e2eBehaviors("admin", "registers · mobile · services tab");
    const reg = new StaffRegistersPage(page);
    await reg.gotoRegistersSection();
    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/api/services") && r.request().method() === "GET" && r.status() === 200,
        { timeout: 30_000 },
      ),
      reg.openTab("Services"),
    ]);
    await reg.expectServicesWorkspaceVisible();
    await expect(reg.serviceRowByNameSnippet(E2E_DEMO_SERVICE_NAME_IN_CATALOG)).toBeVisible({ timeout: 25_000 });
  });
});
