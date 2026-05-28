import { expect, test } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { e2eBehaviors } from "./allure-helpers";
import { AUTH_STATE_ADMIN, openAdminApp } from "./fixtures/auth";
import { StaffNavigationPage } from "./pages/StaffNavigationPage";
import { StaffRecordsRegistryPage } from "./pages/StaffRecordsRegistryPage";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SINGLE_LINE_INVOICE_PDF = path.resolve(
  __dirname,
  "../../docs/samples/sample-invoice-pl-single-line.pdf",
);

const BLOCK_LAYOUT_INVOICE_TXT = path.resolve(
  __dirname,
  "../../docs/samples/sample-invoice-pl-02-block-lines.txt",
);

test.describe("Purchase invoice OCR import — failure cases @desktop", () => {
  test.use({ storageState: AUTH_STATE_ADMIN });

  test.beforeEach(async ({ page }) => {
    await openAdminApp(page);
    await new StaffNavigationPage(page).waitForStaffNavigationChrome();
    await new StaffRecordsRegistryPage(page).gotoPurchasesSection();
    await page.getByRole("button", { name: "+ Add part line" }).click();
  });

  test("shows error when PDF cannot be parsed (no matching pattern)", async ({ page }) => {
    await e2eBehaviors("admin", "purchases · invoice PDF OCR failure · no pattern match");

    const dialog = page.getByRole("dialog", { name: "Warehouse purchase" });
    await expect(dialog).toBeVisible({ timeout: 15_000 });

    await dialog
      .locator("input[type='file'][accept*='.pdf']")
      .setInputFiles(SINGLE_LINE_INVOICE_PDF);

    await expect(dialog.locator(".purchase-invoice-import-block .form-error")).toBeVisible({
      timeout: 20_000,
    });
    await expect(dialog.locator(".purchase-invoice-line-card")).toHaveCount(1);
    await expect(dialog.getByRole("status")).not.toBeVisible();

    await dialog.getByRole("button", { name: "Cancel" }).click();
  });

  test("shows error for unsupported block-layout invoice format", async ({ page }) => {
    await e2eBehaviors("admin", "purchases · invoice PDF OCR failure · block layout");

    const dialog = page.getByRole("dialog", { name: "Warehouse purchase" });
    await expect(dialog).toBeVisible({ timeout: 15_000 });

    await dialog
      .locator("input[type='file'][accept*='.pdf']")
      .setInputFiles(BLOCK_LAYOUT_INVOICE_TXT);

    await expect(dialog.locator(".purchase-invoice-import-block .form-error")).toBeVisible({
      timeout: 20_000,
    });
    await expect(dialog.locator(".purchase-invoice-line-card")).toHaveCount(1);
    await expect(dialog.getByRole("status")).not.toBeVisible();

    await dialog.getByRole("button", { name: "Cancel" }).click();
  });
});
