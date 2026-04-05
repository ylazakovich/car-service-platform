import { expect, type Locator, type Page } from "@playwright/test";
import { SEEDED_REPAIR_CARD_HEADING } from "../e2e-seed";
import { StaffMobileNavigationPage } from "./StaffMobileNavigationPage";

/**
 * Staff repairs board (kanban; mobile list скрыт CSS — на узкой ширине тот же канбан, колонки столбцом).
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

  /** Completed repair without an export yet shows **Make Act**; after first open — **View PDF**. */
  repairPdfPrimaryButton(): Locator {
    return this.page.getByRole("button", { name: /^(View PDF|Make Act)$/ });
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
    await new StaffMobileNavigationPage(this.page).gotoStaffSection("Repairs");
  }

  /**
   * Ждёт канбан, затем открывает CI-seeded completed repair (карточка в колонке Completed).
   */
  async openSeededRepairCard(): Promise<void> {
    const board = this.page.getByLabel("Repairs kanban board");
    await expect(board).toBeVisible({ timeout: 25_000 });
    await this.page.getByRole("heading", { name: SEEDED_REPAIR_CARD_HEADING }).first().click();
  }

  async expectRepairsKanbanVisible(timeoutMs = 25_000): Promise<void> {
    await expect(this.page.getByLabel("Repairs kanban board")).toBeVisible({ timeout: timeoutMs });
  }

  async expectRepairDetailDialogVisible(): Promise<void> {
    await expect(
      this.page.getByRole("dialog", { name: /E2E-CI-001|Demo Sedan/ }),
    ).toBeVisible({ timeout: 15_000 });
  }

  async openCertificateFromViewPdf(): Promise<void> {
    await this.repairPdfPrimaryButton().click();
    await expect(this.certificateDialog()).toBeVisible({ timeout: 30_000 });
  }

  async closeCertificateDialog(): Promise<void> {
    await this.certificateDialog().getByRole("button", { name: "Close" }).click();
    await expect(this.certificateDialog()).toBeHidden();
  }
}
