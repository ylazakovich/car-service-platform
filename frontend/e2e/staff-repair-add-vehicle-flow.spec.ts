import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { openStaffApp } from "./fixtures/auth";
import { createE2eCustomer } from "./fixtures/e2eDataFactory";
import { StaffRepairsPage } from "./pages/StaffRepairsPage";
import { StaffVehicleFormPage } from "./pages/StaffVehicleFormPage";

function uniquePlate(): string {
  return `E2E-${Date.now()}`;
}

async function cleanupCreatedVehicleAndOwner(page: import("@playwright/test").Page, plate: string, customerId: number): Promise<void> {
  await page.evaluate(async ({ plateValue, customerIdValue }) => {
    const token = document.cookie.split(";").map((entry) => entry.trim()).find((entry) => entry.startsWith("csrftoken="))?.split("=")[1];
    const headers: Record<string, string> = token ? { "X-CSRFToken": token } : {};
    const vehiclesResponse = await fetch(`/api/vehicles/?q=${encodeURIComponent(plateValue)}&page_size=20`, { credentials: "include" });
    if (vehiclesResponse.ok) {
      const payload = await vehiclesResponse.json();
      const vehicles = Array.isArray(payload) ? payload : (payload.results ?? []);
      for (const vehicle of vehicles) {
        if (vehicle.license_plate === plateValue) {
          await fetch(`/api/vehicles/${vehicle.id}`, { method: "DELETE", credentials: "include", headers });
        }
      }
    }
    await fetch(`/api/customers/${customerIdValue}`, { method: "DELETE", credentials: "include", headers });
  }, { plateValue: plate, customerIdValue: customerId });
}

test.describe("Repair modal: add new vehicle from intake @desktop", () => {
  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
  });

  test("opens vehicle form, creates vehicle, returns to repair modal pre-filled", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · new repair · add vehicle inline (desktop)");
    const repairs = new StaffRepairsPage(page);
    const vehicleForm = new StaffVehicleFormPage(page);
    const owner = await createE2eCustomer(page, "inline-owner");
    const plate = uniquePlate();

    try {
      await openStaffApp(page);
      await repairs.gotoRepairsSection();
      await repairs.expectRepairsKanbanVisible();

      await repairs.openNewRepairCreateModal();

      await page.getByRole("dialog", { name: /New Repair/ }).getByRole("button", { name: /Or add a brand-new vehicle/ }).click();

      await vehicleForm.expectVehicleIntakeVisible();

      await vehicleForm.fillVehicleForm(plate, "Toyota", "Corolla", owner.customerName);
      await vehicleForm.submitVehicleForm();

      await repairs.expectNewRepairDialogVisible();
      await expect(page.getByRole("dialog", { name: /New Repair/ })).toContainText(plate);
    } finally {
      await cleanupCreatedVehicleAndOwner(page, plate, owner.customerId);
    }
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
    const owner = await createE2eCustomer(page, "inline-owner-mobile");
    const plate = uniquePlate();

    try {
      await openStaffApp(page);
      await expect(repairs.staffMobileWorkspaceMenuToggle()).toBeVisible({ timeout: 20_000 });

      await repairs.gotoRepairsSection();
      await repairs.expectRepairsKanbanVisible();

      await repairs.openNewRepairCreateModal();

      await page.getByRole("dialog", { name: /New Repair/ }).getByRole("button", { name: /Or add a brand-new vehicle/ }).click();

      await vehicleForm.expectVehicleIntakeVisible();

      await vehicleForm.fillVehicleForm(plate, "Toyota", "Corolla", owner.customerName);
      await vehicleForm.submitVehicleForm();

      await repairs.expectNewRepairDialogVisible();
      await expect(page.getByRole("dialog", { name: /New Repair/ })).toContainText(plate);
    } finally {
      await cleanupCreatedVehicleAndOwner(page, plate, owner.customerId);
    }
  });
});
