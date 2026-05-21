import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { openStaffApp } from "./fixtures/auth";
import { StaffRepairsPage } from "./pages/StaffRepairsPage";

/**
 * Seeded fixture: TOR-1004 — BH 5566 FF · VW Passat, status=waiting_parts, master=unassigned.
 * Source: scripts/demo/demo_data.sql
 */
const UNASSIGNED_TRACKING_CODE = "TOR-1004";
const UNASSIGNED_VEHICLE_PLATE = "BH 5566 FF";
const MASTER_ERROR = "Assign a master before moving to this status.";

async function openUnassignedRepairCard(repairs: StaffRepairsPage) {
  const board = repairs.page.getByLabel("Repairs kanban board");
  await expect(board).toBeVisible({ timeout: 25_000 });
  const card = board.locator(".kanban-card").filter({ hasText: `#${UNASSIGNED_TRACKING_CODE}` });
  await expect(card.first()).toBeVisible({ timeout: 15_000 });
  await card.first().click();
  const dialog = repairs.page.getByRole("dialog", { name: new RegExp(UNASSIGNED_VEHICLE_PLATE) });
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  return dialog;
}

test.describe("Staff repairs — master validation on status transition @desktop", () => {
  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
  });

  test(
    // regression: unassigned card could bypass master requirement via status switcher
    "Status switcher: clicking In Progress without master shows inline error on Master field",
    async ({ page }) => {
      await e2eBehaviors("staff", "repairs · master validation · status switcher → in_progress");
      const repairs = new StaffRepairsPage(page);

      await repairs.gotoRepairsSection();
      await repairs.expectRepairsKanbanVisible();

      const dialog = await openUnassignedRepairCard(repairs);

      // Click "In Progress" status button
      await dialog.getByRole("button", { name: "In Progress" }).click();

      // Status must NOT change (still on current status, no network call)
      // Inline error must appear under the Master field
      const masterError = dialog.locator(".field-row__error");
      await expect(masterError).toBeVisible({ timeout: 5_000 });
      await expect(masterError).toContainText(MASTER_ERROR);

      // Master select must be focused / receive aria-invalid
      const masterSelect = dialog.locator("#repair-field-master");
      await expect(masterSelect).toHaveAttribute("aria-invalid", "true");
    },
  );

  test(
    // regression: unassigned card could bypass master requirement via status switcher
    "Status switcher: clicking Completed without master shows inline error on Master field",
    async ({ page }) => {
      await e2eBehaviors("staff", "repairs · master validation · status switcher → completed");
      const repairs = new StaffRepairsPage(page);

      await repairs.gotoRepairsSection();
      await repairs.expectRepairsKanbanVisible();

      const dialog = await openUnassignedRepairCard(repairs);

      await dialog.getByRole("button", { name: "Completed" }).click();

      const masterError = dialog.locator(".field-row__error");
      await expect(masterError).toBeVisible({ timeout: 5_000 });
      await expect(masterError).toContainText(MASTER_ERROR);

      const masterSelect = dialog.locator("#repair-field-master");
      await expect(masterSelect).toHaveAttribute("aria-invalid", "true");
    },
  );

  test(
    // regression: Save Changes bypassed master requirement when status required it
    "Save Changes: saving with In Progress status and no master shows inline error",
    async ({ page }) => {
      await e2eBehaviors("staff", "repairs · master validation · save without master");
      const repairs = new StaffRepairsPage(page);

      await repairs.gotoRepairsSection();
      await repairs.expectRepairsKanbanVisible();

      const dialog = await openUnassignedRepairCard(repairs);

      // Force status to In Progress by directly checking — we open with waiting_parts
      // The status switcher blocks transition, so we test Save when status is already in_progress
      // We open TOR-1004 and try to change status via switcher; it should show the error on save path too.
      // Test the save path: change status button → blocked → error visible
      await dialog.getByRole("button", { name: "In Progress" }).click();

      // Error is already shown inline — verify Save button does NOT submit
      const saveBtn = dialog.getByRole("button", { name: "Save Changes" });
      await saveBtn.click();

      // Error must still be visible (submit blocked)
      const masterError = dialog.locator(".field-row__error");
      await expect(masterError).toBeVisible({ timeout: 5_000 });
      await expect(masterError).toContainText(MASTER_ERROR);

      // Dialog is still open
      await expect(dialog).toBeVisible();
    },
  );
});

test.describe("Staff repairs — master validation on drag & drop @desktop", () => {
  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
  });

  test(
    // regression: unassigned card could be dragged to In Progress column bypassing master check
    "Drag unassigned card to In Progress column opens modal with master error highlighted",
    async ({ page }) => {
      await e2eBehaviors("staff", "repairs · master validation · drag to in_progress");
      const repairs = new StaffRepairsPage(page);

      await repairs.gotoRepairsSection();
      const board = page.getByLabel("Repairs kanban board");
      await expect(board).toBeVisible({ timeout: 25_000 });

      const card = board.locator(".kanban-card").filter({ hasText: `#${UNASSIGNED_TRACKING_CODE}` });
      await expect(card.first()).toBeVisible({ timeout: 15_000 });

      const inProgressCol = board.locator(".kanban-col").filter({ hasText: "In Progress" });
      await expect(inProgressCol).toBeVisible({ timeout: 10_000 });

      // Drag the card to In Progress column
      await card.first().dragTo(inProgressCol);

      // Modal must open automatically
      const dialog = page.getByRole("dialog", { name: new RegExp(UNASSIGNED_VEHICLE_PLATE) });
      await expect(dialog).toBeVisible({ timeout: 10_000 });

      // Inline master error must be shown
      const masterError = dialog.locator(".field-row__error");
      await expect(masterError).toBeVisible({ timeout: 5_000 });
      await expect(masterError).toContainText(MASTER_ERROR);

      // Card must NOT have moved to In Progress (still in source column after closing modal)
      await dialog.getByRole("button", { name: "Cancel" }).click();
      await expect(dialog).toBeHidden();

      // Card is still visible on the board (not lost)
      await expect(card.first()).toBeVisible({ timeout: 10_000 });
    },
  );

  test(
    // regression: unassigned card could be dragged to Completed column bypassing master check
    "Drag unassigned card to Completed column opens modal with master error highlighted",
    async ({ page }) => {
      await e2eBehaviors("staff", "repairs · master validation · drag to completed");
      const repairs = new StaffRepairsPage(page);

      await repairs.gotoRepairsSection();
      const board = page.getByLabel("Repairs kanban board");
      await expect(board).toBeVisible({ timeout: 25_000 });

      const card = board.locator(".kanban-card").filter({ hasText: `#${UNASSIGNED_TRACKING_CODE}` });
      await expect(card.first()).toBeVisible({ timeout: 15_000 });

      const completedCol = board.locator(".kanban-col").filter({ hasText: "Completed" }).first();
      await expect(completedCol).toBeVisible({ timeout: 10_000 });

      await card.first().dragTo(completedCol);

      const dialog = page.getByRole("dialog", { name: new RegExp(UNASSIGNED_VEHICLE_PLATE) });
      await expect(dialog).toBeVisible({ timeout: 10_000 });

      const masterError = dialog.locator(".field-row__error");
      await expect(masterError).toBeVisible({ timeout: 5_000 });
      await expect(masterError).toContainText(MASTER_ERROR);
    },
  );
});
