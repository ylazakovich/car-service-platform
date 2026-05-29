import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { AUTH_STATE_ADMIN, openStaffApp } from "./fixtures/auth";
import { StaffRecordsRegistryPage } from "./pages/StaffRecordsRegistryPage";
import { StaffRepairsPage } from "./pages/StaffRepairsPage";
import { E2E_DEMO_REPAIR_VEHICLE_PLATE } from "./e2e-seed";

// regression: create buttons must stay disabled until minimum required fields are filled

test.describe("Repairs — create button disabled state @desktop", () => {
  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
  });

  test("Create Repair button is disabled until vehicle and service line are filled", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · create button · disabled until required fields filled");
    const repairs = new StaffRepairsPage(page);

    await repairs.gotoRepairsSection();
    await repairs.expectRepairsKanbanVisible();
    await repairs.openNewRepairCreateModal();

    const submitBtn = page.getByRole("button", { name: "Create Repair" });
    await expect(submitBtn).toBeDisabled();

    await page.getByLabel("Search vehicle for repair").fill(E2E_DEMO_REPAIR_VEHICLE_PLATE);
    const escapedPlate = E2E_DEMO_REPAIR_VEHICLE_PLATE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    await page.getByRole("option", { name: new RegExp(`${escapedPlate}\\s*•`) }).click();
    await expect(submitBtn).toBeDisabled();

    await page.getByRole("textbox", { name: /Line 1/ }).fill("Oil change");
    await expect(submitBtn).toBeEnabled();

    await page.getByRole("dialog", { name: /New Repair/ }).getByRole("button", { name: "Cancel" }).click();
  });
});

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

    const submitBtn = page.getByRole("button", { name: /Save/ });
    await expect(submitBtn).toBeDisabled();

    const dialog = page.locator("[aria-labelledby='purchase-create-modal-title']");
    await dialog.locator("input[placeholder='Supplier name']").fill("Test Supplier");
    await expect(submitBtn).toBeDisabled();

    await dialog.locator(".purchase-invoice-line-toggle").first().click();

    await dialog.locator("input[placeholder='Part name or SKU']").fill("Brake pads");
    await expect(submitBtn).toBeEnabled();

    await dialog.getByRole("button", { name: "Close" }).click();
  });
});

test.describe("Vehicles — create button disabled state @desktop", () => {
  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
  });

  test("Create Vehicle button is disabled until all required fields are filled", async ({ page }) => {
    await e2eBehaviors("staff", "vehicles · create button · disabled until required fields filled");
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
    const firstOptionValue = await ownerSelect.evaluate((sel: HTMLSelectElement) => {
      const opt = Array.from(sel.options).find((o) => o.value !== "");
      return opt?.value ?? "";
    });
    await ownerSelect.selectOption(firstOptionValue);
    await expect(submitBtn).toBeEnabled();

    await dialog.getByRole("button", { name: /Close|Cancel/ }).first().click();
  });
});
