import { expect, type Locator, type Page } from "@playwright/test";
import { SEEDED_REPAIR_CARD_HEADING } from "../e2e-seed";

/**
 * Staff repairs board (desktop kanban + mobile list) and seeded E2E card.
 */
export class StaffRepairsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** Раскрытый блок секций/аккаунта (до открытия шапки `hidden` — не полагаемся на a11y tree). */
  staffQuickNav(): Locator {
    return this.page.locator("#mobile-section-picker");
  }

  /** Кнопка в шапке мобильного staff-shell: открыть/закрыть меню секций и аккаунта. */
  staffMobileWorkspaceMenuToggle(): Locator {
    return this.page.getByRole("button", { name: /Open workspace menu|Close workspace menu/ });
  }

  certificateDialog(): Locator {
    return this.page.getByRole("dialog", { name: "Certificate of Completion" });
  }

  viewPdfButton(): Locator {
    return this.page.getByRole("button", { name: "View PDF" });
  }

  exportNewVersionButton(): Locator {
    return this.page.getByRole("button", { name: "Export new version" });
  }

  /**
   * Перейти в раздел Repairs. На мобилке в DOM одновременно несколько кнопок «Repairs»
   * (tabbar / switcher / sidebar) — union `.or()` даёт strict mode violation при waitFor/click.
   * Сначала poll до появления любой навигации (гидрация), затем клик по приоритету как раньше в helpers/repair-board.
   */
  async gotoRepairsSection(): Promise<void> {
    const mobileToggle = this.staffMobileWorkspaceMenuToggle();
    const quickNav = this.staffQuickNav();
    const taskSwitcher = this.page.getByLabel("Staff task switcher");
    const staffSections = this.page.getByLabel("Staff sections");

    await expect
      .poll(
        async () =>
          (await mobileToggle.isVisible()) || (await taskSwitcher.isVisible()) || (await staffSections.isVisible()),
        { timeout: 20_000 },
      )
      .toBe(true);

    if (await mobileToggle.isVisible()) {
      await mobileToggle.click();
      await expect(quickNav).toBeVisible({ timeout: 10_000 });
      await quickNav.getByRole("button", { name: "Repairs" }).click();
      return;
    }
    if (await taskSwitcher.isVisible()) {
      await taskSwitcher.getByRole("button", { name: "Repairs" }).click();
      return;
    }
    await staffSections.getByRole("button", { name: "Repairs" }).click();
  }

  /**
   * Ждёт видимый kanban или мобильный список, затем открывает CI-seeded completed repair.
   */
  async openSeededRepairCard(): Promise<void> {
    const mobileList = this.page.getByLabel("Mobile repairs list");
    const desktopBoard = this.page.getByLabel("Desktop repairs board");
    await expect
      .poll(
        async () => (await mobileList.isVisible()) || (await desktopBoard.isVisible()),
        { timeout: 25_000 },
      )
      .toBe(true);

    if (await mobileList.isVisible()) {
      await this.page.locator(".repair-mobile-open").filter({ hasText: /E2E-CI-001/ }).first().click();
      return;
    }

    await this.page.getByRole("heading", { name: SEEDED_REPAIR_CARD_HEADING }).first().click();
  }

  async expectMobileRepairsListVisible(timeoutMs = 25_000): Promise<void> {
    await expect(this.page.getByLabel("Mobile repairs list")).toBeVisible({ timeout: timeoutMs });
  }

  async expectRepairDetailDialogVisible(): Promise<void> {
    await expect(
      this.page.getByRole("dialog", { name: /E2E-CI-001|Demo Sedan/ }),
    ).toBeVisible({ timeout: 15_000 });
  }

  async openCertificateFromViewPdf(): Promise<void> {
    await this.viewPdfButton().click();
    await expect(this.certificateDialog()).toBeVisible({ timeout: 30_000 });
  }

  async closeCertificateDialog(): Promise<void> {
    await this.certificateDialog().getByRole("button", { name: "Close" }).click();
    await expect(this.certificateDialog()).toBeHidden();
  }
}
