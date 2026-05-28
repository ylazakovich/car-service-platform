import { expect, test } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { e2eBehaviors } from "./allure-helpers";
import { AUTH_STATE_ADMIN, openAdminApp } from "./fixtures/auth";
import { StaffNavigationPage } from "./pages/StaffNavigationPage";
import { StaffRecordsRegistryPage } from "./pages/StaffRecordsRegistryPage";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MULTIPAGE_INVOICE_PDF = path.resolve(
  __dirname,
  "../../docs/samples/sample-invoice-pl-03-multipage-simulated.pdf",
);

test.describe("Purchase invoice OCR import — multipage @desktop", () => {
  test.use({ storageState: AUTH_STATE_ADMIN });

  test.beforeEach(async ({ page }) => {
    await openAdminApp(page);
    await new StaffNavigationPage(page).waitForStaffNavigationChrome();
    await new StaffRecordsRegistryPage(page).gotoPurchasesSection();
    await page.getByRole("button", { name: "+ Add part line" }).click();
  });

  test("imports a 5-line multipage PDF into a warehouse invoice", async ({ page }) => {
    await e2eBehaviors("admin", "purchases · multipage invoice PDF OCR import");

    const dialog = page.getByRole("dialog", { name: "Warehouse purchase" });
    await expect(dialog).toBeVisible({ timeout: 15_000 });

    await dialog
      .locator("input[type='file'][accept*='.pdf']")
      .setInputFiles(MULTIPAGE_INVOICE_PDF);

    await expect(dialog.getByRole("status")).toHaveText("Filled 5 line(s). Invoice file linked.", {
      timeout: 30_000,
    });
    await expect(dialog.locator(".purchase-invoice-last-file")).toContainText(
      "sample-invoice-pl-03-multipage-simulated.pdf",
    );
    await expect(dialog.locator("input[placeholder='Supplier name']")).toHaveValue(/CENTRUM OLEJÓW/);

    const invoiceRows = dialog.locator(".purchase-invoice-line-card");
    await expect(invoiceRows).toHaveCount(5);
    await expect(invoiceRows.nth(0)).toContainText("Olej 5W-30 syntetyczny 1L (demo)");
    await expect(invoiceRows.nth(4)).toContainText("Akumulator 60Ah (demo)");

    await dialog.getByRole("button", { name: "Cancel" }).click();
  });
});
