import { expect, type Locator, type Page } from "@playwright/test";

export class StaffVehicleFormPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  vehicleIntakeDialog(): Locator {
    return this.page.getByRole("dialog").filter({ hasText: "Register Vehicle" });
  }

  async expectVehicleIntakeVisible(): Promise<void> {
    await expect(this.vehicleIntakeDialog()).toBeVisible({ timeout: 15_000 });
  }

  async fillVehicleForm(plate: string, make: string, model: string, ownerNameFragment: string): Promise<void> {
    const dialog = this.vehicleIntakeDialog();
    const ownerSelect = dialog.locator(".inline-owner-select select");
    // Options include phone suffix — find the value whose label contains the fragment
    const value = await ownerSelect.evaluate(
      (sel: HTMLSelectElement, fragment: string) => {
        const opt = Array.from(sel.options).find(
          (o) => o.value !== "" && o.text.includes(fragment)
        );
        return opt?.value ?? "";
      },
      ownerNameFragment,
    );
    await ownerSelect.selectOption(value);
    await dialog.locator("input[placeholder='e.g. KR 2048A']").fill(plate);
    await dialog.locator("input[placeholder='e.g. Toyota']").fill(make);
    await dialog.locator("input[placeholder='e.g. Yaris']").fill(model);
  }

  async submitVehicleForm(): Promise<void> {
    await this.vehicleIntakeDialog().getByRole("button", { name: "Create Vehicle" }).click();
  }
}
