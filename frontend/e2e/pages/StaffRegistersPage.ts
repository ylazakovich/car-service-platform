import { expect, type Locator, type Page } from "@playwright/test";
import { StaffMobileNavigationPage } from "./StaffMobileNavigationPage";

export type RegistersWorkspaceTab = "Units of measure" | "Services" | "Customers";

/**
 * Admin-only **Registers** (reference data): units of measure, services catalog, customers with vehicles.
 */
export class StaffRegistersPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async gotoRegistersSection(): Promise<void> {
    const nav = new StaffMobileNavigationPage(this.page);
    await nav.gotoStaffSection("Registers");
    await expect(this.page.locator(".reference-workspace")).toBeVisible({ timeout: 25_000 });
    await expect(this.page.getByRole("heading", { name: "Registers", level: 2 })).toBeVisible({ timeout: 15_000 });
    await expect(this.page.getByRole("tablist", { name: "Registers sections" })).toBeVisible({ timeout: 10_000 });
  }

  async openTab(tab: RegistersWorkspaceTab): Promise<void> {
    await this.page.getByRole("tab", { name: tab }).click();
  }

  /** Default landing tab after opening Registers. */
  async expectUnitsTabActive(): Promise<void> {
    const tab = this.page.getByRole("tab", { name: "Units of measure" });
    await expect(tab).toHaveAttribute("aria-selected", "true");
    await expect(this.page.getByRole("heading", { name: "Units of measure", level: 3 })).toBeVisible({
      timeout: 15_000,
    });
  }

  uomCodeCell(code: string): Locator {
    return this.page.locator(".reference-workspace .uom-admin-table code").filter({ hasText: new RegExp(`^${code}$`) });
  }

  async expectServicesWorkspaceVisible(): Promise<void> {
    await expect(this.page.getByRole("heading", { name: "Services", level: 3 })).toBeVisible({ timeout: 15_000 });
    await expect(this.page.getByRole("button", { name: "+ Add service" })).toBeVisible();
    await expect(this.page.locator(".services-register-editor-table")).toBeVisible({ timeout: 20_000 });
  }

  servicesSearchInput(): Locator {
    return this.page.getByRole("searchbox", { name: "Search services" });
  }

  /** Service names are `<input value="…">`; match via `value` attribute (avoids `page.getByDisplayValue`, unavailable in CI). */
  serviceRowByNameSnippet(snippet: string | RegExp): Locator {
    const rows = this.page.locator(".services-register-editor-table tbody tr");
    if (typeof snippet === "string") {
      const escaped = snippet.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return rows.filter({ has: this.page.locator(`input[value="${escaped}"]`) });
    }
    return rows.filter({ hasText: snippet });
  }

  async expectCustomersWorkspaceVisible(): Promise<void> {
    await expect(this.page.getByRole("heading", { name: "Customers with vehicles", level: 3 })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      this.page.getByRole("table").filter({ has: this.page.getByRole("columnheader", { name: "Vehicles" }) }),
    ).toBeVisible({ timeout: 15_000 });
  }

  customerRowByName(name: string): Locator {
    return this.page.locator(".registers-customers-page tbody tr").filter({ hasText: name });
  }
}
