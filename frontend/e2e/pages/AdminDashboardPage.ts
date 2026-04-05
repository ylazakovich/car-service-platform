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

  async openTab(name: "ServiceBoard" | "Procurement" | "MoneyFlow"): Promise<void> {
    await this.page.getByRole("tab", { name }).click();
  }

  async expectServiceBoardTab(): Promise<void> {
    await expect(this.page.getByRole("heading", { name: "Operations Dashboard" })).toBeVisible();
  }

  async expectProcurementSummary(): Promise<void> {
    await expect(this.page.getByRole("heading", { name: "Top suppliers by spend" })).toBeVisible();
  }

  async expectMoneyFlowTab(): Promise<void> {
    await expect(this.page.getByRole("heading", { name: "Operations Dashboard" })).toBeVisible();
  }
}
