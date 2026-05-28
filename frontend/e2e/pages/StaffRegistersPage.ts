import { expect, type Locator, type Page } from "@playwright/test";
import { StaffNavigationPage } from "./StaffNavigationPage";

export type RegistersWorkspaceTab = "Units of measure" | "Services" | "Customers";

/**
 * Admin-only **Registers** (reference data): units of measure, services catalog, customers (with vehicle counts).
 */
export class StaffRegistersPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async gotoRegistersSection(): Promise<void> {
    const nav = new StaffNavigationPage(this.page);
    await nav.gotoStaffSection("Registers");
    await expect(this.page.locator(".reference-workspace")).toBeVisible({ timeout: 25_000 });

    /** На ≤820px блок `.registers-shell-header` скрыт в CSS — заголовок только в sticky shell (иначе `.or(h2)` даёт strict: два узла). */
    const narrowMobile =
      (await this.page.evaluate(
        () => typeof window !== "undefined" && window.matchMedia("(max-width: 820px)").matches,
      )) === true;

    if (narrowMobile) {
      await expect(
        this.page.locator(".shell-mobile-sticky-stack .shell-mobile-section-title").filter({ hasText: /^Registers$/ }),
      ).toBeVisible({ timeout: 15_000 });
    } else {
      await expect(this.page.getByRole("heading", { name: "Registers", level: 2 })).toBeVisible({ timeout: 15_000 });
    }

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
    const desktop = this.page.locator(".reference-workspace .uom-admin-table code").filter({ hasText: new RegExp(`^${code}$`) });
    const mobile = this.page.locator(".reference-workspace .uom-mobile-unit-code").filter({ hasText: new RegExp(`^${code}$`) });
    return desktop.or(mobile);
  }

  async expectServicesWorkspaceVisible(): Promise<void> {
    await expect(this.page.getByRole("heading", { name: "Services", level: 3 })).toBeVisible({ timeout: 15_000 });
    await expect(this.page.getByRole("button", { name: "+ Add service" })).toBeVisible();
    /** ≤820px: каталог — список `aria-label="Services catalog"`; широкий экран — таблица. */
    const catalogTable = this.page.locator(".services-register-editor-table");
    const catalogMobileList = this.page.getByRole("list", { name: "Services catalog" });
    await expect(catalogTable.or(catalogMobileList)).toBeVisible({ timeout: 20_000 });
  }

  servicesSearchInput(): Locator {
    return this.page.getByRole("searchbox", { name: "Search services" });
  }

  /** Desktop: имя в `<input value>` строки таблицы. Mobile: свёрнутая строка — текст в `.uom-mobile-unit-name`. */
  serviceRowByNameSnippet(snippet: string | RegExp): Locator {
    const desktopRows = this.page.locator(".services-register-editor-table tbody tr");
    const mobileRows = this.page.locator(".uom-mobile-unit-list .uom-mobile-unit-item");
    if (typeof snippet === "string") {
      const escaped = snippet.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return desktopRows
        .filter({ has: this.page.locator(`input[value="${escaped}"]`) })
        .or(mobileRows.filter({ hasText: snippet }));
    }
    return desktopRows.filter({ hasText: snippet }).or(mobileRows.filter({ hasText: snippet }));
  }

  async expectCustomersWorkspaceVisible(): Promise<void> {
    await expect(this.page.getByRole("heading", { name: "Customers", level: 3 })).toBeVisible({
      timeout: 15_000,
    });
    const narrowMobile =
      (await this.page.evaluate(
        () => typeof window !== "undefined" && window.matchMedia("(max-width: 820px)").matches,
      )) === true;
    if (narrowMobile) {
      await expect(this.page.getByRole("list", { name: "Customers registry" })).toBeVisible({ timeout: 15_000 });
    } else {
      await expect(
        this.page.getByRole("table").filter({ has: this.page.getByRole("columnheader", { name: "Vehicles" }) }),
      ).toBeVisible({ timeout: 15_000 });
    }
  }

  /**
   * Desktop: `<input value="…">` в строке таблицы.
   * Mobile (≤820px): компактный список `.uom-mobile-unit-item` — перед проверкой Save/Delete раскройте строку (`expandCustomerMobileRow`).
   */
  customerRowByName(name: string): Locator {
    const rows = this.page.locator(".registers-customers-page tbody tr");
    const escaped = name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const desktop = rows.filter({ has: this.page.locator(`input[value="${escaped}"]`) });
    const mobile = this.page
      .getByRole("list", { name: "Customers registry" })
      .locator("li.uom-mobile-unit-item")
      .filter({ has: this.page.locator(".uom-mobile-unit-name", { hasText: name }) });
    return desktop.or(mobile);
  }

  /** На узкой ширине Save/Delete в развёрнутом блоке строки клиента. */
  async expandCustomerMobileRowIfNeeded(name: string): Promise<void> {
    const narrowMobile =
      (await this.page.evaluate(
        () => typeof window !== "undefined" && window.matchMedia("(max-width: 820px)").matches,
      )) === true;
    if (!narrowMobile) return;

    const row = this.customerRowByName(name);
    await row.locator("button.uom-mobile-unit-summary").click();
  }
}
