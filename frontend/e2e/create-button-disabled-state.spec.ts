import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { AUTH_STATE_ADMIN, openStaffApp } from "./fixtures/auth";
import { cleanupE2eData, createE2eCustomerWithVehicle } from "./fixtures/e2eDataFactory";
import { StaffRecordsRegistryPage } from "./pages/StaffRecordsRegistryPage";
import { StaffRepairsPage } from "./pages/StaffRepairsPage";

// regression: create buttons must stay disabled until minimum required fields are filled

// ─── REPAIRS ────────────────────────────────────────────────────────────────

test.describe("Repairs — create button disabled state @desktop", () => {
  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
  });

  test("Create Repair button is disabled until vehicle and service line are filled", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · create button · disabled until required fields filled");
    const repairs = new StaffRepairsPage(page);
    let fixture: Awaited<ReturnType<typeof createE2eCustomerWithVehicle>> | null = null;

    try {
      fixture = await createE2eCustomerWithVehicle(page, "create-btn-disabled");
      await openStaffApp(page);
      await repairs.gotoRepairsSection();
      await repairs.expectRepairsKanbanVisible();
      await repairs.openNewRepairCreateModal();

      const submitBtn = page.getByRole("button", { name: "Create Repair" });
      await expect(submitBtn).toBeDisabled();

      await page.getByLabel("Search vehicle for repair").fill(fixture.vehiclePlate);
      const escapedPlate = fixture.vehiclePlate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const vehicleOption = page.getByRole("option", { name: new RegExp(`${escapedPlate}\\s*•`) });
      await expect(vehicleOption).toBeVisible({ timeout: 10_000 });
      await vehicleOption.click();
      await expect(submitBtn).toBeDisabled();

      await page.getByRole("textbox", { name: /Line 1/ }).fill("Oil change");
      await expect(submitBtn).toBeEnabled();

      await page.getByRole("dialog", { name: /New Repair/ }).getByRole("button", { name: "Cancel" }).click();
    } finally {
      await cleanupE2eData(page, {
        vehicleIds: fixture ? [fixture.vehicleId] : [],
        customerIds: fixture ? [fixture.customerId] : [],
      });
    }
  });

  test("required-field chips appear and disappear as fields are filled", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · required chips · appear and disappear");
    const repairs = new StaffRepairsPage(page);
    let fixture: Awaited<ReturnType<typeof createE2eCustomerWithVehicle>> | null = null;

    try {
      fixture = await createE2eCustomerWithVehicle(page, "create-btn-disabled");
      await openStaffApp(page);
      await repairs.gotoRepairsSection();
      await repairs.expectRepairsKanbanVisible();
      await repairs.openNewRepairCreateModal();

      const dialog = page.getByRole("dialog", { name: /New Repair/ });
      await expect(dialog.locator(".modal-footer__required-chip").filter({ hasText: "Vehicle" })).toBeVisible();
      await expect(dialog.locator(".modal-footer__required-chip").filter({ hasText: "Service line" })).toBeVisible();

      await page.getByLabel("Search vehicle for repair").fill(fixture.vehiclePlate);
      const escapedPlate = fixture.vehiclePlate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const vehicleOption = page.getByRole("option", { name: new RegExp(`${escapedPlate}\\s*•`) });
      await expect(vehicleOption).toBeVisible({ timeout: 10_000 });
      await vehicleOption.click();
      await expect(dialog.locator(".modal-footer__required-chip").filter({ hasText: "Vehicle" })).toBeHidden();
      await expect(dialog.locator(".modal-footer__required-chip").filter({ hasText: "Service line" })).toBeVisible();

      await page.getByRole("textbox", { name: /Line 1/ }).fill("Oil change");
      await expect(dialog.locator(".modal-footer__required-chip")).toHaveCount(0);

      await dialog.getByRole("button", { name: "Cancel" }).click();
    } finally {
      await cleanupE2eData(page, {
        vehicleIds: fixture ? [fixture.vehicleId] : [],
        customerIds: fixture ? [fixture.customerId] : [],
      });
    }
  });

  test("clearing service line re-disables the button", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · create button · re-disabled after clearing service line");
    const repairs = new StaffRepairsPage(page);
    let fixture: Awaited<ReturnType<typeof createE2eCustomerWithVehicle>> | null = null;

    try {
      fixture = await createE2eCustomerWithVehicle(page, "create-btn-disabled");
      await openStaffApp(page);
      await repairs.gotoRepairsSection();
      await repairs.expectRepairsKanbanVisible();
      await repairs.openNewRepairCreateModal();

      const dialog = page.getByRole("dialog", { name: /New Repair/ });
      const submitBtn = page.getByRole("button", { name: "Create Repair" });

      await page.getByLabel("Search vehicle for repair").fill(fixture.vehiclePlate);
      const escapedPlate = fixture.vehiclePlate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const vehicleOption = page.getByRole("option", { name: new RegExp(`${escapedPlate}\\s*•`) });
      await expect(vehicleOption).toBeVisible({ timeout: 10_000 });
      await vehicleOption.click();
      const line1 = page.getByRole("textbox", { name: /Line 1/ });
      await line1.fill("Oil change");
      await expect(submitBtn).toBeEnabled();

      await line1.clear();
      await expect(submitBtn).toBeDisabled();
      await expect(dialog.locator(".modal-footer__required-chip").filter({ hasText: "Service line" })).toBeVisible();

      await dialog.getByRole("button", { name: "Cancel" }).click();
    } finally {
      await cleanupE2eData(page, {
        vehicleIds: fixture ? [fixture.vehicleId] : [],
        customerIds: fixture ? [fixture.customerId] : [],
      });
    }
  });
});

