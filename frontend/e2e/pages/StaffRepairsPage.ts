import { expect, type Locator, type Page } from "@playwright/test";
import {
  E2E_DEMO_REPAIR_DIALOG_NAME,
  E2E_DEMO_REPAIR_TRACKING_CODE,
  E2E_DEMO_REPAIR_VEHICLE_PLATE,
  E2E_DEMO_SERVICE_NAME_IN_CATALOG,
} from "../e2e-seed";
import { StaffMobileNavigationPage } from "./StaffMobileNavigationPage";

const SHOW_MORE_COMPLETED = /^Show \d+ more$/;

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
   * Карточка демо-ремонта TOR-1001 на канбане (колонка Completed может показывать только 15 карточек).
   */
  async seededRepairKanbanCard(): Promise<Locator> {
    const board = this.page.getByLabel("Repairs kanban board");
    await expect(board).toBeVisible({ timeout: 25_000 });
    const tracking = `#${E2E_DEMO_REPAIR_TRACKING_CODE}`;

    for (let attempt = 0; attempt < 24; attempt += 1) {
      const card = board.locator(".kanban-card").filter({ hasText: tracking });
      if ((await card.count()) > 0 && (await card.first().isVisible())) {
        return card.first();
      }
      const showMore = this.page.getByRole("button", { name: SHOW_MORE_COMPLETED });
      if (await showMore.isVisible()) {
        /* Fixed shell FAB (.shell-scroll-to-header-fab) can overlap bottom actions on narrow viewports. */
        await showMore.click({ force: true });
      } else {
        break;
      }
    }

    const card = board.locator(".kanban-card").filter({ hasText: tracking });
    await expect(card.first()).toBeVisible({ timeout: 25_000 });
    return card.first();
  }

  /**
   * Ждёт канбан, затем открывает демо-ремонт из `scripts/demo/demo_data.sql` (TOR-1001 в колонке Completed).
   */
  async openSeededRepairCard(): Promise<void> {
    const card = await this.seededRepairKanbanCard();
    await card.click();
  }

  async expectRepairsKanbanVisible(timeoutMs = 25_000): Promise<void> {
    await expect(this.page.getByLabel("Repairs kanban board")).toBeVisible({ timeout: timeoutMs });
  }

  async expectRepairDetailDialogVisible(): Promise<void> {
    const dialog = this.page.getByRole("dialog", { name: E2E_DEMO_REPAIR_DIALOG_NAME });
    await expect(dialog).toBeVisible({ timeout: 20_000 });
  }

  async openCertificateFromViewPdf(): Promise<void> {
    await this.repairPdfPrimaryButton().click();
    await expect(this.certificateDialog()).toBeVisible({ timeout: 30_000 });
  }

  async closeCertificateDialog(): Promise<void> {
    await this.certificateDialog().getByRole("button", { name: "Close" }).click();
    await expect(this.certificateDialog()).toBeHidden();
  }

  /**
   * Desktop staff: topbar **+ New Repair**. Mobile staff (≤820px): rail primary **New Repair** (no `+`).
   */
  async openNewRepairIntakeModal(): Promise<void> {
    const desktop = this.page.getByRole("button", { name: "+ New Repair" });
    const mobile = this.page.getByRole("button", { name: /^New Repair$/ });
    await expect(desktop.or(mobile)).toBeVisible({ timeout: 20_000 });
    if (await desktop.isVisible()) {
      await desktop.click();
    } else {
      await mobile.click();
    }
    await expect(this.page.getByRole("dialog").filter({ hasText: "Repair Intake" })).toBeVisible({
      timeout: 15_000,
    });
  }

  /**
   * Desktop staff: topbar **+ New Repair**. Mobile staff (≤820px): rail primary **New Repair** (no `+`).
   * Waits for the create modal titled "New Repair" (not the intake step "Repair Intake").
   */
  async openNewRepairCreateModal(): Promise<void> {
    const desktop = this.page.getByRole("button", { name: "+ New Repair" });
    const mobile = this.page.getByRole("button", { name: /^New Repair$/ });
    await expect(desktop.or(mobile)).toBeVisible({ timeout: 20_000 });
    if (await desktop.isVisible()) {
      await desktop.click();
    } else {
      await mobile.click();
    }
    await expect(this.page.getByRole("dialog", { name: /New Repair/ })).toBeVisible({
      timeout: 15_000,
    });
  }

  async expectNewRepairDialogVisible(): Promise<void> {
    await expect(this.page.getByRole("dialog", { name: /New Repair/ })).toBeVisible({ timeout: 15_000 });
  }

  async expectNewRepairDialogHidden(): Promise<void> {
    await expect(this.page.getByRole("dialog", { name: /New Repair/ })).toBeHidden({ timeout: 15_000 });
  }

  /** Fill intake using demo vehicle + catalog service (`scripts/demo/demo_data.sql`). */
  async fillCreateRepairForm(issueNotesMarker: string): Promise<void> {
    await this.page.getByLabel("Search vehicle for repair").fill(E2E_DEMO_REPAIR_VEHICLE_PLATE);
    await this.page.getByRole("button", { name: new RegExp(`${E2E_DEMO_REPAIR_VEHICLE_PLATE}\\s*•`) }).click();

    const line1 = this.page.getByRole("textbox", { name: /Line 1/ });
    await line1.fill(E2E_DEMO_SERVICE_NAME_IN_CATALOG);
    // Select the matching catalog suggestion to ensure catalog_service_id is wired.
    const suggestion = this.page.getByRole("listbox").getByRole("button", {
      name: new RegExp(E2E_DEMO_SERVICE_NAME_IN_CATALOG, "i"),
    });
    await expect(suggestion).toBeVisible({ timeout: 10_000 });
    await suggestion.click();

    await this.page.getByLabel("Issue Notes").fill(issueNotesMarker);
  }

  async submitCreateRepair(): Promise<void> {
    await this.page.getByRole("button", { name: "Create Repair" }).click();
  }

  /** New repairs prepend; issue notes render in `.kanban-card-issue`. */
  async expectKanbanCardShowsIssueNotes(marker: string): Promise<void> {
    const cardIssue = this.page.locator(".kanban-card-issue").filter({ hasText: marker });
    await expect(cardIssue.first()).toBeVisible({ timeout: 30_000 });
  }

  /**
   * `.kanban-card-plate` inside the given kanban card.
   * Returns the plate span scoped to the card so callers can assert text content.
   */
  cardPlate(card: Locator): Locator {
    return card.locator(".kanban-card-plate");
  }

  /**
   * `.kanban-card-model` inside the given kanban card.
   * Rendered only when vehicle_model/year/mileage data is present.
   */
  cardModel(card: Locator): Locator {
    return card.locator(".kanban-card-model");
  }

  /**
   * `time.kanban-card-time` inside the given kanban card.
   * Rendered only when `started_at` is non-null on the repair.
   */
  cardTime(card: Locator): Locator {
    return card.locator("time.kanban-card-time");
  }

  /**
   * First kanban card in the "In Progress" column.
   * The column header contains the text "In Progress" — scoped via `.kanban-col` that contains it.
   */
  firstInProgressCard(): Locator {
    const board = this.page.getByLabel("Repairs kanban board");
    const inProgressCol = board.locator(".kanban-col").filter({ hasText: "In Progress" });
    return inProgressCol.locator(".kanban-card").first();
  }
}
