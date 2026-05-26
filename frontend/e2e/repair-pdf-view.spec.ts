import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { openStaffApp } from "./fixtures/auth";
import { cleanupIsolatedRepair, createIsolatedRepair, type IsolatedRepairFixture } from "./fixtures/repairFactory";
import { StaffMobileNavigationPage } from "./pages/StaffMobileNavigationPage";
import { StaffRepairsPage } from "./pages/StaffRepairsPage";

/** @desktop — POST /pdf/export на широком layout; узкий viewport — блок `@mobile-only` ниже. */
test.describe("Repair PDF: view without new export @desktop", () => {
  test.describe.configure({ mode: "serial" });
  let fixture: IsolatedRepairFixture;

  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
    fixture = await createIsolatedRepair(page, {
      markerPrefix: "pdf-e2e",
      status: "completed",
      assignMaster: true,
      serviceName: "PDF export isolation service",
    });
    await page.reload();
    await openStaffApp(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupIsolatedRepair(page, fixture);
  });

  test("two View PDF opens only call POST export once (first time) or zero times (if already exported)", async ({ page }) => {
    await e2eBehaviors("staff", "repair · pdf · view idempotent");
    const exportPostUrls: string[] = [];
    page.on("request", (req) => {
      if (req.method() === "POST" && req.url().includes("/api/repairs/") && req.url().includes("/pdf/export")) {
        exportPostUrls.push(req.url());
      }
    });

    const repairs = new StaffRepairsPage(page);
    await repairs.gotoRepairsSection();
    await repairs.openRepairCardByTrackingCode(fixture.trackingCode);

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
      if (req.method() === "POST" && req.url().includes("/api/repairs/") && req.url().includes("/pdf/export")) {
        exportPostUrls.push(req.url());
      }
    });

    const repairs = new StaffRepairsPage(page);
    await repairs.gotoRepairsSection();
    await repairs.openRepairCardByTrackingCode(fixture.trackingCode);

    await repairs.openCertificateFromViewPdf();
    const afterOpen = exportPostUrls.length;
    await repairs.exportNewVersionButton().click();
    await expect.poll(() => exportPostUrls.length, { timeout: 30_000 }).toBeGreaterThan(afterOpen);
  });
});

test.describe("Repair PDF: view without new export @mobile-only", () => {
  test.describe.configure({ mode: "serial" });
  let fixture: IsolatedRepairFixture;

  test.beforeEach(async ({ page }) => {
    await openStaffApp(page);
    await new StaffMobileNavigationPage(page).expectMobileWorkspaceMenuToggle();
    fixture = await createIsolatedRepair(page, {
      markerPrefix: "pdf-mobile-e2e",
      status: "completed",
      assignMaster: true,
      serviceName: "PDF mobile export isolation service",
    });
    await page.reload();
    await openStaffApp(page);
    await new StaffMobileNavigationPage(page).expectMobileWorkspaceMenuToggle();
  });

  test.afterEach(async ({ page }) => {
    await cleanupIsolatedRepair(page, fixture);
  });

  test("two View PDF opens only call POST export once (first time) or zero times (if already exported)", async ({ page }) => {
    await e2eBehaviors("staff", "repair · pdf · view idempotent (mobile)");
    const exportPostUrls: string[] = [];
    page.on("request", (req) => {
      if (req.method() === "POST" && req.url().includes("/api/repairs/") && req.url().includes("/pdf/export")) {
        exportPostUrls.push(req.url());
      }
    });

    const repairs = new StaffRepairsPage(page);
    await repairs.gotoRepairsSection();
    await repairs.openRepairCardByTrackingCode(fixture.trackingCode);

    await repairs.openCertificateFromViewPdf();
    const exportCountAfterFirstOpen = exportPostUrls.length;
    await repairs.closeCertificateDialog();
    await repairs.openCertificateFromViewPdf();

    expect(exportPostUrls.length).toBe(exportCountAfterFirstOpen);
  });

  test("Export new version triggers a second POST", async ({ page }) => {
    await e2eBehaviors("staff", "repair · pdf · export new version (mobile)");
    const exportPostUrls: string[] = [];
    page.on("request", (req) => {
      if (req.method() === "POST" && req.url().includes("/api/repairs/") && req.url().includes("/pdf/export")) {
        exportPostUrls.push(req.url());
      }
    });

    const repairs = new StaffRepairsPage(page);
    await repairs.gotoRepairsSection();
    await repairs.openRepairCardByTrackingCode(fixture.trackingCode);

    await repairs.openCertificateFromViewPdf();
    const afterOpen = exportPostUrls.length;
    await repairs.exportNewVersionButton().click();
    await expect.poll(() => exportPostUrls.length, { timeout: 30_000 }).toBeGreaterThan(afterOpen);
  });
});
