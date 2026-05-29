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

function completedColumn(page: Page) {
  return page.getByLabel("Repairs kanban board").locator(".kanban-col").filter({ hasText: "Completed" }).first();
}

async function expectDefaultDateFilterIs30Days(page: Page) {
  const filter = page.locator(".kanban-date-filter").first();
  await expect(filter.locator(".kanban-date-chip", { hasText: "30 days" })).toHaveClass(/active/);
  await expect(filter.locator(".kanban-date-chip", { hasText: "All time" })).not.toHaveClass(/active/);
}

async function expectPickedUpCardDimmedInCompletedColumn(page: Page, trackingCode: string) {
  const card = completedColumn(page).locator(".kanban-card").filter({ hasText: `#${trackingCode}` }).first();
  await expect(card).toBeVisible({ timeout: 15_000 });
  await expect(card).toHaveClass(/kanban-card--picked-up/);
  await expect
    .poll(async () => Number(await card.evaluate((element) => window.getComputedStyle(element).opacity)))
    .toBeLessThan(0.8);
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
    // regression: picked_up cards should stay visible but look inactive instead of disappearing
    "Mark as Picked Up keeps repair in Completed as a dimmed card after Ready to pickup count updates",
    async ({ page }) => {
      await e2eBehaviors("staff", "repairs · picked up · desktop completed dimmed card");
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

      await expectPickedUpCardDimmedInCompletedColumn(page, fixture.trackingCode);
    },
  );

  test("Repairs board defaults to the 30 days date filter", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · date filter · default 30 days desktop");
    const repairs = new StaffRepairsPage(page);

    await repairs.gotoRepairsSection();
    await repairs.expectRepairsKanbanVisible();

    await expectDefaultDateFilterIs30Days(page);
  });

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
    // regression: picked_up remains searchable while staying visible in Completed
    "Picked up repair remains findable via search in the Completed column",
    async ({ page }) => {
      await e2eBehaviors("staff", "repairs · picked up · desktop searchable completed card");
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

      const searchInput = page.getByPlaceholder("Search repairs…");
      await searchInput.fill(fixture.trackingCode);

      await expectPickedUpCardDimmedInCompletedColumn(page, fixture.trackingCode);
    },
  );
});

test.describe("Staff repairs — picked up status @mobile-only", () => {
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
      markerPrefix: "picked-up-mobile-e2e",
      status: "completed",
      assignMaster: true,
      serviceName: "Picked up mobile isolation service",
      vehicleModel: "Pickup Mobile Isolation",
    });
    createdFixtures.push(fixture);
    await page.reload();
    await openStaffApp(page);
    return fixture;
  }

  test("Repairs board defaults to the 30 days date filter", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · date filter · default 30 days mobile");
    const repairs = new StaffRepairsPage(page);

    await repairs.gotoRepairsSection();
    await repairs.expectRepairsKanbanVisible();

    await expectDefaultDateFilterIs30Days(page);
  });

  test("Mark as Picked Up keeps repair in Completed as a dimmed card", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · picked up · mobile completed dimmed card");
    const repairs = new StaffRepairsPage(page);
    const fixture = await createFixture(page);

    await repairs.gotoRepairsSection();
    await repairs.expectRepairsKanbanVisible();

    await openRepairCard(page, fixture.trackingCode);
    const dialog = repairDialog(page, fixture);
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await dialog.getByRole("button", { name: "Mark as Picked Up" }).click();
    await expect(dialog.getByRole("button", { name: "Undo Pickup" })).toBeVisible({ timeout: 10_000 });
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();

    await expectPickedUpCardDimmedInCompletedColumn(page, fixture.trackingCode);
  });
});
