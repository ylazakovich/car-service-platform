import { expect, type Locator, type Page } from "@playwright/test";
import { StaffMobileNavigationPage } from "./StaffMobileNavigationPage";

/**
 * Табличные реестры Purchases / Vehicles (без карточек и клиентской сортировки).
 */
export class StaffRecordsRegistryPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async gotoPurchasesSection(): Promise<void> {
    const nav = new StaffMobileNavigationPage(this.page);
    await nav.gotoStaffSection("Purchases");
    await expect(this.page.getByRole("heading", { name: "Purchases", level: 2 })).toBeVisible({
      timeout: 25_000,
    });
  }

  /** Purchases → Consumables tab (desktop table or mobile consumable list). */
  async gotoPurchasesConsumablesTab(): Promise<void> {
    await this.gotoPurchasesSection();
    await this.page.getByRole("tab", { name: "Consumables" }).click();
    await expect(this.page.getByRole("tab", { name: "Consumables" })).toHaveAttribute("aria-selected", "true");
    const desktopTable = this.page.getByRole("columnheader", { name: "Bought" });
    const mobileList = this.page.locator(".purchases-consumables-layout ul.purchases-mobile-consumable-list");
    const outOfStockRegion = this.page.getByRole("region", { name: "Out of stock consumables" });
    await expect(desktopTable.or(mobileList).or(outOfStockRegion)).toBeVisible({ timeout: 25_000 });
  }

  async gotoVehiclesSection(): Promise<void> {
    const nav = new StaffMobileNavigationPage(this.page);
    await nav.gotoStaffSection("Vehicles");
    await expect(this.page.locator(".vehicles-workspace")).toBeVisible({ timeout: 25_000 });
  }

  /** Убраны переключатель Cards/Compact и селекты сортировки/группировки. */
  async expectPurchasesRegistryChrome(): Promise<void> {
    await expect(this.page.getByRole("button", { name: "Cards" })).toHaveCount(0);
    await expect(this.page.getByRole("button", { name: "Compact" })).toHaveCount(0);
    await expect(this.page.getByLabel("Sort list")).toHaveCount(0);
    await expect(this.page.getByLabel("Group list")).toHaveCount(0);
    /** ≤820px: склад показывается списком `.purchases-mobile-stock-list`; широкий экран — таблица `.purchases-compact-list`. */
    const desktopRows = this.page.locator(".purchases-workspace .purchases-compact-list");
    const mobileStock = this.page.locator(".purchases-workspace .purchases-mobile-stock-list");
    await expect(desktopRows.or(mobileStock)).toBeVisible({
      timeout: 20_000,
    });
  }

  async expectVehiclesRegistryChrome(): Promise<void> {
    await expect(this.page.getByRole("button", { name: "Cards" })).toHaveCount(0);
    await expect(this.page.getByRole("button", { name: "Compact" })).toHaveCount(0);
    await expect(this.page.getByLabel("Sort list")).toHaveCount(0);
    await expect(this.page.getByLabel("Group list")).toHaveCount(0);
  }

  vehicleSearchInput(surface: "desktop" | "mobile" = "desktop"): Locator {
    if (surface === "mobile") {
      return this.page.locator(".staff-mobile-taskbar .staff-mobile-search input[placeholder='Search vehicles…']");
    }
    return this.page.locator(".vehicles-top-actions input[placeholder='Search vehicles…']");
  }

  purchaseRowByPartSnippet(partSnippet: string | RegExp): Locator {
    const desktopRow = this.page
      .locator(".purchases-workspace .purchases-registry-table .purchases-compact-row")
      .filter({ hasText: partSnippet });
    const mobileRow = this.page
      .locator(".purchases-workspace .purchases-mobile-stock-row")
      .filter({ hasText: partSnippet });
    return desktopRow.or(mobileRow);
  }

  /**
   * Строка ТС. На широком viewport в DOM часто **обе** поверхности (mobile + desktop);
   * для `expect().toBeVisible()` в strict mode нужен один вариант — `surface`.
   */
  vehicleRowByPlate(plate: string, surface: "desktop" | "mobile" | "any" = "any"): Locator {
    const desktopRow = this.page.locator(".vehicle-web-surface .vehicles-compact-row").filter({ hasText: plate });
    const mobileRow = this.page.locator(".vehicles-mobile-surface .vehicles-compact-row").filter({ hasText: plate });
    if (surface === "desktop") return desktopRow;
    if (surface === "mobile") return mobileRow;
    return desktopRow.or(mobileRow);
  }
}
