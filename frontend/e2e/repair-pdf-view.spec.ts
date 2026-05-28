import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { E2E_DEMO_REPAIR_WITH_PDF_TRACKING_CODE } from "./e2e-seed";
import { openStaffApp } from "./fixtures/auth";
import { StaffMobileNavigationPage } from "./pages/StaffMobileNavigationPage";
import { StaffRepairsPage } from "./pages/StaffRepairsPage";

/**
 * Expects Docker Compose with seed_staff and demo repairs (`scripts/demo/demo_data.sql` in CI; locally load-demo).
 */
/** @desktop — POST /pdf/export на широком layout; узкий viewport — блок `@mobile-only` ниже. */
test.describe("Repair PDF: view without new export @desktop", () => {
  test.describe.configure({ mode: "serial" });
  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
  });

  test("two View PDF opens never call POST export when demo repair already has a PDF", async ({
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
    await repairs.openSeededRepairCard(E2E_DEMO_REPAIR_WITH_PDF_TRACKING_CODE);

    await repairs.openCertificateFromViewPdf();

    expect(exportPostUrls).toHaveLength(0);

    await repairs.closeCertificateDialog();

    await repairs.openCertificateFromViewPdf();

    expect(exportPostUrls).toHaveLength(0);
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
    await repairs.openSeededRepairCard(E2E_DEMO_REPAIR_WITH_PDF_TRACKING_CODE);

    await repairs.openCertificateFromViewPdf();

    const afterOpen = exportPostUrls.length;

    await repairs.exportNewVersionButton().click();
    await expect
      .poll(() => exportPostUrls.length, { timeout: 30_000 })
      .toBeGreaterThan(afterOpen);
  });
});

test.describe("Repair PDF: view without new export @mobile-only", () => {
  test.describe.configure({ mode: "serial" });
  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
    await new StaffMobileNavigationPage(page).expectMobileWorkspaceMenuToggle();
  });

  test("two View PDF opens never call POST export when demo repair already has a PDF", async ({
    page,
  }) => {
    await e2eBehaviors("staff", "repair · pdf · view idempotent (mobile)");
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
    await repairs.openSeededRepairCard(E2E_DEMO_REPAIR_WITH_PDF_TRACKING_CODE);

    await repairs.openCertificateFromViewPdf();

    expect(exportPostUrls).toHaveLength(0);

    await repairs.closeCertificateDialog();

    await repairs.openCertificateFromViewPdf();

    expect(exportPostUrls).toHaveLength(0);
  });

  test("Export new version triggers a second POST", async ({ page }) => {
    await e2eBehaviors("staff", "repair · pdf · export new version (mobile)");
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
    await repairs.openSeededRepairCard(E2E_DEMO_REPAIR_WITH_PDF_TRACKING_CODE);

    await repairs.openCertificateFromViewPdf();

    const afterOpen = exportPostUrls.length;

    await repairs.exportNewVersionButton().click();
    await expect
      .poll(() => exportPostUrls.length, { timeout: 30_000 })
      .toBeGreaterThan(afterOpen);
  });
});
