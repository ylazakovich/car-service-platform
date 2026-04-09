import { expect, type Locator, type Page } from "@playwright/test";

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

  async openTab(name: "ServiceBoard" | "Warehouse" | "Consumables" | "MoneyFlow"): Promise<void> {
    await this.page.getByRole("tab", { name }).click();
  }

  async expectServiceBoardTab(): Promise<void> {
    await expect(this.page.getByRole("heading", { name: "Service Board KPIs" })).toBeVisible();
    await expect(this.page.getByRole("heading", { name: "Registry baseline" })).toBeVisible();
  }

  async expectWarehouseSuppliersSummary(): Promise<void> {
    await expect(this.page.getByRole("heading", { name: "Supplier portfolio" })).toBeVisible();
  }

  async expectConsumablesTab(): Promise<void> {
    await expect(this.page.getByRole("heading", { name: "Shop consumables" })).toBeVisible();
  }

  async expectMoneyFlowTab(): Promise<void> {
    await expect(this.page.getByRole("heading", { name: "Operations Dashboard" })).toBeVisible();
  }

  /** Секции MoneyFlow с aria-label (новые карточки и «акты»). */
  async expectMoneyFlowLandmarks(): Promise<void> {
    await expect(this.page.getByRole("region", { name: "Sales Plan" })).toBeVisible({ timeout: 30_000 });
    await expect(this.page.getByRole("region", { name: "Acts Coverage" })).toBeVisible();
  }

  /**
   * Открывает попап метрики по стабильному `title` из `ServiceBoardInfoButton`
   * (кнопка `aria-label` = `More info about ${title}`).
   */
  async openMetricInfoPopover(title: string): Promise<void> {
    await this.page.getByRole("button", { name: `More info about ${title}` }).click();
  }

  infoPopoverDialog(title: string): Locator {
    return this.page.getByRole("dialog", { name: `${title} details` });
  }

  async expectMetricInfoPopoverOpen(title: string): Promise<void> {
    const dialog = this.infoPopoverDialog(title);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Formula", { exact: true })).toBeVisible();
  }

  async closeMetricInfoPopover(title: string): Promise<void> {
    await this.page.getByRole("button", { name: `Close info about ${title}` }).click();
    await expect(this.infoPopoverDialog(title)).toBeHidden();
  }

  /** Склад: заголовки и инвойсы (всегда при успешной загрузке warehouse payload). */
  async expectWarehouseStructure(): Promise<void> {
    await expect(this.page.getByRole("heading", { name: "Current Stock Position" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(this.page.getByRole("heading", { name: "Invoice Coverage" })).toBeVisible();
  }

  /**
   * Таблица поставщиков или пустое состояние портфеля — в зависимости от сидов.
   */
  async expectSupplierPortfolioTableOrEmpty(): Promise<void> {
    const table = this.page.locator("table.dashboard-supplier-table");
    const empty = this.page.getByText("No suppliers in the current stock portfolio.");
    await expect(table.or(empty)).toBeVisible();
    if (await table.isVisible()) {
      await expect(this.page.getByRole("columnheader", { name: "Name" })).toBeVisible();
      await expect(this.page.getByRole("columnheader", { name: "On stock" })).toBeVisible();
      await expect(this.page.getByRole("columnheader", { name: "In transit" })).toBeVisible();
      await expect(this.page.getByRole("columnheader", { name: "Total" })).toBeVisible();
    }
  }

  /** MoneyFlow: секция мастеров и две колонки нагрузки / завершённых работ. */
  async expectMastersSectionStructure(): Promise<void> {
    const masters = this.page.locator('section[aria-label="Masters"]');
    await expect(masters).toBeVisible({ timeout: 30_000 });
    await expect(masters.getByRole("heading", { name: "Current load and performance" })).toBeVisible();
    await expect(masters.getByRole("heading", { name: "Assigned now" })).toBeVisible();
    await expect(masters.getByRole("heading", { name: "Completed work" })).toBeVisible();
  }
}
