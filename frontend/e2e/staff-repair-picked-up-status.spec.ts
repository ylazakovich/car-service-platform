import { expect, test, type Page } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { openStaffApp } from "./fixtures/auth";
import { cleanupIsolatedRepair, createIsolatedRepair, escapeRegExp, type IsolatedRepairFixture } from "./fixtures/repairFactory";
import { StaffRepairsPage } from "./pages/StaffRepairsPage";

const SHOW_MORE_COMPLETED = /^Show \d+ more$/;

function readyToPickupCounter(page: Page) {
  return page.locator(".sidebar-summary__stats:visible li").filter({ hasText: "Ready to pickup" }).locator("strong").first();
}

async function readReadyToPickupCount(page: Page) {
  await expect(readyToPickupCounter(page)).toHaveText(/^[1-9]\d*$/, { timeout: 15_000 });
  return page.evaluate(() => {
    const counters = Array.from(document.querySelectorAll(".sidebar-summary__stats li"));
    const item = counters.find((entry) => {
      const rect = entry.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && entry.textContent?.includes("Ready to pickup");
    });
    const value = item?.querySelector("strong")?.textContent?.trim();
    return Number(value ?? 0);
  });
}

async function openRepairCard(page: Page, trackingCode: string) {
  const board = page.getByLabel("Repairs kanban board");
  await expect(board).toBeVisible({ timeout: 25_000 });
  const tracking = `#${trackingCode}`;

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const card = board.locator(".kanban-card").filter({ hasText: tracking });
    if ((await card.count()) > 0 && (await card.first().isVisible())) {
      await card.first().click();
      return;
    }
    const showMore = page.getByRole("button", { name: SHOW_MORE_COMPLETED });
    if (await showMore.isVisible()) {
      await showMore.click({ force: true });
    } else {
      break;
    }
  }

  const card = board.locator(".kanban-card").filter({ hasText: tracking });
  await expect(card.first()).toBeVisible({ timeout: 25_000 });
  await card.first().click();
}

function repairDialog(page: Page, fixture: IsolatedRepairFixture) {
  const name = new RegExp(`${escapeRegExp(fixture.vehiclePlate)}\\s*•\\s*${escapeRegExp(fixture.vehicleMake)} ${escapeRegExp(fixture.vehicleModel)}`);
  return page.getByRole("dialog", { name });
}

