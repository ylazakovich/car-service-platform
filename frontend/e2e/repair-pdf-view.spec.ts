import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { openStaffApp } from "./fixtures/auth";
import { StaffRepairsPage } from "./pages/StaffRepairsPage";

/**
 * Expects Docker Compose with seed_staff and demo repairs (`scripts/demo/demo_data.sql` in CI; locally load-demo).
 */
/** @desktop — счётчики POST /pdf/export и модалка превью стабильны на широком layout; mobile-chrome см. staff-repairs-mobile. */
test.describe("Repair PDF: view without new export @desktop", () => {
  test.describe.configure({ mode: "serial" });
  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
  });

  test("two View PDF opens only call POST export once (first time) or zero times (if already exported)", async ({
    page,
  }) => {
    await e2eBehaviors("staff", "repair · pdf · view idempotent");
    const exportPostUrls: string[] = [];
    page.on("request", (req) => {
      if (
        req.method() === "POST" &&
        req.url().includes("/api/repairs/") &&
        req.url().includes("/pdf/export")
      ) {
        exportPostUrls.push(req.url());
      }
    });

    const repairs = new StaffRepairsPage(page);
    await repairs.gotoRepairsSection();
    await repairs.openSeededRepairCard();

    await repairs.openCertificateFromViewPdf();

    const exportCountAfterFirstOpen = exportPostUrls.length;

    await repairs.closeCertificateDialog();

    await repairs.openCertificateFromViewPdf();

    expect(exportPostUrls.length).toBe(exportCountAfterFirstOpen);
  });

  test("Export new version triggers a second POST", async ({ page }) => {
    await e2eBehaviors("staff", "repair · pdf · export new version");
    const exportPostUrls: string[] = [];
    page.on("request", (req) => {
      if (
        req.method() === "POST" &&
        req.url().includes("/api/repairs/") &&
        req.url().includes("/pdf/export")
      ) {
        exportPostUrls.push(req.url());
      }
    });

    const repairs = new StaffRepairsPage(page);
    await repairs.gotoRepairsSection();
    await repairs.openSeededRepairCard();

    await repairs.openCertificateFromViewPdf();

    const afterOpen = exportPostUrls.length;

    await repairs.exportNewVersionButton().click();
    await expect
      .poll(() => exportPostUrls.length, { timeout: 30_000 })
      .toBeGreaterThan(afterOpen);
  });
});
