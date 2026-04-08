import { test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { AUTH_STATE_ADMIN, openAdminApp } from "./fixtures/auth";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";

test.use({ storageState: AUTH_STATE_ADMIN });

/**
 * Новые сценарии дашборда: попапы с формулами, склад (инвойсы + таблица поставщиков),
 * секция Masters на Service Board.
 *
 * @desktop — см. playwright.config.ts grepInvert для mobile.
 */
test.describe("admin dashboard analytics (Docker stack) @desktop", () => {
  test("MoneyFlow cards open formula popovers", async ({ page }) => {
    await e2eBehaviors("admin", "dashboard · moneyflow info popovers");
    await openAdminApp(page);

    const dashboard = new AdminDashboardPage(page);
    await dashboard.expectOperationsDashboardVisible();
    await dashboard.openTab("MoneyFlow");
    await dashboard.expectMoneyFlowLandmarks();

    const title = "Service sales (live)";
    await dashboard.openMetricInfoPopover(title);
    await dashboard.expectMetricInfoPopoverOpen(title);
    await dashboard.closeMetricInfoPopover(title);
  });

  test("Warehouse shows stock, invoices, supplier portfolio layout", async ({ page }) => {
    await e2eBehaviors("admin", "dashboard · warehouse structure");
    await openAdminApp(page);

    const dashboard = new AdminDashboardPage(page);
    await dashboard.expectOperationsDashboardVisible();
    await dashboard.openTab("Warehouse");
    await dashboard.expectWarehouseStructure();
    await dashboard.expectWarehouseSuppliersSummary();
    await dashboard.expectSupplierPortfolioTableOrEmpty();

    await dashboard.openMetricInfoPopover("On stock total");
    await dashboard.expectMetricInfoPopoverOpen("On stock total");
    await dashboard.closeMetricInfoPopover("On stock total");
  });

  test("Service Board shows Masters workload panels", async ({ page }) => {
    await e2eBehaviors("admin", "dashboard · service board masters");
    await openAdminApp(page);

    const dashboard = new AdminDashboardPage(page);
    await dashboard.expectOperationsDashboardVisible();
    await dashboard.openTab("ServiceBoard");
    await dashboard.expectServiceBoardTab();
    await dashboard.expectMastersSectionStructure();
  });
});
