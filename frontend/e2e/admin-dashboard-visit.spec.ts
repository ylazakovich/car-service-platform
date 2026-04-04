import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@autoservice.local";
/** Как `ADMIN_PASSWORD` в docker-compose / `.env.example` (см. pr.yml E2E_ADMIN_PASSWORD). */
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "change-me-in-production";

/** @desktop — только desktop-chrome (см. playwright.config.ts grepInvert для mobile). */
test.describe("admin dashboard (Docker stack) @desktop", () => {
  test("signs in as admin and opens Dashboard tabs", async ({ page }) => {
    await e2eBehaviors("admin", "dashboard · moneyflow, procurement, service_board");
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
