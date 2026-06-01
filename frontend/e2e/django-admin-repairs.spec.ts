import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { AUTH_STATE_ADMIN } from "./fixtures/auth";

test.use({ storageState: AUTH_STATE_ADMIN });

// regression: repairs models were not registered in Django admin
test.describe("Django admin — repairs registration @desktop", () => {
  test("Repairs link is visible in the admin sidebar", async ({ page }) => {
    await e2eBehaviors("admin", "django admin · repairs sidebar link");

    await page.goto("/admin/");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("#content-main")).toBeVisible();
    await expect(page.getByRole("link", { name: /repairs/i }).first()).toBeVisible();
  });

  test("Repairs changelist loads without error", async ({ page }) => {
    await e2eBehaviors("admin", "django admin · repairs changelist");

    await page.goto("/admin/repairs/repair/");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL("/admin/repairs/repair/");
    await expect(page.locator("#content")).toBeVisible();
  });

  test("RepairFinancialSnapshot changelist loads without error", async ({ page }) => {
    await e2eBehaviors("admin", "django admin · repairfinancialsnapshot changelist");

    await page.goto("/admin/repairs/repairfinancialsnapshot/");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL("/admin/repairs/repairfinancialsnapshot/");
    await expect(page.locator("#content")).toBeVisible();
  });

  test("InviteToken changelist loads without error", async ({ page }) => {
    await e2eBehaviors("admin", "django admin · invitetoken changelist");

    await page.goto("/admin/users/invitetoken/");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL("/admin/users/invitetoken/");
    await expect(page.locator("#content")).toBeVisible();
  });

  test("RepairServiceLine has no standalone admin changelist (inline-only)", async ({ page }) => {
    await e2eBehaviors("admin", "django admin · repairserviceline inline-only 404");

    await page.goto("/admin/repairs/repairserviceline/");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("h1")).toHaveText("Page not found");
  });

  test("RepairNote has no standalone admin changelist (inline-only)", async ({ page }) => {
    await e2eBehaviors("admin", "django admin · repairnote inline-only 404");

    await page.goto("/admin/repairs/repairnote/");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("h1")).toHaveText("Page not found");
  });

  test("RepairDocument has no standalone admin changelist (inline-only)", async ({ page }) => {
    await e2eBehaviors("admin", "django admin · repairdocument inline-only 404");

    await page.goto("/admin/repairs/repairdocument/");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("h1")).toHaveText("Page not found");
  });
});
