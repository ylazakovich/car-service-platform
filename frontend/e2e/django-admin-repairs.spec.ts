import { expect, test, type Page } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { AUTH_STATE_ADMIN } from "./fixtures/auth";
import { cleanupE2eData, createE2eCustomerWithVehicle } from "./fixtures/e2eDataFactory";

test.use({ storageState: AUTH_STATE_ADMIN });

async function adminRowForText(page: Page, text: string) {
  const row = page.locator("#result_list tbody tr").filter({ hasText: text }).first();
  await expect(row).toBeVisible({ timeout: 10_000 });
  return row;
}

async function captureAdminIdFromUrlOrRow(page: Page, urlPattern: RegExp, rowText: string): Promise<number | null> {
  const urlMatch = page.url().match(urlPattern);
  if (urlMatch !== null) {
    return parseInt(urlMatch[1], 10);
  }

  const row = await adminRowForText(page, rowText);
  const href = await row.locator("a[href*='/change/']").first().getAttribute("href");
  const idMatch = href?.match(/\/(\d+)\/change\//);
  return idMatch ? parseInt(idMatch[1], 10) : null;
}

// regression: repairs models were not registered in Django admin
test.describe("Django admin — repairs registration @desktop @django-admin", () => {
  test("Repairs link is visible in the admin sidebar", async ({ page }) => {
    await e2eBehaviors("admin", "django admin · repairs sidebar link");

    await page.goto("/admin/");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("#content")).toBeVisible();
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

    await expect(page.locator("h1")).toContainText("Page not found");
  });

  test("RepairNote has no standalone admin changelist (inline-only)", async ({ page }) => {
    await e2eBehaviors("admin", "django admin · repairnote inline-only 404");

    await page.goto("/admin/repairs/repairnote/");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("h1")).toContainText("Page not found");
  });

  test("RepairDocument has no standalone admin changelist (inline-only)", async ({ page }) => {
    await e2eBehaviors("admin", "django admin · repairdocument inline-only 404");

    await page.goto("/admin/repairs/repairdocument/");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("h1")).toContainText("Page not found");
  });
});

