import { test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { AUTH_STATE_ADMIN, openAdminApp } from "./fixtures/auth";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";

test.use({ storageState: AUTH_STATE_ADMIN });

/** @desktop — только desktop-chrome (см. playwright.config.ts grepInvert для mobile). */
test.describe("admin dashboard (Docker stack) @desktop", () => {
  test("signs in as admin and opens Dashboard tabs", async ({ page }) => {
    await e2eBehaviors("admin", "dashboard · moneyflow, procurement, service_board");
    await openAdminApp(page);

    const dashboard = new AdminDashboardPage(page);
    await dashboard.expectOperationsDashboardVisible();

    await dashboard.openTab("ServiceBoard");
    await dashboard.expectServiceBoardTab();

    await dashboard.openTab("Warehouse");
    await dashboard.expectWarehouseSuppliersSummary();

    await dashboard.openTab("MoneyFlow");
    await dashboard.expectMoneyFlowTab();
  });
});
