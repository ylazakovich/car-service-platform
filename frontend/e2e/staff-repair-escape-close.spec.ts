import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { AUTH_STATE_ADMIN, openAdminApp } from "./fixtures/auth";
import { cleanupIsolatedRepair, createIsolatedRepair, type IsolatedRepairFixture } from "./fixtures/repairFactory";
import { StaffRepairsPage } from "./pages/StaffRepairsPage";

const ESCAPE_STATUSES: Array<NonNullable<Parameters<typeof createIsolatedRepair>[1]["status"]>> = [
  "new",
  "in_progress",
  "waiting_parts",
  "completed",
];

async function createEscapeTestRepair(
  page: import("@playwright/test").Page,
  status: NonNullable<Parameters<typeof createIsolatedRepair>[1]["status"]>,
): Promise<IsolatedRepairFixture> {
  const fixture = await createIsolatedRepair(page, {
    markerPrefix: "repair-escape-e2e",
    status,
    assignMaster: status === "in_progress" || status === "completed",
    serviceName: "Escape close isolation service",
    vehicleModel: "Escape Close",
  });
  await page.reload();
  return fixture;
}

test.describe("Staff repairs — modal Escape close @desktop", () => {
  test.describe.configure({ mode: "serial" });
  test.use({ storageState: AUTH_STATE_ADMIN });

  for (const status of ESCAPE_STATUSES) {
    test(`repair card dialog closes with Escape in ${status}`, async ({ page }) => {
      await e2eBehaviors("staff", `repairs · modal · Escape closes repair card (${status})`);

      await openAdminApp(page);
      const fixture = await createEscapeTestRepair(page, status);
      await openAdminApp(page);

      try {
        const repairs = new StaffRepairsPage(page);
        await repairs.gotoRepairsSection();
        await repairs.expectRepairsKanbanVisible();

        const card = await repairs.repairKanbanCardByTrackingCode(fixture.trackingCode);
        await card.click();

        const dialog = repairs.repairDialogByVehicleLabel(fixture.vehiclePlate, fixture.vehicleMake, fixture.vehicleModel);
        await expect(dialog).toBeVisible({ timeout: 15_000 });

        await page.keyboard.press("Escape");

        await expect(dialog).toBeHidden({ timeout: 15_000 });
        await expect(card).toBeVisible({ timeout: 15_000 });
      } finally {
        await cleanupIsolatedRepair(page, fixture);
      }
    });
  }
});
