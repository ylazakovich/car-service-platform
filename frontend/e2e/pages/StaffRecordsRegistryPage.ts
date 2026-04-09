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

  async gotoVehiclesSection(): Promise<void> {
    const nav = new StaffMobileNavigationPage(this.page);
    await nav.gotoStaffSection("Vehicles");
    // При пустом списке ТС реестр (vehicle-web-surface) не рендерится — достаточно контейнера секции.
    // На staff-mobile заголовок h2 в topbar скрыт CSS — не ждём heading.
    await expect(this.page.locator(".vehicles-workspace")).toBeVisible({ timeout: 25_000 });
  }

  /** Убраны переключатель Cards/Compact и селекты сортировки/группировки. */
  async expectPurchasesRegistryChrome(): Promise<void> {
    await expect(this.page.getByRole("button", { name: "Cards" })).toHaveCount(0);
    await expect(this.page.getByRole("button", { name: "Compact" })).toHaveCount(0);
    await expect(this.page.getByLabel("Sort list")).toHaveCount(0);
    await expect(this.page.getByLabel("Group list")).toHaveCount(0);
    await expect(this.page.locator(".purchases-workspace .purchases-compact-list")).toBeVisible({
      timeout: 20_000,
    });
  }

  async expectVehiclesRegistryChrome(): Promise<void> {
    await expect(this.page.getByRole("button", { name: "Cards" })).toHaveCount(0);
    await expect(this.page.getByRole("button", { name: "Compact" })).toHaveCount(0);
    await expect(this.page.getByLabel("Sort list")).toHaveCount(0);
    await expect(this.page.getByLabel("Group list")).toHaveCount(0);
  }

  purchaseRowByPartSnippet(partSnippet: string | RegExp): Locator {
    return this.page
      .locator(".purchases-workspace .purchases-registry-table .purchases-compact-row")
      .filter({ hasText: partSnippet });
  }

  /**
   * Строка ТС в видимом списке. В DOM одновременно mobile + desktop поверхности;
   * таргетим обе, чтобы не ловить strict violation на скрытой копии.
   */
  vehicleRowByPlate(plate: string): Locator {
    const desktopRow = this.page.locator(".vehicle-web-surface .vehicles-compact-row").filter({ hasText: plate });
    const mobileRow = this.page.locator(".vehicles-mobile-surface .vehicles-compact-row").filter({ hasText: plate });
    return desktopRow.or(mobileRow);
  }
}
