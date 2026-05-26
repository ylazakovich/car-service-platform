import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { AUTH_STATE_ADMIN, openAdminApp } from "./fixtures/auth";
import {
  cleanupE2eData,
  createE2eCustomerWithVehicle,
  createE2eService,
  createE2eUnit,
} from "./fixtures/e2eDataFactory";
import { StaffMobileNavigationPage } from "./pages/StaffMobileNavigationPage";
import { StaffRegistersPage } from "./pages/StaffRegistersPage";

/** Registers create their own reference rows; CI does not load demo data. */

test.describe("Registers workspace @desktop", () => {
  test.use({ storageState: AUTH_STATE_ADMIN });

  test.beforeEach(async ({ page }) => {
    await openAdminApp(page);
    await new StaffMobileNavigationPage(page).waitForStaffNavigationChrome();
    await expect(page.getByRole("button", { name: "Registers" })).toBeVisible({ timeout: 30_000 });
  });

  test("admin opens Registers on Units tab and sees test-owned UoM code", async ({ page }) => {
    await e2eBehaviors("admin", "registers · units of measure tab");
    const unit = await createE2eUnit(page, "uom");
    try {
      const reg = new StaffRegistersPage(page);
      await reg.gotoRegistersSection();
      await reg.expectUnitsTabActive();
      await expect(reg.uomCodeCell(unit.code)).toBeVisible({ timeout: 20_000 });
    } finally {
      await cleanupE2eData(page, { unitIds: [unit.id] });
    }
  });

  test("admin switches to Services, search filters catalog row", async ({ page }) => {
    await e2eBehaviors("admin", "registers · services search");
    const service = await createE2eService(page, "E2E AC service");
    try {
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

      await reg.servicesSearchInput().fill(service.name);
      const row = reg.serviceRowByNameSnippet(service.name);
      await expect(row).toBeVisible({ timeout: 15_000 });
      await expect(row.getByRole("group", { name: new RegExp(service.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") })).toBeVisible();
    } finally {
      await cleanupE2eData(page, { serviceIds: [service.id] });
    }
  });

  test("admin Registers tabs do not include Invoice lines", async ({ page }) => {
    await e2eBehaviors("admin", "registers · tabs set");
    const reg = new StaffRegistersPage(page);
    await reg.gotoRegistersSection();
    await expect(page.getByRole("tab", { name: "Units of measure" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Services" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Customers" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Invoice lines" })).toHaveCount(0);
  });

  test("admin Registers desktop has no collapsible help panels", async ({ page }) => {
    await e2eBehaviors("admin", "registers · desktop · no disclosure hints");
    const reg = new StaffRegistersPage(page);
    await reg.gotoRegistersSection();
    await expect(page.locator(".reference-workspace details.registers-help-disclosure")).toHaveCount(0);
  });

  test("admin switches to Customers and sees test-owned customer with vehicles", async ({ page }) => {
    await e2eBehaviors("admin", "registers · customers with vehicles");
    const fixture = await createE2eCustomerWithVehicle(page, "registers-customer");
    try {
      await openAdminApp(page);
      const reg = new StaffRegistersPage(page);
      await reg.gotoRegistersSection();
      await reg.openTab("Customers");
      await reg.expectCustomersWorkspaceVisible();

      await reg.expandCustomerMobileRowIfNeeded(fixture.customerName);
      const row = reg.customerRowByName(fixture.customerName);
      await expect(row).toBeVisible({ timeout: 20_000 });
      await expect(row.getByRole("button", { name: "Save" })).toBeVisible();
      await expect(row.getByRole("button", { name: "Delete" })).toBeVisible();
    } finally {
      await cleanupE2eData(page, { vehicleIds: [fixture.vehicleId], customerIds: [fixture.customerId] });
    }
  });
});

test.describe("Registers workspace @mobile-only", () => {
  test.use({ storageState: AUTH_STATE_ADMIN });

  test.beforeEach(async ({ page }) => {
    await openAdminApp(page);
    await new StaffMobileNavigationPage(page).waitForStaffNavigationChrome();
  });

  test("admin reaches Registers tabs and Services catalog on narrow viewport", async ({ page }) => {
    await e2eBehaviors("admin", "registers · mobile · services tab");
    const service = await createE2eService(page, "E2E mobile service");
    try {
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
      await expect(reg.serviceRowByNameSnippet(service.name)).toBeVisible({ timeout: 25_000 });
    } finally {
      await cleanupE2eData(page, { serviceIds: [service.id] });
    }
  });

  test("admin opens Registers on Units tab and sees test-owned UoM code", async ({ page }) => {
    await e2eBehaviors("admin", "registers · mobile · units of measure tab");
    const unit = await createE2eUnit(page, "muom");
    try {
      const reg = new StaffRegistersPage(page);
      await reg.gotoRegistersSection();
      await reg.expectUnitsTabActive();
      await expect(reg.uomCodeCell(unit.code)).toBeVisible({ timeout: 20_000 });
    } finally {
      await cleanupE2eData(page, { unitIds: [unit.id] });
    }
  });

  test("admin Registers tabs do not include Invoice lines on narrow viewport", async ({ page }) => {
    await e2eBehaviors("admin", "registers · mobile · tabs set");
    const reg = new StaffRegistersPage(page);
    await reg.gotoRegistersSection();
    await expect(page.getByRole("tab", { name: "Units of measure" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Services" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Customers" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Invoice lines" })).toHaveCount(0);
  });

  test("admin Registers mobile Units tab shows collapsible How units work", async ({ page }) => {
    await e2eBehaviors("admin", "registers · mobile · units disclosure hint");
    const reg = new StaffRegistersPage(page);
    await reg.gotoRegistersSection();
    await reg.expectUnitsTabActive();
    await expect(page.locator(".reference-workspace .uom-admin-page details.registers-help-disclosure")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "How units work" })).toBeVisible();
  });
});
