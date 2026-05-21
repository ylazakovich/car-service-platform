import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import {
  E2E_DEMO_REPAIR_TRACKING_CODE,
  E2E_DEMO_REPAIR_VEHICLE_PLATE,
} from "./e2e-seed";
import { openStaffApp } from "./fixtures/auth";
import { StaffRepairsPage } from "./pages/StaffRepairsPage";

test.describe("Staff repairs — kanban card fields @desktop", () => {
  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
  });

  test("TOR-1001 kanban card shows vehicle plate", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · kanban card · vehicle plate (desktop)");
    const repairs = new StaffRepairsPage(page);

    await repairs.gotoRepairsSection();
    await repairs.expectRepairsKanbanVisible();

    const card = await repairs.seededRepairKanbanCard();
    const plate = repairs.cardPlate(card);

    await expect(plate).toBeVisible();
    await expect(plate).toContainText(E2E_DEMO_REPAIR_VEHICLE_PLATE);
  });

  test("TOR-1001 kanban card shows vehicle model line", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · kanban card · vehicle model (desktop)");
    const repairs = new StaffRepairsPage(page);

    await repairs.gotoRepairsSection();
    await repairs.expectRepairsKanbanVisible();

    const card = await repairs.seededRepairKanbanCard();
    const modelLine = repairs.cardModel(card);

    await expect(modelLine).toBeVisible();
    await expect(modelLine).toContainText("Camry");
  });

  test("in-progress kanban card shows started_at time element", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · kanban card · started_at time element (desktop)");
    const repairs = new StaffRepairsPage(page);

    await repairs.gotoRepairsSection();
    await repairs.expectRepairsKanbanVisible();

    const board = page.getByLabel("Repairs kanban board");
    await expect(board).toBeVisible({ timeout: 25_000 });

    const inProgressCol = board.locator(".kanban-col").filter({ hasText: "In Progress" });
    await expect(inProgressCol).toBeVisible({ timeout: 15_000 });

    const cardWithTime = inProgressCol.locator(".kanban-card").filter({
      has: page.locator("time.kanban-card-time"),
    });

    await expect(cardWithTime.first()).toBeVisible({ timeout: 15_000 });
    await expect(repairs.cardTime(cardWithTime.first())).toBeVisible();
  });

  test("TOR-1001 kanban card tracking code is visible", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · kanban card · tracking code (desktop)");
    const repairs = new StaffRepairsPage(page);

    await repairs.gotoRepairsSection();
    await repairs.expectRepairsKanbanVisible();

    const card = await repairs.seededRepairKanbanCard();

    await expect(card).toContainText(`#${E2E_DEMO_REPAIR_TRACKING_CODE}`);
  });
});
