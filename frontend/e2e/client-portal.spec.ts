import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";
import { openStaffApp } from "./fixtures/auth";
import { cleanupIsolatedRepair, createIsolatedRepair, type IsolatedRepairFixture } from "./fixtures/repairFactory";

function todayIsoDate() {
  return new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

async function getPortalToken(page: import("@playwright/test").Page, repairId: number): Promise<string> {
  return page.evaluate(async (id: number) => {
    const csrfToken = document.cookie
      .split(";")
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith("csrftoken="))
      ?.split("=")[1];
    const res = await fetch(`/api/repairs/${id}`, {
      credentials: "include",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
      },
    });
    if (!res.ok) {
      throw new Error(`GET /api/repairs/${id} failed: ${res.status}`);
    }
    const data = await res.json();
    return data.portal_token as string;
  }, repairId);
}

test.describe("Client portal — repair status page", () => {
  let fixture: IsolatedRepairFixture | null = null;
  let portalToken: string | null = null;

  test.afterEach(async ({ page }) => {
    if (fixture) {
      try {
        await cleanupIsolatedRepair(page, fixture);
      } finally {
        fixture = null;
        portalToken = null;
      }
    }
  });

  test("shows repair tracking header and vehicle info", async ({ page }) => {
    await e2eBehaviors("staff", "client portal · header and vehicle info");
    await openStaffApp(page);
    fixture = await createIsolatedRepair(page, {
      markerPrefix: "portal-header",
      status: "in_progress",
      vehicleMake: "Portal",
      vehicleModel: "Test",
      vehicleYear: 2023,
    });
    portalToken = await getPortalToken(page, fixture.repairId);

    await page.goto(`/portal/${portalToken}`);
    await page.waitForSelector(".portal-stepper");

    await expect(page.locator("text=REPAIR TRACKING")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your repair status" })).toBeVisible();
    await expect(page.locator("text=Portal Test")).toBeVisible();
    await expect(page.locator(".portal-plate")).toBeVisible();
  });

  test("stepper shows 3 steps with correct active step for in_progress", async ({ page }) => {
    await e2eBehaviors("staff", "client portal · stepper in_progress state");
    await openStaffApp(page);
    fixture = await createIsolatedRepair(page, {
      markerPrefix: "portal-stepper-ip",
      status: "in_progress",
    });
    portalToken = await getPortalToken(page, fixture.repairId);

    await page.goto(`/portal/${portalToken}`);
    await page.waitForSelector(".portal-stepper");

    const steps = page.locator(".portal-step");
    await expect(steps).toHaveCount(3);

    const step0 = steps.nth(0);
    const step1 = steps.nth(1);
    const step2 = steps.nth(2);

    await expect(step0).toHaveClass(/done/);
    await expect(step1).toHaveClass(/active/);
    await expect(step1).toHaveAttribute("aria-current", "step");
    await expect(step2).not.toHaveClass(/done/);
    await expect(step2).not.toHaveClass(/active/);

    await expect(step0.locator(".portal-step-sublabel")).toBeVisible();
    await expect(step1.locator(".portal-step-sublabel")).toBeVisible();
    await expect(step2.locator(".portal-step-sublabel")).toBeVisible();
  });

  test("stepper shows waiting chip for waiting_parts status", async ({ page }) => {
    // regression: waiting_parts chip not visible when repair stalls mid-progress
    await e2eBehaviors("staff", "client portal · stepper waiting_parts chip");
    await openStaffApp(page);
    fixture = await createIsolatedRepair(page, {
      markerPrefix: "portal-stepper-wp",
      status: "waiting_parts",
    });
    portalToken = await getPortalToken(page, fixture.repairId);

    await page.goto(`/portal/${portalToken}`);
    await page.waitForSelector(".portal-stepper");

    const steps = page.locator(".portal-step");
    const step1 = steps.nth(1);

    await expect(step1).toHaveClass(/active/);
    await expect(step1).not.toHaveClass(/done/);

    await expect(page.locator(".portal-wait-chip")).toBeVisible();
    await expect(page.locator(".portal-wait-chip")).toContainText("Waiting for parts");
  });

  test("stepper marks all steps done for completed status", async ({ page }) => {
    await e2eBehaviors("staff", "client portal · stepper completed state");
    await openStaffApp(page);
    fixture = await createIsolatedRepair(page, {
      markerPrefix: "portal-stepper-done",
      status: "completed",
      completedAt: todayIsoDate(),
      mileage: 50000,
    });
    portalToken = await getPortalToken(page, fixture.repairId);

    await page.goto(`/portal/${portalToken}`);
    await page.waitForSelector(".portal-stepper");

    const steps = page.locator(".portal-step");

    await expect(steps.nth(0)).toHaveClass(/done/);
    await expect(steps.nth(1)).toHaveClass(/done/);
    await expect(steps.nth(2)).toHaveClass(/active/);

    await expect(page.locator(".portal-wait-chip")).not.toBeVisible();
  });

  test("meta section shows services as list, reference and date", async ({ page }) => {
    await e2eBehaviors("staff", "client portal · meta section services and reference");
    await openStaffApp(page);
    fixture = await createIsolatedRepair(page, {
      markerPrefix: "portal-meta",
      status: "in_progress",
      serviceLines: [
        { name: "Portal E2E oil change", catalog_service_id: null, catalog_service_price: "80.00", sort_order: 0 },
        { name: "Portal E2E brake check", catalog_service_id: null, catalog_service_price: "40.00", sort_order: 1 },
      ],
    });
    portalToken = await getPortalToken(page, fixture.repairId);

    await page.goto(`/portal/${portalToken}`);
    await page.waitForSelector(".portal-stepper");

    const svcList = page.locator(".portal-svc-list");
    await expect(svcList).toBeVisible();
    await expect(svcList.locator("li").filter({ hasText: "Portal E2E oil change" })).toBeVisible();
    await expect(svcList.locator("li").filter({ hasText: "Portal E2E brake check" })).toBeVisible();

    await expect(page.locator(".portal-meta-k", { hasText: "Reference" })).toBeVisible();
    await expect(page.locator(".portal-meta-v.mono")).toBeVisible();
    await expect(page.locator(".portal-meta-v.mono")).toContainText(fixture.trackingCode);
  });

  test("footer shows updated timestamp", async ({ page }) => {
    await e2eBehaviors("staff", "client portal · footer updated timestamp");
    await openStaffApp(page);
    fixture = await createIsolatedRepair(page, {
      markerPrefix: "portal-footer",
      status: "new",
    });
    portalToken = await getPortalToken(page, fixture.repairId);

    await page.goto(`/portal/${portalToken}`);
    await page.waitForSelector(".portal-stepper");

    const updated = page.locator(".portal-updated");
    await expect(updated).toBeVisible();
    await expect(updated).toHaveText(/Updated .* ago|Updated just now/);
  });
});
