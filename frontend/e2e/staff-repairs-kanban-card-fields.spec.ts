import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { cleanupIsolatedRepair, createIsolatedRepair } from "./fixtures/repairFactory";
import { openStaffApp } from "./fixtures/auth";
import { StaffRepairsPage } from "./pages/StaffRepairsPage";

test.describe("Staff repairs — kanban card fields @desktop", () => {
  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
  });

  test("kanban card shows vehicle plate", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · kanban card · vehicle plate (desktop)");
    const fixture = await createIsolatedRepair(page, {
      markerPrefix: "kanban-fields-e2e",
      status: "completed",
      assignMaster: true,
      vehicleMake: "Toyota",
      vehicleModel: "Camry",
      serviceName: "Kanban field service",
    });
    try {
      await openStaffApp(page);
      const repairs = new StaffRepairsPage(page);
      await repairs.gotoRepairsSection();
      await repairs.expectRepairsKanbanVisible();

      const card = await repairs.repairKanbanCardByTrackingCode(fixture.trackingCode);
      const plate = repairs.cardPlate(card);

      await expect(plate).toBeVisible();
      await expect(plate).toContainText(fixture.vehiclePlate);
    } finally {
      await cleanupIsolatedRepair(page, fixture);
    }
  });

  test("kanban card shows vehicle model line", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · kanban card · vehicle model (desktop)");
    const fixture = await createIsolatedRepair(page, {
      markerPrefix: "kanban-fields-e2e",
      status: "completed",
      assignMaster: true,
      vehicleMake: "Toyota",
      vehicleModel: "Camry",
      serviceName: "Kanban model service",
    });
    try {
      await openStaffApp(page);
      const repairs = new StaffRepairsPage(page);
      await repairs.gotoRepairsSection();
      await repairs.expectRepairsKanbanVisible();

      const card = await repairs.repairKanbanCardByTrackingCode(fixture.trackingCode);
      const modelLine = repairs.cardModel(card);

      await expect(modelLine).toBeVisible();
      await expect(modelLine).toContainText("Camry");
    } finally {
      await cleanupIsolatedRepair(page, fixture);
    }
  });

  test("in-progress kanban card shows started_at time element", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · kanban card · started_at time element (desktop)");
    const fixture = await createIsolatedRepair(page, {
      markerPrefix: "kanban-fields-e2e",
      status: "in_progress",
      assignMaster: true,
      serviceName: "Kanban started service",
    });
    try {
      await openStaffApp(page);
      const repairs = new StaffRepairsPage(page);
      await repairs.gotoRepairsSection();
      await repairs.expectRepairsKanbanVisible();

      const card = await repairs.repairKanbanCardByTrackingCode(fixture.trackingCode);
      await expect(repairs.cardTime(card)).toBeVisible({ timeout: 15_000 });
    } finally {
      await cleanupIsolatedRepair(page, fixture);
    }
  });

  test("kanban card tracking code is visible", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · kanban card · tracking code (desktop)");
    const fixture = await createIsolatedRepair(page, {
      markerPrefix: "kanban-fields-e2e",
      status: "completed",
      assignMaster: true,
      serviceName: "Kanban tracking service",
    });
    try {
      await openStaffApp(page);
      const repairs = new StaffRepairsPage(page);
      await repairs.gotoRepairsSection();
      await repairs.expectRepairsKanbanVisible();

      const card = await repairs.repairKanbanCardByTrackingCode(fixture.trackingCode);

      await expect(card).toContainText(`#${fixture.trackingCode}`);
    } finally {
      await cleanupIsolatedRepair(page, fixture);
    }
  });
});
