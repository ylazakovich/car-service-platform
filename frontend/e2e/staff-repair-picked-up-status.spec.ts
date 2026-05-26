import { expect, test, type Page } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { E2E_DEMO_REPAIR_TRACKING_CODE } from "./e2e-seed";
import { openStaffApp } from "./fixtures/auth";
import { StaffRepairsPage } from "./pages/StaffRepairsPage";

const SHOW_MORE_COMPLETED = /^Show \d+ more$/;

type ApiRepair = {
  id: number;
  vehicle_id: number;
  master_id: number | null;
  service_name: string;
  service_lines?: Array<{ name: string; catalog_service_id: number | null; sort_order?: number }>;
  issue_notes: string;
  mileage: number | null;
  mileage_at_service?: number | null;
  tracking_code: string;
};

function todayIsoDate() {
  return new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function readyToPickupCounter(page: Page) {
  return page.locator(".sidebar-summary__stats li").filter({ hasText: "Ready to pickup" }).locator("strong");
}

async function readReadyToPickupCount(page: Page) {
  const counter = readyToPickupCounter(page);
  await expect(counter).toHaveText(/^[1-9]\d*$/, { timeout: 15_000 });
  return parseInt(await counter.innerText(), 10);
}

async function createCompletedRepairClone(page: Page, marker: string): Promise<ApiRepair> {
  return page.evaluate(
    async ({ seedTrackingCode, issueMarker, completedAt }) => {
      const seedResponse = await fetch(`/api/repairs/?q=${encodeURIComponent(seedTrackingCode)}`, {
        credentials: "include",
      });
      if (!seedResponse.ok) {
        throw new Error(`Failed to find seed repair ${seedTrackingCode}: ${seedResponse.status}`);
      }

      const repairs = (await seedResponse.json()) as ApiRepair[];
      const seed = repairs.find((entry) => entry.tracking_code === seedTrackingCode);
      if (!seed) {
        throw new Error(`Seed repair ${seedTrackingCode} was not found`);
      }

      const csrf = document.cookie
        .split(";")
        .map((entry) => entry.trim())
        .find((entry) => entry.startsWith("csrftoken="))
        ?.split("=")[1];

      const createResponse = await fetch("/api/repairs/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "X-CSRFToken": csrf } : {}),
        },
        body: JSON.stringify({
          vehicle_id: seed.vehicle_id,
          master_id: seed.master_id,
          service_name: seed.service_name,
          service_lines: (seed.service_lines ?? [{ name: seed.service_name, catalog_service_id: null, sort_order: 0 }]).map(
            (line, index) => ({
              name: line.name,
              catalog_service_id: line.catalog_service_id,
              sort_order: line.sort_order ?? index,
            }),
          ),
          issue_notes: issueMarker,
          status: "completed",
          completed_at: completedAt,
          mileage_at_service: seed.mileage_at_service ?? seed.mileage ?? 123456,
        }),
      });
      if (!createResponse.ok) {
        throw new Error(`Failed to create isolated completed repair: ${createResponse.status}`);
      }

      return (await createResponse.json()) as ApiRepair;
    },
    {
      seedTrackingCode: E2E_DEMO_REPAIR_TRACKING_CODE,
      issueMarker: marker,
      completedAt: todayIsoDate(),
    },
  );
}

