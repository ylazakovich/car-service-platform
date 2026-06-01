import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { AUTH_STATE_ADMIN } from "./fixtures/auth";
import { cleanupE2eData, createE2eCustomer } from "./fixtures/e2eDataFactory";

test.use({ storageState: AUTH_STATE_ADMIN });

test.describe("Django admin — Customer CRUD @desktop", () => {
  let createdCustomerId: number | null = null;

  test.afterEach(async ({ page }) => {
    if (createdCustomerId !== null) {
      await cleanupE2eData(page, { customerIds: [createdCustomerId] });
      createdCustomerId = null;
    }
  });

  test("Customer — create via Django admin add form", async ({ page }) => {
    await e2eBehaviors("admin", "django admin · customer · create");

    const fullName = `E2E Admin Create ${Date.now()}`;
    const phone = `+48 600 ${String(Date.now()).slice(-6)}`;

    await page.goto("/admin/customers/customer/add/");
    await page.waitForLoadState("domcontentloaded");

    await page.locator("#id_full_name").fill(fullName);
    await page.locator("#id_phone").fill(phone);
    await page.locator("[name='_save']").click();

    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/admin\/customers\/customer\//);

    const changeMatch = page.url().match(/\/admin\/customers\/customer\/(\d+)\/change\//);
    if (changeMatch !== null) {
      createdCustomerId = parseInt(changeMatch[1], 10);
    } else {
      await expect(page.locator("#result_list").getByText(fullName)).toBeVisible({ timeout: 10_000 });
    }

    await expect(page.locator("#content")).toBeVisible();
  });

  test("Customer — read: full_name appears in changelist after creation", async ({ page }) => {
    await e2eBehaviors("admin", "django admin · customer · read");

    const fullName = `E2E Admin Read ${Date.now()}`;
    const phone = `+48 600 ${String(Date.now()).slice(-6)}`;

    await page.goto("/admin/customers/customer/add/");
    await page.waitForLoadState("domcontentloaded");

    await page.locator("#id_full_name").fill(fullName);
    await page.locator("#id_phone").fill(phone);
    await page.locator("[name='_save']").click();

    await page.waitForLoadState("domcontentloaded");

    const changeMatch = page.url().match(/\/admin\/customers\/customer\/(\d+)\/change\//);
    if (changeMatch !== null) {
      createdCustomerId = parseInt(changeMatch[1], 10);
      await page.goto("/admin/customers/customer/");
      await page.waitForLoadState("domcontentloaded");
    }

    await expect(page.locator("#result_list").getByText(fullName)).toBeVisible({ timeout: 10_000 });
  });

  test("Customer — update: change full_name and verify in changelist", async ({ page }) => {
    await e2eBehaviors("admin", "django admin · customer · update");

    const originalName = `E2E Admin Update Before ${Date.now()}`;
    const updatedName = `E2E Admin Update After ${Date.now()}`;
    const phone = `+48 600 ${String(Date.now()).slice(-6)}`;

    await page.goto("/admin/customers/customer/add/");
    await page.waitForLoadState("domcontentloaded");

    await page.locator("#id_full_name").fill(originalName);
    await page.locator("#id_phone").fill(phone);
    await page.locator("[name='_save']").click();

    await page.waitForLoadState("domcontentloaded");

    const createMatch = page.url().match(/\/admin\/customers\/customer\/(\d+)\/change\//);
    if (createMatch !== null) {
      createdCustomerId = parseInt(createMatch[1], 10);
    } else {
      const row = page.locator("#result_list").getByRole("link", { name: new RegExp(originalName) });
      await expect(row).toBeVisible({ timeout: 10_000 });
      await row.click();
      await page.waitForLoadState("domcontentloaded");
      const editMatch = page.url().match(/\/admin\/customers\/customer\/(\d+)\/change\//);
      if (editMatch !== null) {
        createdCustomerId = parseInt(editMatch[1], 10);
      }
    }

    await page.locator("#id_full_name").fill(updatedName);
    await page.locator("[name='_save']").click();

    await page.waitForLoadState("domcontentloaded");

    await page.goto("/admin/customers/customer/");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("#result_list").getByText(updatedName)).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("#result_list").getByText(originalName)).toHaveCount(0);
  });

  test("Customer — delete via detail page delete button", async ({ page }) => {
    await e2eBehaviors("admin", "django admin · customer · delete");

    const fullName = `E2E Admin Delete ${Date.now()}`;
    const phone = `+48 600 ${String(Date.now()).slice(-6)}`;

    await page.goto("/admin/customers/customer/add/");
    await page.waitForLoadState("domcontentloaded");

    await page.locator("#id_full_name").fill(fullName);
    await page.locator("#id_phone").fill(phone);
    await page.locator("[name='_save']").click();

    await page.waitForLoadState("domcontentloaded");

    const createMatch = page.url().match(/\/admin\/customers\/customer\/(\d+)\/change\//);
    if (createMatch !== null) {
      createdCustomerId = parseInt(createMatch[1], 10);
    } else {
      const row = page.locator("#result_list").getByRole("link", { name: new RegExp(fullName) });
      await expect(row).toBeVisible({ timeout: 10_000 });
      await row.click();
      await page.waitForLoadState("domcontentloaded");
      const editMatch = page.url().match(/\/admin\/customers\/customer\/(\d+)\/change\//);
      if (editMatch !== null) {
        createdCustomerId = parseInt(editMatch[1], 10);
      }
    }

    await page.locator("a.deletelink").click();
    await page.waitForLoadState("domcontentloaded");

    await page.locator("[type='submit']").click();
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(/\/admin\/customers\/customer\//);
    await expect(page.locator("#result_list").getByText(fullName)).toHaveCount(0);

    createdCustomerId = null;
  });
});

test.describe("Django admin — Vehicle CRUD @desktop", () => {
  let customerId: number;
  let createdVehicleId: number | null = null;

  test.beforeEach(async ({ page }) => {
    const fixture = await createE2eCustomer(page, "admin-vehicle-crud");
    customerId = fixture.customerId;
  });

  test.afterEach(async ({ page }) => {
    if (createdVehicleId !== null) {
      await cleanupE2eData(page, { vehicleIds: [createdVehicleId] });
      createdVehicleId = null;
    }
    await cleanupE2eData(page, { customerIds: [customerId] });
  });

  test("Vehicle — create via Django admin add form", async ({ page }) => {
    await e2eBehaviors("admin", "django admin · vehicle · create");

    const plate = `E2 ${String(Date.now()).slice(-6)}`;

    await page.goto("/admin/vehicles/vehicle/add/");
    await page.waitForLoadState("domcontentloaded");

    await page.locator("select#id_customer").selectOption({ value: String(customerId) });
    await page.locator("#id_license_plate").fill(plate);
    await page.locator("#id_make").fill("E2E Make");
    await page.locator("#id_model").fill("E2E Model");
    await page.locator("[name='_save']").click();

    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/admin\/vehicles\/vehicle\//);

    const changeMatch = page.url().match(/\/admin\/vehicles\/vehicle\/(\d+)\/change\//);
    if (changeMatch !== null) {
      createdVehicleId = parseInt(changeMatch[1], 10);
    } else {
      await expect(page.locator("#result_list").getByText(plate)).toBeVisible({ timeout: 10_000 });
    }

    await expect(page.locator("#content")).toBeVisible();
  });

  test("Vehicle — read: license_plate appears in changelist after creation", async ({ page }) => {
    await e2eBehaviors("admin", "django admin · vehicle · read");

    const plate = `E2 ${String(Date.now()).slice(-6)}`;

    await page.goto("/admin/vehicles/vehicle/add/");
    await page.waitForLoadState("domcontentloaded");

    await page.locator("select#id_customer").selectOption({ value: String(customerId) });
    await page.locator("#id_license_plate").fill(plate);
    await page.locator("#id_make").fill("E2E Make");
    await page.locator("#id_model").fill("E2E Model");
    await page.locator("[name='_save']").click();

    await page.waitForLoadState("domcontentloaded");

    const changeMatch = page.url().match(/\/admin\/vehicles\/vehicle\/(\d+)\/change\//);
    if (changeMatch !== null) {
      createdVehicleId = parseInt(changeMatch[1], 10);
      await page.goto("/admin/vehicles/vehicle/");
      await page.waitForLoadState("domcontentloaded");
    }

    await expect(page.locator("#result_list").getByText(plate)).toBeVisible({ timeout: 10_000 });
  });

  test("Vehicle — update: change make and verify in changelist", async ({ page }) => {
    await e2eBehaviors("admin", "django admin · vehicle · update");

    const plate = `E2 ${String(Date.now()).slice(-6)}`;
    const updatedMake = `E2E Updated ${Date.now()}`;

    await page.goto("/admin/vehicles/vehicle/add/");
    await page.waitForLoadState("domcontentloaded");

    await page.locator("select#id_customer").selectOption({ value: String(customerId) });
    await page.locator("#id_license_plate").fill(plate);
    await page.locator("#id_make").fill("E2E Make");
    await page.locator("#id_model").fill("E2E Model");
    await page.locator("[name='_save']").click();

    await page.waitForLoadState("domcontentloaded");

    const createMatch = page.url().match(/\/admin\/vehicles\/vehicle\/(\d+)\/change\//);
    if (createMatch !== null) {
      createdVehicleId = parseInt(createMatch[1], 10);
    } else {
      const row = page.locator("#result_list").getByRole("link", { name: new RegExp(plate) });
      await expect(row).toBeVisible({ timeout: 10_000 });
      await row.click();
      await page.waitForLoadState("domcontentloaded");
      const editMatch = page.url().match(/\/admin\/vehicles\/vehicle\/(\d+)\/change\//);
      if (editMatch !== null) {
        createdVehicleId = parseInt(editMatch[1], 10);
      }
    }

    await page.locator("#id_make").fill(updatedMake);
    await page.locator("[name='_save']").click();

    await page.waitForLoadState("domcontentloaded");

    await page.goto("/admin/vehicles/vehicle/");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("#result_list").getByText(updatedMake)).toBeVisible({ timeout: 10_000 });
  });

  test("Vehicle — delete via detail page delete button", async ({ page }) => {
    await e2eBehaviors("admin", "django admin · vehicle · delete");

    const plate = `E2 ${String(Date.now()).slice(-6)}`;

    await page.goto("/admin/vehicles/vehicle/add/");
    await page.waitForLoadState("domcontentloaded");

    await page.locator("select#id_customer").selectOption({ value: String(customerId) });
    await page.locator("#id_license_plate").fill(plate);
    await page.locator("#id_make").fill("E2E Make");
    await page.locator("#id_model").fill("E2E Model");
    await page.locator("[name='_save']").click();

    await page.waitForLoadState("domcontentloaded");

    const createMatch = page.url().match(/\/admin\/vehicles\/vehicle\/(\d+)\/change\//);
    if (createMatch !== null) {
      createdVehicleId = parseInt(createMatch[1], 10);
    } else {
      const row = page.locator("#result_list").getByRole("link", { name: new RegExp(plate) });
      await expect(row).toBeVisible({ timeout: 10_000 });
      await row.click();
      await page.waitForLoadState("domcontentloaded");
      const editMatch = page.url().match(/\/admin\/vehicles\/vehicle\/(\d+)\/change\//);
      if (editMatch !== null) {
        createdVehicleId = parseInt(editMatch[1], 10);
      }
    }

    await page.locator("a.deletelink").click();
    await page.waitForLoadState("domcontentloaded");

    await page.locator("[type='submit']").click();
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(/\/admin\/vehicles\/vehicle\//);
    await expect(page.locator("#result_list").getByText(plate)).toHaveCount(0);

    createdVehicleId = null;
  });
});

test.describe("Django admin — Service CRUD @desktop", () => {
  let createdServiceId: number | null = null;

  test.afterEach(async ({ page }) => {
    if (createdServiceId !== null) {
      await cleanupE2eData(page, { serviceIds: [createdServiceId] });
      createdServiceId = null;
    }
  });

  test("Service — create via Django admin add form", async ({ page }) => {
    await e2eBehaviors("admin", "django admin · service · create");

    const serviceName = `E2E Svc ${Date.now()}`;

    await page.goto("/admin/services/service/add/");
    await page.waitForLoadState("domcontentloaded");

    await page.locator("#id_name").fill(serviceName);
    await page.locator("[name='_save']").click();

    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/admin\/services\/service\//);

    const changeMatch = page.url().match(/\/admin\/services\/service\/(\d+)\/change\//);
    if (changeMatch !== null) {
      createdServiceId = parseInt(changeMatch[1], 10);
    } else {
      await expect(page.locator("#result_list").getByText(serviceName)).toBeVisible({ timeout: 10_000 });
    }

    await expect(page.locator("#content")).toBeVisible();
  });

  test("Service — read: name appears in changelist after creation", async ({ page }) => {
    await e2eBehaviors("admin", "django admin · service · read");

    const serviceName = `E2E Svc ${Date.now()}`;

    await page.goto("/admin/services/service/add/");
    await page.waitForLoadState("domcontentloaded");

    await page.locator("#id_name").fill(serviceName);
    await page.locator("[name='_save']").click();

    await page.waitForLoadState("domcontentloaded");

    const changeMatch = page.url().match(/\/admin\/services\/service\/(\d+)\/change\//);
    if (changeMatch !== null) {
      createdServiceId = parseInt(changeMatch[1], 10);
      await page.goto("/admin/services/service/");
      await page.waitForLoadState("domcontentloaded");
    }

    await expect(page.locator("#result_list").getByText(serviceName)).toBeVisible({ timeout: 10_000 });
  });

  test("Service — update: change name and verify in changelist", async ({ page }) => {
    await e2eBehaviors("admin", "django admin · service · update");

    const originalName = `E2E Svc Before ${Date.now()}`;
    const updatedName = `E2E Svc After ${Date.now()}`;

    await page.goto("/admin/services/service/add/");
    await page.waitForLoadState("domcontentloaded");

    await page.locator("#id_name").fill(originalName);
    await page.locator("[name='_save']").click();

    await page.waitForLoadState("domcontentloaded");

    const createMatch = page.url().match(/\/admin\/services\/service\/(\d+)\/change\//);
    if (createMatch !== null) {
      createdServiceId = parseInt(createMatch[1], 10);
    } else {
      const row = page.locator("#result_list").getByRole("link", { name: new RegExp(originalName) });
      await expect(row).toBeVisible({ timeout: 10_000 });
      await row.click();
      await page.waitForLoadState("domcontentloaded");
      const editMatch = page.url().match(/\/admin\/services\/service\/(\d+)\/change\//);
      if (editMatch !== null) {
        createdServiceId = parseInt(editMatch[1], 10);
      }
    }

    await page.locator("#id_name").fill(updatedName);
    await page.locator("[name='_save']").click();

    await page.waitForLoadState("domcontentloaded");

    await page.goto("/admin/services/service/");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("#result_list").getByText(updatedName)).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("#result_list").getByText(originalName)).toHaveCount(0);
  });

  test("Service — delete via detail page delete button", async ({ page }) => {
    await e2eBehaviors("admin", "django admin · service · delete");

    const serviceName = `E2E Svc ${Date.now()}`;

    await page.goto("/admin/services/service/add/");
    await page.waitForLoadState("domcontentloaded");

    await page.locator("#id_name").fill(serviceName);
    await page.locator("[name='_save']").click();

    await page.waitForLoadState("domcontentloaded");

    const createMatch = page.url().match(/\/admin\/services\/service\/(\d+)\/change\//);
    if (createMatch !== null) {
      createdServiceId = parseInt(createMatch[1], 10);
    } else {
      const row = page.locator("#result_list").getByRole("link", { name: new RegExp(serviceName) });
      await expect(row).toBeVisible({ timeout: 10_000 });
      await row.click();
      await page.waitForLoadState("domcontentloaded");
      const editMatch = page.url().match(/\/admin\/services\/service\/(\d+)\/change\//);
      if (editMatch !== null) {
        createdServiceId = parseInt(editMatch[1], 10);
      }
    }

    await page.locator("a.deletelink").click();
    await page.waitForLoadState("domcontentloaded");

    await page.locator("[type='submit']").click();
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(/\/admin\/services\/service\//);
    await expect(page.locator("#result_list").getByText(serviceName)).toHaveCount(0);

    createdServiceId = null;
  });
});
