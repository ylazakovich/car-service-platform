import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { openStaffApp } from "./fixtures/auth";
import { StaffRepairsPage } from "./pages/StaffRepairsPage";

function uniqueIssueMarker(): string {
  return `e2e-intake-${Date.now()}`;
}

test.describe("Staff repair intake — create kanban card @desktop", () => {
  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
  });

  test("desktop: New Repair → intake → card on board", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · intake · create card (desktop)");
    const repairs = new StaffRepairsPage(page);

    await repairs.gotoRepairsSection();
    await repairs.expectRepairsKanbanVisible();

    await repairs.openNewRepairIntakeModal();
    const marker = uniqueIssueMarker();
    await repairs.fillCreateRepairForm(marker);
    await repairs.submitCreateRepair();

    await expect(page.getByRole("dialog").filter({ hasText: "Repair Intake" })).toBeHidden({
      timeout: 25_000,
    });
    await repairs.expectKanbanCardShowsIssueNotes(marker);
  });
});

test.describe("Staff repair intake — create kanban card @mobile-only", () => {
  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
  });

  test("mobile: New Repair → intake → card on board", async ({ page }) => {
    await e2eBehaviors("staff", "repairs · intake · create card (mobile)");
    const repairs = new StaffRepairsPage(page);

    await expect(repairs.staffMobileWorkspaceMenuToggle()).toBeVisible({ timeout: 20_000 });

    await repairs.gotoRepairsSection();
    await repairs.expectRepairsKanbanVisible();

    await repairs.openNewRepairIntakeModal();
    const marker = uniqueIssueMarker();
    await repairs.fillCreateRepairForm(marker);
    await repairs.submitCreateRepair();

    await expect(page.getByRole("dialog").filter({ hasText: "Repair Intake" })).toBeHidden({
      timeout: 25_000,
    });
    await repairs.expectKanbanCardShowsIssueNotes(marker);
  });
});
