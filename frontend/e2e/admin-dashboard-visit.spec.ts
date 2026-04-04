import { expect, test } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@autoservice.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "admin12345";

test.describe("admin dashboard (Docker stack)", () => {
  test("signs in as admin and opens Dashboard tabs", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByRole("heading", { name: "Operations Dashboard" })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole("tab", { name: "ServiceBoard" }).click();
    await expect(page.getByRole("heading", { name: "Operations Dashboard" })).toBeVisible();

    await page.getByRole("tab", { name: "Procurement" }).click();
    await expect(page.getByRole("heading", { name: "Top suppliers by spend" })).toBeVisible();

    await page.getByRole("tab", { name: "MoneyFlow" }).click();
    await expect(page.getByRole("heading", { name: "Operations Dashboard" })).toBeVisible();
  });
});
