import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { AUTH_STATE_ADMIN, openAdminApp, openStaffApp } from "./fixtures/auth";
import {
  E2E_DEMO_REPAIR_DIALOG_NAME,
  E2E_DEMO_REPAIR_KANBAN_SERVICES_SUMMARY,
  E2E_DEMO_REPAIR_SERVICE_NAME,
  E2E_DEMO_REPAIR_TRACKING_CODE,
} from "./e2e-seed";
import { StaffRepairsPage } from "./pages/StaffRepairsPage";

/**
 * Multi-line `repair_service_lines` for demo TOR-1001 (`scripts/demo/demo_data.sql`).
 * Staff: read-only Services line in modal when not assignee; Kanban shows compact "+N" summary.
 * Admin: full `RepairServiceLinesEditor` with "+ Add service".
 */
test.describe("Repair service lines — Kanban summary @desktop", () => {
  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
  });

  test("completed demo card shows multi-service summary (+N)", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · kanban · TOR-1001 multi-service summary");
    const repairs = new StaffRepairsPage(page);
    await repairs.gotoRepairsSection();
    await repairs.expectRepairsKanbanVisible();

    const card = await repairs.seededRepairKanbanCard();
    await expect(card).toContainText(E2E_DEMO_REPAIR_KANBAN_SERVICES_SUMMARY);
  });
});

test.describe("Repair service lines — modal editor @desktop", () => {
  test.use({ storageState: AUTH_STATE_ADMIN });

  test.beforeEach(async ({ page }) => {
    await openAdminApp(page);
    // Wait until admin shell + role are hydrated; otherwise `isAdmin` is false briefly and Services render read-only (no editor).
    await expect(page.getByRole("button", { name: "Users" })).toBeVisible({ timeout: 30_000 });
  });

  test("admin sees Services editor with seeded lines and Add service", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · modal · admin multi-line services editor");
    const repairs = new StaffRepairsPage(page);
    await repairs.gotoRepairsSection();
    await repairs.openSeededRepairCard();

    const dialog = page.getByRole("dialog", { name: E2E_DEMO_REPAIR_DIALOG_NAME });
    await expect(dialog).toBeVisible({ timeout: 20_000 });

    await expect(dialog.locator(".repair-service-lines-editor")).toBeVisible({ timeout: 15_000 });
    // Inputs use `list=` (datalist); Chromium exposes them as role `combobox`, not `textbox` — use aria-label via getByLabel.
    await expect(dialog.getByLabel(`Line 1: ${E2E_DEMO_REPAIR_SERVICE_NAME}`)).toHaveValue(
      E2E_DEMO_REPAIR_SERVICE_NAME,
      { timeout: 15_000 },
    );
    await expect(dialog.getByLabel("Line 2: Tire service")).toHaveValue("Tire service", { timeout: 15_000 });
    await expect(dialog.getByRole("button", { name: "+ Add service" })).toBeVisible({ timeout: 10_000 });
  });
});
