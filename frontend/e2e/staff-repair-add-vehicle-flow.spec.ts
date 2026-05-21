import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { openStaffApp } from "./fixtures/auth";
import { StaffRepairsPage } from "./pages/StaffRepairsPage";
import { StaffVehicleFormPage } from "./pages/StaffVehicleFormPage";

function uniquePlate(): string {
  return `E2E-${Date.now()}`;
}

test.describe("Repair modal: add new vehicle from intake @desktop", () => {
  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
  });

  test("opens vehicle form, creates vehicle, returns to repair modal pre-filled", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · new repair · add vehicle inline (desktop)");
    const repairs = new StaffRepairsPage(page);
    const vehicleForm = new StaffVehicleFormPage(page);

    await repairs.gotoRepairsSection();
    await repairs.expectRepairsKanbanVisible();

    await repairs.openNewRepairCreateModal();

    await page.getByRole("dialog", { name: /New Repair/ }).getByRole("button", { name: /Or add a brand-new vehicle/ }).click();

    await vehicleForm.expectVehicleIntakeVisible();

    const plate = uniquePlate();
    await vehicleForm.fillVehicleForm(plate, "Toyota", "Corolla", "Vasyl Petrenko");
    await vehicleForm.submitVehicleForm();

    await repairs.expectNewRepairDialogVisible();
    await expect(page.getByRole("dialog", { name: /New Repair/ })).toContainText(plate);
  });
});

test.describe("Repair modal: add new vehicle from intake @mobile-only", () => {
  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
  });

  test("opens vehicle form, creates vehicle, returns to repair modal pre-filled", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · new repair · add vehicle inline (mobile)");
    const repairs = new StaffRepairsPage(page);
    const vehicleForm = new StaffVehicleFormPage(page);

    await expect(repairs.staffMobileWorkspaceMenuToggle()).toBeVisible({ timeout: 20_000 });

    await repairs.gotoRepairsSection();
    await repairs.expectRepairsKanbanVisible();

    await repairs.openNewRepairCreateModal();

    await page.getByRole("dialog", { name: /New Repair/ }).getByRole("button", { name: /Or add a brand-new vehicle/ }).click();

    await vehicleForm.expectVehicleIntakeVisible();

    const plate = uniquePlate();
    await vehicleForm.fillVehicleForm(plate, "Toyota", "Corolla", "Vasyl Petrenko");
    await vehicleForm.submitVehicleForm();

    await repairs.expectNewRepairDialogVisible();
    await expect(page.getByRole("dialog", { name: /New Repair/ })).toContainText(plate);
  });
});