async function deleteRepairViaApi(page: Page, repairId: number) {
  await page.evaluate(async (id) => {
    const csrf = document.cookie
      .split(";")
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith("csrftoken="))
      ?.split("=")[1];

    const deleteResponse = await fetch(`/api/repairs/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: {
        ...(csrf ? { "X-CSRFToken": csrf } : {}),
      },
    });
    if (!deleteResponse.ok && deleteResponse.status !== 404) {
      throw new Error(`Failed to delete repair ${id}: ${deleteResponse.status}`);
    }
  }, repairId);
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

test.describe("Staff repairs — picked up status @desktop", () => {
  let createdRepairIds: number[] = [];

  test.beforeEach(async ({ page }) => {
    createdRepairIds = [];
    await openStaffApp(page);
  });

  test.afterEach(async ({ page }) => {
    for (const repairId of createdRepairIds) {
      await deleteRepairViaApi(page, repairId);
    }
  });

  async function createIsolatedCompletedRepair(page: Page, testTitle: string) {
    const repair = await createCompletedRepairClone(page, `picked-up-e2e · ${testTitle} · ${Date.now()}`);
    createdRepairIds.push(repair.id);
    await page.reload();
    await openStaffApp(page);
    return repair;
  }

  test(
    // regression: picked_up status missing — counter never decreases
    "Mark as Picked Up removes repair from kanban and decreases Ready to pickup counter",
    async ({ page }) => {
      await e2eBehaviors("staff", "repairs · picked up · mark + counter decrease");
      const repairs = new StaffRepairsPage(page);
      const repair = await createIsolatedCompletedRepair(page, "mark picked up");

      await repairs.gotoRepairsSection();
      await repairs.expectRepairsKanbanVisible();

      // Read initial "Ready to pickup" count from Today Summary after async repairs have loaded.
      const readyCounter = readyToPickupCounter(page);
      const initialCount = await readReadyToPickupCount(page);

      // Open an isolated completed repair created for this test.
      await openRepairCard(page, repair.tracking_code);
      await repairs.expectRepairDetailDialogVisible();

      const dialog = page.getByRole("dialog", { name: /AA 1234 BB/ });
      await expect(dialog).toBeVisible({ timeout: 15_000 });

      // "Mark as Picked Up" button must be visible for completed repairs
      const pickUpBtn = dialog.getByRole("button", { name: "Mark as Picked Up" });
      await expect(pickUpBtn).toBeVisible();
      await pickUpBtn.click();

      // Dialog stays open (locked mode) and shows "Undo Pickup"
      const undoBtn = dialog.getByRole("button", { name: "Undo Pickup" });
      await expect(undoBtn).toBeVisible({ timeout: 10_000 });

      // "Mark as Picked Up" is gone
      await expect(pickUpBtn).toBeHidden();

      // Counter must have decreased by 1 before checking the kanban column.
      await expect(readyCounter).toHaveText(String(initialCount - 1), { timeout: 10_000 });

      // Close the dialog
      await dialog.getByRole("button", { name: "Cancel" }).click();
      await expect(dialog).toBeHidden();

      // Card no longer on kanban board
      const board = page.getByLabel("Repairs kanban board");
      await expect(board.locator(".kanban-card").filter({ hasText: `#${repair.tracking_code}` })).toBeHidden();
    },
  );

  test(
    // regression: no way to undo picked_up after closing modal
    "Undo Pickup returns repair to completed and restores kanban card",
    async ({ page }) => {
      await e2eBehaviors("staff", "repairs · picked up · undo restores completed");
      const repairs = new StaffRepairsPage(page);
      const repair = await createIsolatedCompletedRepair(page, "undo pickup");

      await repairs.gotoRepairsSection();
      await repairs.expectRepairsKanbanVisible();
      await readReadyToPickupCount(page);

      // Mark as picked up first
      await openRepairCard(page, repair.tracking_code);
      const dialog = page.getByRole("dialog", { name: /AA 1234 BB/ });
      await expect(dialog).toBeVisible({ timeout: 15_000 });
      await dialog.getByRole("button", { name: "Mark as Picked Up" }).click();
      await expect(dialog.getByRole("button", { name: "Undo Pickup" })).toBeVisible({ timeout: 10_000 });

      // Undo
      await dialog.getByRole("button", { name: "Undo Pickup" }).click();

      // "Mark as Picked Up" must reappear
      await expect(dialog.getByRole("button", { name: "Mark as Picked Up" })).toBeVisible({ timeout: 10_000 });

      await dialog.getByRole("button", { name: "Cancel" }).click();
      await expect(dialog).toBeHidden();

      // Card is back in the Completed column
      const board = page.getByLabel("Repairs kanban board");
      const completedCol = board.locator(".kanban-col").filter({ hasText: "Completed" });
      await expect(
        completedCol.locator(".kanban-card").filter({ hasText: `#${repair.tracking_code}` }),
      ).toBeVisible({ timeout: 15_000 });
    },
  );

  test(
    // regression: picked_up card inaccessible after modal closed
    "Picked up repair is findable via search",
    async ({ page }) => {
      await e2eBehaviors("staff", "repairs · picked up · findable via search");
      const repairs = new StaffRepairsPage(page);
      const repair = await createIsolatedCompletedRepair(page, "search picked up");

      await repairs.gotoRepairsSection();
      await repairs.expectRepairsKanbanVisible();
      const readyCounter = readyToPickupCounter(page);
      const initialCount = await readReadyToPickupCount(page);

      // Mark as picked up and close
      await openRepairCard(page, repair.tracking_code);
      const dialog = page.getByRole("dialog", { name: /AA 1234 BB/ });
      await expect(dialog).toBeVisible({ timeout: 15_000 });
      await dialog.getByRole("button", { name: "Mark as Picked Up" }).click();
      await expect(dialog.getByRole("button", { name: "Undo Pickup" })).toBeVisible({ timeout: 10_000 });
      await expect(readyCounter).toHaveText(String(initialCount - 1), { timeout: 10_000 });
      await dialog.getByRole("button", { name: "Cancel" }).click();
      await expect(dialog).toBeHidden();

      // Search by tracking code — picked_up repairs are hidden from desktop kanban columns,
      // but remain searchable in the mobile repairs list data model.
      await page.setViewportSize({ width: 390, height: 844 });
      const searchInput = page.locator(".staff-mobile-taskbar .staff-mobile-search input");
      await searchInput.fill(repair.tracking_code);

      const mobileList = page.getByLabel("Mobile repairs list");
      const pickedUpCard = mobileList.locator(".repair-mobile-card").filter({
        hasText: repair.tracking_code,
      });
      await expect(pickedUpCard).toHaveCount(1);
      await expect(pickedUpCard).toContainText(repair.tracking_code);
    },
  );
});
