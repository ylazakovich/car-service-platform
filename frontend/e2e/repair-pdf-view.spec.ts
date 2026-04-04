import { test, expect } from "@playwright/test";

/**
 * Expects Docker Compose with seeded staff user (see backend seed_staff) and at least one completed repair on the board.
 */
test.describe("Repair PDF: view without new export", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("textbox", { name: "Email" }).fill("staff@autoservice.local");
    await page.getByRole("textbox", { name: "Password" }).fill("demo-staff-change-me");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/app/);
  });

  test("two View PDF opens only call POST export once (first time) or zero times (if already exported)", async ({
    page,
  }) => {
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

    await page.getByRole("button", { name: "Repairs" }).click();

    const repairCard = page.getByRole("heading", { name: /DEMO-|TOR-/ }).first();
    await expect(repairCard).toBeVisible({ timeout: 25_000 });
    await repairCard.click();

    await page.getByRole("button", { name: "View PDF" }).click();
    await expect(page.getByRole("dialog", { name: "Certificate of Completion" })).toBeVisible({
      timeout: 30_000,
    });

    const exportCountAfterFirstOpen = exportPostUrls.length;

    await page
      .getByRole("dialog", { name: "Certificate of Completion" })
      .getByRole("button", { name: "Close" })
      .click();
    await expect(page.getByRole("dialog", { name: "Certificate of Completion" })).toBeHidden();

    await page.getByRole("button", { name: "View PDF" }).click();
    await expect(page.getByRole("dialog", { name: "Certificate of Completion" })).toBeVisible({
      timeout: 30_000,
    });

    expect(exportPostUrls.length).toBe(exportCountAfterFirstOpen);
  });

  test("Export new version triggers a second POST", async ({ page }) => {
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

    await page.getByRole("button", { name: "Repairs" }).click();
    await page.getByRole("heading", { name: /DEMO-|TOR-/ }).first().click();

    await page.getByRole("button", { name: "View PDF" }).click();
    await expect(page.getByRole("dialog", { name: "Certificate of Completion" })).toBeVisible({
      timeout: 30_000,
    });

    const afterOpen = exportPostUrls.length;

    await page.getByRole("button", { name: "Export new version" }).click();
    await expect
      .poll(() => exportPostUrls.length, { timeout: 30_000 })
      .toBeGreaterThan(afterOpen);
  });
});
