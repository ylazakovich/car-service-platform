import { expect, type Page } from "@playwright/test";

/**
 * Admin Operations Dashboard — tab navigation and headings.
 */
export class AdminDashboardPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async expectOperationsDashboardVisible(): Promise<void> {
    await expect(this.page.getByRole("heading", { name: "Operations Dashboard" })).toBeVisible({
      timeout: 30_000,
    });
  }

  async openTab(name: "ServiceBoard" | "Warehouse" | "MoneyFlow"): Promise<void> {
    await this.page.getByRole("tab", { name }).click();
  }

  async expectServiceBoardTab(): Promise<void> {
    await expect(this.page.getByRole("heading", { name: "Service Board KPIs" })).toBeVisible();
    await expect(this.page.getByRole("heading", { name: "Registry baseline" })).toBeVisible();
  }

  async expectWarehouseSuppliersSummary(): Promise<void> {
    await expect(this.page.getByRole("heading", { name: "Supplier portfolio" })).toBeVisible();
  }

  async expectMoneyFlowTab(): Promise<void> {
    await expect(this.page.getByRole("heading", { name: "Operations Dashboard" })).toBeVisible();
  }
}
