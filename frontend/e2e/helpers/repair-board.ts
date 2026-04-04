import { expect, type Page } from "@playwright/test";
import { SEEDED_REPAIR_CARD_HEADING } from "../e2e-seed";

/**
 * Staff: перейти в раздел Repairs без strict-mode (на узком экране несколько кнопок «Repairs»).
 * Порядок: нижний tabbar → переключатель задач → боковое меню.
 */
export async function navigateToStaffRepairs(page: Page): Promise<void> {
  const quickNav = page.getByLabel("Staff quick navigation");
  if (await quickNav.isVisible()) {
    await quickNav.getByRole("button", { name: "Repairs" }).click();
    return;
  }
  const taskSwitcher = page.getByLabel("Staff task switcher");
  if (await taskSwitcher.isVisible()) {
    await taskSwitcher.getByRole("button", { name: "Repairs" }).click();
    return;
  }
  await page.getByLabel("Staff sections").getByRole("button", { name: "Repairs" }).click();
}

/**
 * Ждёт видимый kanban или мобильный список (оба узла могут быть в DOM, один скрыт CSS).
 * Затем открывает CI-seeded completed repair.
 */
export async function openSeededRepairCard(page: Page): Promise<void> {
  const mobileList = page.getByLabel("Mobile repairs list");
  const desktopBoard = page.getByLabel("Desktop repairs board");
  await expect
    .poll(
      async () => (await mobileList.isVisible()) || (await desktopBoard.isVisible()),
      { timeout: 25_000 },
    )
    .toBe(true);

  if (await mobileList.isVisible()) {
    await page.locator(".repair-mobile-open").filter({ hasText: /E2E-CI-001/ }).first().click();
    return;
  }

  await page.getByRole("heading", { name: SEEDED_REPAIR_CARD_HEADING }).first().click();
}