test.describe("Repairs — create button disabled state @mobile-only", () => {
  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
  });

  test("chips render above stretched buttons on mobile", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · create button · chips above buttons on mobile");
    const repairs = new StaffRepairsPage(page);

    await repairs.gotoRepairsSection();
    await repairs.expectRepairsKanbanVisible();
    await repairs.openNewRepairCreateModal();

    const dialog = page.getByRole("dialog", { name: /New Repair/ });
    const chips = dialog.locator(".modal-footer__required-chips");
    const submitBtn = dialog.getByRole("button", { name: "Create Repair" });

    await expect(chips).toBeVisible();
    await expect(submitBtn).toBeDisabled();

    const chipsBox = await chips.boundingBox();
    const btnBox = await submitBtn.boundingBox();
    expect(chipsBox).not.toBeNull();
    expect(btnBox).not.toBeNull();
    expect(chipsBox!.y).toBeLessThan(btnBox!.y);

    await dialog.getByRole("button", { name: "Cancel" }).click();
  });
});

// ─── PURCHASES ──────────────────────────────────────────────────────────────

test.describe("Purchases — create button disabled state @desktop", () => {
  test.use({ storageState: AUTH_STATE_ADMIN });

  test.beforeEach(async ({ page }) => {
    await page.goto("/app");
  });

  test("Save button is disabled until supplier name and part name are filled", async ({ page }) => {
    await e2eBehaviors("admin", "purchases · create button · disabled until required fields filled");
    const reg = new StaffRecordsRegistryPage(page);
    await reg.gotoPurchasesSection();

    await page.getByRole("button", { name: "+ Add part line" }).click();

    const dialog = page.locator("[aria-labelledby='purchase-create-modal-title']");
    const submitBtn = dialog.getByRole("button", { name: /Save/ });
    await expect(submitBtn).toBeDisabled();
    await dialog.locator("input[placeholder='Supplier name']").fill("Test Supplier");
    await expect(submitBtn).toBeDisabled();

    await dialog.locator(".purchase-invoice-line-toggle").first().click();
    await dialog.locator("input[placeholder='Part name or SKU']").fill("Brake pads");
    await expect(submitBtn).toBeEnabled();

    await dialog.getByRole("button", { name: "Close" }).click();
  });

  test("required-field chips appear and disappear as fields are filled", async ({ page }) => {
    await e2eBehaviors("admin", "purchases · required chips · appear and disappear");
    const reg = new StaffRecordsRegistryPage(page);
    await reg.gotoPurchasesSection();

    await page.getByRole("button", { name: "+ Add part line" }).click();

    const dialog = page.locator("[aria-labelledby='purchase-create-modal-title']");
    await expect(dialog.locator(".modal-footer__required-chip").filter({ hasText: "Supplier" })).toBeVisible();
    await expect(dialog.locator(".modal-footer__required-chip").filter({ hasText: "Part name" })).toBeVisible();

    await dialog.locator("input[placeholder='Supplier name']").fill("Test Supplier");
    await expect(dialog.locator(".modal-footer__required-chip").filter({ hasText: "Supplier" })).toBeHidden();
    await expect(dialog.locator(".modal-footer__required-chip").filter({ hasText: "Part name" })).toBeVisible();

    await dialog.locator(".purchase-invoice-line-toggle").first().click();
    await dialog.locator("input[placeholder='Part name or SKU']").fill("Brake pads");
    await expect(dialog.locator(".modal-footer__required-chip")).toHaveCount(0);

    await dialog.getByRole("button", { name: "Close" }).click();
  });

  test("clearing supplier name re-disables the button", async ({ page }) => {
    await e2eBehaviors("admin", "purchases · create button · re-disabled after clearing supplier");
    const reg = new StaffRecordsRegistryPage(page);
    await reg.gotoPurchasesSection();

    await page.getByRole("button", { name: "+ Add part line" }).click();

    const dialog = page.locator("[aria-labelledby='purchase-create-modal-title']");
    const submitBtn = page.getByRole("button", { name: /Save/ });
    const supplierInput = dialog.locator("input[placeholder='Supplier name']");

    await supplierInput.fill("Test Supplier");
    await dialog.locator(".purchase-invoice-line-toggle").first().click();
    await dialog.locator("input[placeholder='Part name or SKU']").fill("Brake pads");
    await expect(submitBtn).toBeEnabled();

    await supplierInput.clear();
    await expect(submitBtn).toBeDisabled();
    await expect(dialog.locator(".modal-footer__required-chip").filter({ hasText: "Supplier" })).toBeVisible();

    await dialog.getByRole("button", { name: "Close" }).click();
  });
});

