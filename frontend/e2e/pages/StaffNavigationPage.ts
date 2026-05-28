import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Staff workspace navigation helper for responsive E2E flows.
 * Handles the narrow workspace menu, task switcher, and wide sidebar without exposing viewport-specific page object names.
 */
export class StaffNavigationPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  staffQuickNav(): Locator {
    return this.page.locator("#mobile-section-picker");
  }

  workspaceMenuToggle(): Locator {
    return this.page.getByRole("button", { name: /Open workspace menu|Close workspace menu/ });
  }

  sectionsAndAccountNav(): Locator {
    return this.page.getByRole("navigation", { name: "Sections and account" });
  }

  taskSwitcher(): Locator {
    return this.page.getByLabel("Staff task switcher");
  }

  staffSectionsSidebar(): Locator {
    return this.page.getByLabel("Staff sections");
  }

  headerSectionTitle(): Locator {
    return this.page.locator(".shell-mobile-section-title");
  }

  /**
   * Дождаться гидрации: на мобилке — toggle или task rail; на десктопе — боковая навигация staff.
   */
  async waitForStaffNavigationChrome(): Promise<void> {
    const mobileToggle = this.workspaceMenuToggle();
    const taskSwitcher = this.taskSwitcher();
    const staffSections = this.staffSectionsSidebar();

    await expect
      .poll(
        async () =>
          (await mobileToggle.isVisible()) || (await taskSwitcher.isVisible()) || (await staffSections.isVisible()),
        { timeout: 20_000 },
      )
      .toBe(true);
  }

  /**
   * Сценарии @mobile-only опираются на shell ≤820px: кнопка workspace в шапке должна быть в DOM и видима.
   * (Общий `waitForStaffNavigationChrome` может пройти по sidebar/task rail в смешанных вьюпортах.)
   */
  async expectMobileWorkspaceMenuToggle(): Promise<void> {
    await expect(this.workspaceMenuToggle()).toBeVisible({ timeout: 25_000 });
  }

  /**
   * Перейти в секцию (меню шапки, иначе task switcher, иначе sidebar).
   * Staff видит только Vehicles / Repairs; admin — также Dashboard, Purchases, Users.
   */
  async gotoStaffSection(
    section: "Dashboard" | "Vehicles" | "Repairs" | "Purchases" | "Registers" | "Users",
  ): Promise<void> {
    await this.waitForStaffNavigationChrome();

    const mobileToggle = this.workspaceMenuToggle();
    const quickNav = this.staffQuickNav();
    const taskSwitcher = this.taskSwitcher();
    const staffSections = this.staffSectionsSidebar();

    if (await mobileToggle.isVisible()) {
      await mobileToggle.click();
      await expect(quickNav).toBeVisible({ timeout: 10_000 });
      await quickNav.getByRole("button", { name: section }).click();
      return;
    }
    if (await taskSwitcher.isVisible()) {
      await taskSwitcher.getByRole("button", { name: section }).click();
      return;
    }
    await staffSections.getByRole("button", { name: section }).click();
  }

  async expectHeaderShows(sectionLabel: string): Promise<void> {
    await expect(this.headerSectionTitle()).toHaveText(sectionLabel, { timeout: 15_000 });
  }

  async openWorkspaceMenu(): Promise<void> {
    await this.workspaceMenuToggle().click();
    await expect(this.sectionsAndAccountNav()).toBeVisible({ timeout: 10_000 });
  }

  async closeWorkspaceMenuViaBackdrop(): Promise<void> {
    await this.page.getByRole("button", { name: "Close sections and account" }).click();
    await expect(this.staffQuickNav()).toBeHidden({ timeout: 5_000 });
  }
}
