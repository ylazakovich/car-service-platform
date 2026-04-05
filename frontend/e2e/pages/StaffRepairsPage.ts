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

  staffQuickNav(): Locator {
    return this.page.getByRole("navigation", { name: "Staff quick navigation" });
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
   * Перейти в раздел Repairs без strict-mode (на узком экране несколько кнопок «Repairs»).
   * Один union-локатор + waitFor — избегаем isVisible() без ожидания (гидрация shell).
   */
  async gotoRepairsSection(): Promise<void> {
    const repairsEntry = this.page
      .getByLabel("Staff quick navigation")
      .getByRole("button", { name: "Repairs" })
      .or(this.page.getByLabel("Staff task switcher").getByRole("button", { name: "Repairs" }))
      .or(this.page.getByLabel("Staff sections").getByRole("button", { name: "Repairs" }));
    await repairsEntry.waitFor({ state: "visible", timeout: 20_000 });
    await repairsEntry.click();
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