test.describe("Purchases — create button disabled state @mobile-only", () => {
  test.use({ storageState: AUTH_STATE_ADMIN });

  test.beforeEach(async ({ page }) => {
    await page.goto("/app");
  });

  test("chips render above stretched buttons on mobile", async ({ page }) => {
    await e2eBehaviors("admin", "purchases · create button · chips above buttons on mobile");
    const reg = new StaffRecordsRegistryPage(page);
    await reg.gotoPurchasesSection();

    await page.getByRole("button", { name: /Add part line|Add consumable/ }).first().click();

    const dialog = page.locator("[aria-labelledby='purchase-create-modal-title']");
    const chips = dialog.locator(".modal-footer__required-chips");
    const submitBtn = dialog.getByRole("button", { name: /Save/ });

    await expect(chips).toBeVisible();
    await expect(submitBtn).toBeDisabled();

    const chipsBox = await chips.boundingBox();
    const btnBox = await submitBtn.boundingBox();
    expect(chipsBox).not.toBeNull();
    expect(btnBox).not.toBeNull();
    expect(chipsBox!.y).toBeLessThan(btnBox!.y);

    await dialog.getByRole("button", { name: "Close" }).click();
  });
});

// ─── VEHICLES ───────────────────────────────────────────────────────────────

test.describe("Vehicles — create button disabled state @desktop", () => {
  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
  });

  test("Create Vehicle button is disabled until all required fields are filled", async ({ page }) => {
    await e2eBehaviors("staff", "vehicles · create button · disabled until required fields filled");
    let fixture: Awaited<ReturnType<typeof createE2eCustomerWithVehicle>> | null = null;
    try {
      fixture = await createE2eCustomerWithVehicle(page, "veh-disabled");
      await openStaffApp(page);
      const reg = new StaffRecordsRegistryPage(page);
      await reg.gotoVehiclesSection();

      const createBtn = page.getByRole("button", { name: "Create Vehicle" }).or(
        page.getByRole("button", { name: "+ Add vehicle" })
      );
      await createBtn.first().click();

      const dialog = page.getByRole("dialog").filter({ hasText: "Register Vehicle" });
      await expect(dialog).toBeVisible({ timeout: 15_000 });

      const submitBtn = dialog.getByRole("button", { name: "Create Vehicle" });
      await expect(submitBtn).toBeDisabled();

      await dialog.locator("input[placeholder='e.g. KR 2048A']").fill("TEST 001");
      await dialog.locator("input[placeholder='e.g. Toyota']").fill("Toyota");
      await dialog.locator("input[placeholder='e.g. Yaris']").fill("Yaris");
      await expect(submitBtn).toBeDisabled();

      const ownerSelect = dialog.locator(".inline-owner-select select");
      await expect(ownerSelect.locator(`option[value="${fixture.customerId}"]`)).toBeAttached({ timeout: 10_000 });
      await ownerSelect.selectOption(String(fixture.customerId));
      await expect(submitBtn).toBeEnabled();

      await dialog.getByRole("button", { name: /Close|Cancel/ }).first().click();
    } finally {
      await cleanupE2eData(page, {
        vehicleIds: fixture ? [fixture.vehicleId] : [],
        customerIds: fixture ? [fixture.customerId] : [],
      });
    }
  });

  test("required-field chips appear and disappear as fields are filled", async ({ page }) => {
    await e2eBehaviors("staff", "vehicles · required chips · appear and disappear");
    const reg = new StaffRecordsRegistryPage(page);
    await reg.gotoVehiclesSection();

    const createBtn = page.getByRole("button", { name: "Create Vehicle" }).or(
      page.getByRole("button", { name: "+ Add vehicle" })
    );
    await createBtn.first().click();

    const dialog = page.getByRole("dialog").filter({ hasText: "Register Vehicle" });
    await expect(dialog).toBeVisible({ timeout: 15_000 });

    await expect(dialog.locator(".modal-footer__required-chip").filter({ hasText: "Owner" })).toBeVisible();
    await expect(dialog.locator(".modal-footer__required-chip").filter({ hasText: "License plate" })).toBeVisible();
    await expect(dialog.locator(".modal-footer__required-chip").filter({ hasText: "Make" })).toBeVisible();
    await expect(dialog.locator(".modal-footer__required-chip").filter({ hasText: "Model" })).toBeVisible();

    await dialog.locator("input[placeholder='e.g. KR 2048A']").fill("TEST 001");
    await expect(dialog.locator(".modal-footer__required-chip").filter({ hasText: "License plate" })).toBeHidden();

    await dialog.locator("input[placeholder='e.g. Toyota']").fill("Toyota");
    await expect(dialog.locator(".modal-footer__required-chip").filter({ hasText: "Make" })).toBeHidden();

    await dialog.locator("input[placeholder='e.g. Yaris']").fill("Yaris");
    await expect(dialog.locator(".modal-footer__required-chip").filter({ hasText: "Model" })).toBeHidden();

    await expect(dialog.locator(".modal-footer__required-chip").filter({ hasText: "Owner" })).toBeVisible();
    await expect(dialog.locator(".modal-footer__required-chip")).toHaveCount(1);

    await dialog.getByRole("button", { name: /Close|Cancel/ }).first().click();
  });

  test("clearing a field re-disables the button and restores its chip", async ({ page }) => {
    await e2eBehaviors("staff", "vehicles · create button · re-disabled after clearing make");
    let fixture: Awaited<ReturnType<typeof createE2eCustomerWithVehicle>> | null = null;
    try {
      fixture = await createE2eCustomerWithVehicle(page, "veh-clear");
      await openStaffApp(page);
      const reg = new StaffRecordsRegistryPage(page);
      await reg.gotoVehiclesSection();

      const createBtn = page.getByRole("button", { name: "Create Vehicle" }).or(
        page.getByRole("button", { name: "+ Add vehicle" })
      );
      await createBtn.first().click();

      const dialog = page.getByRole("dialog").filter({ hasText: "Register Vehicle" });
      await expect(dialog).toBeVisible({ timeout: 15_000 });

      const submitBtn = dialog.getByRole("button", { name: "Create Vehicle" });
      const makeInput = dialog.locator("input[placeholder='e.g. Toyota']");

      await dialog.locator("input[placeholder='e.g. KR 2048A']").fill("TEST 001");
      await makeInput.fill("Toyota");
      await dialog.locator("input[placeholder='e.g. Yaris']").fill("Yaris");
      const ownerSelect = dialog.locator(".inline-owner-select select");
      await expect(ownerSelect.locator(`option[value="${fixture.customerId}"]`)).toBeAttached({ timeout: 10_000 });
      await ownerSelect.selectOption(String(fixture.customerId));
      await expect(submitBtn).toBeEnabled();

      await makeInput.clear();
      await expect(submitBtn).toBeDisabled();
      await expect(dialog.locator(".modal-footer__required-chip").filter({ hasText: "Make" })).toBeVisible();

      await dialog.getByRole("button", { name: /Close|Cancel/ }).first().click();
    } finally {
      await cleanupE2eData(page, {
        vehicleIds: fixture ? [fixture.vehicleId] : [],
        customerIds: fixture ? [fixture.customerId] : [],
      });
    }
  });
});

test.describe("Vehicles — create button disabled state @mobile-only", () => {
  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
  });

  test("chips render above stretched buttons on mobile", async ({ page }) => {
    await e2eBehaviors("staff", "vehicles · create button · chips above buttons on mobile");
    const reg = new StaffRecordsRegistryPage(page);
    await reg.gotoVehiclesSection();

    const createBtn = page.getByRole("button", { name: /Add Vehicle|Add vehicle/ });
    await createBtn.first().click({ force: true });

    const dialog = page.getByRole("dialog").filter({ hasText: "Register Vehicle" });
    await expect(dialog).toBeVisible({ timeout: 15_000 });

    const chips = dialog.locator(".modal-footer__required-chips");
    const submitBtn = dialog.getByRole("button", { name: "Create Vehicle" });

    await expect(chips).toBeVisible();
    await expect(submitBtn).toBeDisabled();

    const chipsBox = await chips.boundingBox();
    const btnBox = await submitBtn.boundingBox();
    expect(chipsBox).not.toBeNull();
    expect(btnBox).not.toBeNull();
    expect(chipsBox!.y).toBeLessThan(btnBox!.y);

    // The mobile close affordance can be overlapped by the sticky modal header; Escape uses the dialog's supported dismissal path.
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});
