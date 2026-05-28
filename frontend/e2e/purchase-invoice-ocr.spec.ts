import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { e2eBehaviors } from "./allure-helpers";
import { AUTH_STATE_ADMIN, openAdminApp } from "./fixtures/auth";
import { cleanupE2eData } from "./fixtures/e2eDataFactory";
import { StaffNavigationPage } from "./pages/StaffNavigationPage";
import { StaffRecordsRegistryPage } from "./pages/StaffRecordsRegistryPage";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SAMPLE_INVOICE_PDF = path.resolve(
  __dirname,
  "../../docs/samples/sample-invoice-pl-01-demo.pdf",
);

async function cleanupSupplier(page: Page, supplierId: number | undefined): Promise<void> {
  if (!supplierId) return;
  await page.evaluate(async ({ supplierIdValue }) => {
    const token = document.cookie
      .split(";")
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith("csrftoken="))
      ?.split("=")[1];
    const response = await fetch(`/api/purchases/suppliers/${supplierIdValue}`, {
      method: "DELETE",
      credentials: "include",
      headers: token ? { "X-CSRFToken": token } : undefined,
    });
    if (!response.ok && response.status !== 404) {
      throw new Error(`DELETE supplier failed: ${response.status} ${await response.text()}`);
    }
  }, { supplierIdValue: supplierId });
}

test.describe("Purchase invoice OCR import @desktop", () => {
  test.use({ storageState: AUTH_STATE_ADMIN });

  test.beforeEach(async ({ page }) => {
    await openAdminApp(page);
    await new StaffNavigationPage(page).waitForStaffNavigationChrome();
  });

  test("imports the sample PDF into a multi-line warehouse invoice", async ({ page }) => {
    await e2eBehaviors("admin", "purchases · invoice PDF OCR import");

    const createdPurchaseIds: number[] = [];
    let createdSupplierId: number | undefined;

    try {
      const reg = new StaffRecordsRegistryPage(page);
      await reg.gotoPurchasesSection();
      await page.getByRole("button", { name: "+ Add part line" }).click();

      const dialog = page.getByRole("dialog", { name: "Warehouse purchase" });
      await expect(dialog).toBeVisible({ timeout: 15_000 });

      await dialog
        .locator("input[type='file'][accept*='.pdf']")
        .setInputFiles(SAMPLE_INVOICE_PDF);

      await expect(dialog.getByRole("status")).toHaveText("Filled 3 line(s). Invoice file linked.", {
        timeout: 30_000,
      });
      await expect(dialog.locator(".purchase-invoice-last-file")).toContainText("sample-invoice-pl-01-demo.pdf");
      await expect(dialog.locator("input[placeholder='Supplier name']")).toHaveValue(/AUTO-CZĘŚCI WZÓR/);

      const invoiceRows = dialog.locator(".purchase-invoice-line-card");
      await expect(invoiceRows).toHaveCount(3);
      await expect(invoiceRows.nth(0)).toContainText("Łożysko koła przód SKF");
      await expect(invoiceRows.nth(0)).toContainText("Qty 2");
      await expect(invoiceRows.nth(0)).toContainText("pcs");
      await expect(invoiceRows.nth(1)).toContainText("Zestaw paska rozrządu Gates");
      await expect(invoiceRows.nth(1)).toContainText("set");
      await expect(invoiceRows.nth(2)).toContainText("Filtr powietrza Mann");

      const saveResponsePromise = page.waitForResponse(
        (response) => response.url().includes("/api/purchases/bulk/") && response.request().method() === "POST",
      );
      await dialog.getByRole("button", { name: "Save invoice (3 lines)" }).click();
      const saveResponse = await saveResponsePromise;
      expect(saveResponse.ok()).toBeTruthy();
      const saved = (await saveResponse.json()) as Array<{ id: number; supplier?: { id?: number }; part_name: string }>;
      expect(Array.isArray(saved)).toBeTruthy();
      expect(saved).toHaveLength(3);
      expect(saved.every((row) => Number.isInteger(row.id))).toBeTruthy();
      createdPurchaseIds.push(...saved.map((row) => row.id));
      createdSupplierId = saved.find((row) => Number.isInteger(row.supplier?.id))?.supplier?.id;

      await expect(dialog).toHaveCount(0, { timeout: 15_000 });
      await expect(reg.purchaseRowByPartSnippet("Łożysko koła przód SKF")).toBeVisible({ timeout: 20_000 });
      await expect(reg.purchaseRowByPartSnippet("Zestaw paska rozrządu Gates")).toBeVisible({ timeout: 20_000 });
      await expect(reg.purchaseRowByPartSnippet("Filtr powietrza Mann")).toBeVisible({ timeout: 20_000 });
    } finally {
      await cleanupE2eData(page, { purchaseIds: createdPurchaseIds });
      await cleanupSupplier(page, createdSupplierId);
    }
  });
});