test.describe("Django admin — repairs CRUD @desktop @django-admin", () => {
  let vehicleId: number;
  let customerId: number;
  let createdRepairId: number | null = null;

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const fixture = await createE2eCustomerWithVehicle(page, "admin-crud");
    vehicleId = fixture.vehicleId;
    customerId = fixture.customerId;
  });

  test.afterEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    if (createdRepairId !== null) {
      await page.evaluate(async ({ repairId }) => {
        const token = document.cookie
          .split(";")
          .map((entry) => entry.trim())
          .find((entry) => entry.startsWith("csrftoken="))
          ?.split("=")[1];
        const headers: Record<string, string> = token ? { "X-CSRFToken": token } : {};
        const response = await fetch(`/api/repairs/${repairId}`, {
          method: "DELETE",
          credentials: "include",
          headers,
        });
        if (!response.ok && response.status !== 404) {
          throw new Error(`DELETE /api/repairs/${repairId} failed: ${response.status}`);
        }
      }, { repairId: createdRepairId });
      createdRepairId = null;
    }
    await cleanupE2eData(page, { vehicleIds: [vehicleId], customerIds: [customerId] });
  });

  test("Repair — create via Django admin add form", async ({ page }) => {
    await e2eBehaviors("admin", "django admin · repair · create");

    const serviceName = `E2E Admin Create ${Date.now()}`;

    await page.goto("/admin/repairs/repair/add/");
    await page.waitForLoadState("domcontentloaded");

    await page.locator("input#id_service_name").fill(serviceName);
    await page.locator("select#id_vehicle").selectOption({ value: String(vehicleId) });
    await page.locator("select#id_status").selectOption("new");
    await page.locator("[name='_continue']").click();

    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/admin\/repairs\/repair\//);

    createdRepairId = await captureAdminIdFromUrlOrRow(page, /\/admin\/repairs\/repair\/(\d+)\/change\//, serviceName);
    expect(createdRepairId).not.toBeNull();

    await expect(page.locator("#content")).toBeVisible();
  });

  test("Repair — read: service_name appears in changelist after creation", async ({ page }) => {
    await e2eBehaviors("admin", "django admin · repair · read");

    const serviceName = `E2E Admin Read ${Date.now()}`;

    await page.goto("/admin/repairs/repair/add/");
    await page.waitForLoadState("domcontentloaded");

    await page.locator("input#id_service_name").fill(serviceName);
    await page.locator("select#id_vehicle").selectOption({ value: String(vehicleId) });
    await page.locator("select#id_status").selectOption("new");
    await page.locator("[name='_continue']").click();

    await page.waitForLoadState("domcontentloaded");

    createdRepairId = await captureAdminIdFromUrlOrRow(page, /\/admin\/repairs\/repair\/(\d+)\/change\//, serviceName);
    expect(createdRepairId).not.toBeNull();

    await page.goto("/admin/repairs/repair/");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("#result_list").getByText(serviceName)).toBeVisible({ timeout: 10_000 });
  });

  test("Repair — update: change service_name and verify in changelist", async ({ page }) => {
    await e2eBehaviors("admin", "django admin · repair · update");

    const originalName = `E2E Admin Update Before ${Date.now()}`;
    const updatedName = `E2E Admin Update After ${Date.now()}`;

    await page.goto("/admin/repairs/repair/add/");
    await page.waitForLoadState("domcontentloaded");

    await page.locator("input#id_service_name").fill(originalName);
    await page.locator("select#id_vehicle").selectOption({ value: String(vehicleId) });
    await page.locator("select#id_status").selectOption("new");
    await page.locator("[name='_continue']").click();

    await page.waitForLoadState("domcontentloaded");

    const createMatch = page.url().match(/\/admin\/repairs\/repair\/(\d+)\/change\//);
    if (createMatch !== null) {
      createdRepairId = parseInt(createMatch[1], 10);
    } else {
      const row = await adminRowForText(page, originalName);
      await row.locator("a[href*='/change/']").first().click();
      await page.waitForLoadState("domcontentloaded");
      const editMatch = page.url().match(/\/admin\/repairs\/repair\/(\d+)\/change\//);
      if (editMatch !== null) {
        createdRepairId = parseInt(editMatch[1], 10);
      }
    }

    await page.locator("input#id_service_name").fill(updatedName);
    await page.locator("[name='_save']").click();

    await page.waitForLoadState("domcontentloaded");

    await page.goto("/admin/repairs/repair/");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("#result_list").getByText(updatedName)).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("#result_list").getByText(originalName)).toHaveCount(0);
  });

  test("Repair — delete via detail page delete button", async ({ page }) => {
    await e2eBehaviors("admin", "django admin · repair · delete");

    const serviceName = `E2E Admin Delete ${Date.now()}`;

    await page.goto("/admin/repairs/repair/add/");
    await page.waitForLoadState("domcontentloaded");

    await page.locator("input#id_service_name").fill(serviceName);
    await page.locator("select#id_vehicle").selectOption({ value: String(vehicleId) });
    await page.locator("select#id_status").selectOption("new");
    await page.locator("[name='_continue']").click();

    await page.waitForLoadState("domcontentloaded");

    const createMatch = page.url().match(/\/admin\/repairs\/repair\/(\d+)\/change\//);
    if (createMatch !== null) {
      createdRepairId = parseInt(createMatch[1], 10);
    } else {
      const row = await adminRowForText(page, serviceName);
      await row.locator("a[href*='/change/']").first().click();
      await page.waitForLoadState("domcontentloaded");
      const editMatch = page.url().match(/\/admin\/repairs\/repair\/(\d+)\/change\//);
      if (editMatch !== null) {
        createdRepairId = parseInt(editMatch[1], 10);
      }
    }

    if (createdRepairId === null) {
      throw new Error("Expected created repair id before deleting through Django admin");
    }
    await page.goto(`/admin/repairs/repair/${createdRepairId}/delete/`);
    await page.waitForLoadState("domcontentloaded");

    await page.getByRole("button", { name: "Yes, I’m sure" }).click();
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(/\/admin\/repairs\/repair\//);
    await expect(page.locator("#result_list").getByText(serviceName)).toHaveCount(0);

    createdRepairId = null;
  });

  test("RepairFinancialSnapshot add page loads without 500 error", async ({ page }) => {
    await e2eBehaviors("admin", "django admin · repairfinancialsnapshot · add page no 500");

    await page.goto("/admin/repairs/repairfinancialsnapshot/add/");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("h1")).not.toHaveText(/server error/i);
    await expect(page.locator("#content")).toBeVisible();
  });

  test("InviteToken changelist renders table structure or empty state", async ({ page }) => {
    await e2eBehaviors("admin", "django admin · invitetoken · changelist structure");

    await page.goto("/admin/users/invitetoken/");
    await page.waitForLoadState("domcontentloaded");

    const hasResultList = await page.locator("#result_list").count();
    const hasChangelistSearch = await page.locator("#changelist-search").count();
    const hasPaginator = await page.locator(".paginator").count();

    expect(hasResultList + hasChangelistSearch + hasPaginator).toBeGreaterThan(0);
  });

  test("InviteToken add link is present on changelist page", async ({ page }) => {
    await e2eBehaviors("admin", "django admin · invitetoken · add link present");

    await page.goto("/admin/users/invitetoken/");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("a[href*='/admin/users/invitetoken/add/']").first()).toBeVisible();
  });
});