test.describe("Staff repairs — picked up status @desktop", () => {
  test.describe.configure({ mode: "serial" });

  let createdFixtures: IsolatedRepairFixture[] = [];

  test.beforeEach(async ({ page }) => {
    createdFixtures = [];
    await openStaffApp(page);
  });

  test.afterEach(async ({ page }) => {
    for (const fixture of createdFixtures.reverse()) {
      await cleanupIsolatedRepair(page, fixture);
    }
  });

  async function createFixture(page: Page) {
    const fixture = await createIsolatedRepair(page, {
      markerPrefix: "picked-up-e2e",
      status: "completed",
      assignMaster: true,
      serviceName: "Picked up isolation service",
      vehicleModel: "Pickup Isolation",
    });
    createdFixtures.push(fixture);
    await page.reload();
    await openStaffApp(page);
    return fixture;
  }

  test(
    // regression: picked_up status missing — counter never decreases
    "Mark as Picked Up removes repair from kanban and decreases Ready to pickup counter",
    async ({ page }) => {
      await e2eBehaviors("staff", "repairs · picked up · mark + counter decrease");
      const repairs = new StaffRepairsPage(page);
      const fixture = await createFixture(page);

      await repairs.gotoRepairsSection();
      await repairs.expectRepairsKanbanVisible();

      const readyCounter = readyToPickupCounter(page);
      const initialCount = await readReadyToPickupCount(page);

      await openRepairCard(page, fixture.trackingCode);
      const dialog = repairDialog(page, fixture);
      await expect(dialog).toBeVisible({ timeout: 15_000 });

      const pickUpBtn = dialog.getByRole("button", { name: "Mark as Picked Up" });
      await expect(pickUpBtn).toBeVisible();
      await pickUpBtn.click();

      const undoBtn = dialog.getByRole("button", { name: "Undo Pickup" });
      await expect(undoBtn).toBeVisible({ timeout: 10_000 });
      await expect(pickUpBtn).toBeHidden();

      await expect(readyCounter).toHaveText(String(initialCount - 1), { timeout: 10_000 });

      await dialog.getByRole("button", { name: "Cancel" }).click();
      await expect(dialog).toBeHidden();

      const board = page.getByLabel("Repairs kanban board");
      await expect(board.locator(".kanban-card").filter({ hasText: `#${fixture.trackingCode}` })).toBeHidden();
    },
  );

  test(
    // regression: no way to undo picked_up after closing modal
    "Undo Pickup returns repair to completed and restores kanban card",
    async ({ page }) => {
      await e2eBehaviors("staff", "repairs · picked up · undo restores completed");
      const repairs = new StaffRepairsPage(page);
      const fixture = await createFixture(page);

      await repairs.gotoRepairsSection();
      await repairs.expectRepairsKanbanVisible();
      await readReadyToPickupCount(page);

      await openRepairCard(page, fixture.trackingCode);
      const dialog = repairDialog(page, fixture);
      await expect(dialog).toBeVisible({ timeout: 15_000 });
      await dialog.getByRole("button", { name: "Mark as Picked Up" }).click();
      await expect(dialog.getByRole("button", { name: "Undo Pickup" })).toBeVisible({ timeout: 10_000 });

      await dialog.getByRole("button", { name: "Undo Pickup" }).click();
      await expect(dialog.getByRole("button", { name: "Mark as Picked Up" })).toBeVisible({ timeout: 10_000 });

      await dialog.getByRole("button", { name: "Cancel" }).click();
      await expect(dialog).toBeHidden();

      const board = page.getByLabel("Repairs kanban board");
      const completedCol = board.locator(".kanban-col").filter({ hasText: "Completed" });
      await expect(
        completedCol.locator(".kanban-card").filter({ hasText: `#${fixture.trackingCode}` }),
      ).toBeVisible({ timeout: 15_000 });
    },
  );

  test(
    // regression: picked_up card inaccessible after modal closed
    "Picked up repair is findable via search",
    async ({ page }) => {
      await e2eBehaviors("staff", "repairs · picked up · findable via search");
      const repairs = new StaffRepairsPage(page);
      const fixture = await createFixture(page);

      await repairs.gotoRepairsSection();
      await repairs.expectRepairsKanbanVisible();
      await readReadyToPickupCount(page);

      await openRepairCard(page, fixture.trackingCode);
      const dialog = repairDialog(page, fixture);
      await expect(dialog).toBeVisible({ timeout: 15_000 });
      await dialog.getByRole("button", { name: "Mark as Picked Up" }).click();
      await expect(dialog.getByRole("button", { name: "Undo Pickup" })).toBeVisible({ timeout: 10_000 });
      await dialog.getByRole("button", { name: "Cancel" }).click();
      await expect(dialog).toBeHidden();

      // Search by tracking code — picked_up repairs are hidden from desktop kanban columns,
      // but remain searchable in the mobile repairs list data model.
      await page.setViewportSize({ width: 390, height: 844 });
      const searchInput = page.locator(".staff-mobile-taskbar .staff-mobile-search input");
      await searchInput.fill(fixture.trackingCode);

      const mobileList = page.getByLabel("Mobile repairs list");
      const pickedUpCard = mobileList.locator(".repair-mobile-card").filter({
        hasText: fixture.trackingCode,
      });
      await expect(pickedUpCard).toHaveCount(1);
      await expect(pickedUpCard).toContainText(fixture.trackingCode);
    },
  );
});
