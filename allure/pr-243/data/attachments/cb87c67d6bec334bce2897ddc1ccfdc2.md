# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: staff-registers.spec.ts >> Registers workspace @desktop >> admin switches to Customers and sees test-owned customer with vehicles
- Location: e2e/staff-registers.spec.ts:84:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.registers-customers-page tbody tr').filter({ has: locator('input[value="E2E registers-customer 2-1785695344816-co9i6"]') }).or(getByRole('list', { name: 'Customers registry' }).locator('li.uom-mobile-unit-item').filter({ has: locator('.uom-mobile-unit-name').filter({ hasText: 'E2E registers-customer 2-1785695344816-co9i6' }) }))
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 20000ms
  - waiting for locator('.registers-customers-page tbody tr').filter({ has: locator('input[value="E2E registers-customer 2-1785695344816-co9i6"]') }).or(getByRole('list', { name: 'Customers registry' }).locator('li.uom-mobile-unit-item').filter({ has: locator('.uom-mobile-unit-name').filter({ hasText: 'E2E registers-customer 2-1785695344816-co9i6' }) }))

```

```yaml
- complementary "Workspace navigation":
  - heading "Car Service" [level=1]
  - paragraph: Run the entire workshop from one board.
  - navigation "Staff sections":
    - text: Overview
    - button "Dashboard"
    - text: Records
    - button "Vehicles"
    - text: Operations
    - button "Repairs"
    - button "Purchases"
    - text: Settings
    - button "Registers"
    - button "Users"
  - text: A Signed in as
  - strong: admin@autoservice.local
  - button "Set your name"
  - button "Sign Out"
- main:
  - paragraph: Settings
  - heading "Registers" [level=2]
  - tablist "Registers sections":
    - tab "Units of measure"
    - tab "Services"
    - tab "Customers" [selected]
  - region "Customers":
    - heading "Customers" [level=3]
    - button "+ Add customer"
    - text: Search
    - searchbox "Search customers with vehicles"
    - table:
      - rowgroup:
        - row "Name Phone Email Notes Vehicles Actions":
          - columnheader "Name"
          - columnheader "Phone"
          - columnheader "Email"
          - columnheader "Notes"
          - columnheader "Vehicles"
          - columnheader "Actions"
      - rowgroup:
        - row "E2E RE 609CJLUI +155560900000 re609cjlui@example.test repair-escape-e2e · repair card dialog closes with Escape in waiting_parts · 1-1785695345609-cjlui 0 Save Delete":
          - cell "E2E RE 609CJLUI":
            - textbox "Customer name (24)": E2E RE 609CJLUI
          - cell "+155560900000":
            - textbox "Phone for E2E RE 609CJLUI": "+155560900000"
          - cell "re609cjlui@example.test":
            - textbox "Email for E2E RE 609CJLUI": re609cjlui@example.test
          - cell "repair-escape-e2e · repair card dialog closes with Escape in waiting_parts · 1-1785695345609-cjlui":
            - textbox "Notes for E2E RE 609CJLUI": repair-escape-e2e · repair card dialog closes with Escape in waiting_parts · 1-1785695345609-cjlui
          - cell "0"
          - cell "Save Delete":
            - button "Save" [disabled]
            - button "Delete"
```

# Test source

```ts
  1   | import { expect, test } from "@playwright/test";
  2   | import { e2eBehaviors } from "./allure-helpers";
  3   | import { AUTH_STATE_ADMIN, openAdminApp } from "./fixtures/auth";
  4   | import {
  5   |   cleanupE2eData,
  6   |   createE2eCustomerWithVehicle,
  7   |   createE2eService,
  8   |   createE2eUnit,
  9   | } from "./fixtures/e2eDataFactory";
  10  | import { StaffNavigationPage } from "./pages/StaffNavigationPage";
  11  | import { StaffRegistersPage } from "./pages/StaffRegistersPage";
  12  | 
  13  | /** Registers create their own reference rows; CI does not load demo data. */
  14  | 
  15  | test.describe("Registers workspace @desktop", () => {
  16  |   test.use({ storageState: AUTH_STATE_ADMIN });
  17  | 
  18  |   test.beforeEach(async ({ page }) => {
  19  |     await openAdminApp(page);
  20  |     await new StaffNavigationPage(page).waitForStaffNavigationChrome();
  21  |     await expect(page.getByRole("button", { name: "Registers" })).toBeVisible({ timeout: 30_000 });
  22  |   });
  23  | 
  24  |   test("admin opens Registers on Units tab and sees test-owned UoM code", async ({ page }) => {
  25  |     await e2eBehaviors("admin", "registers · units of measure tab");
  26  |     const unit = await createE2eUnit(page, "uom");
  27  |     try {
  28  |       const reg = new StaffRegistersPage(page);
  29  |       await reg.gotoRegistersSection();
  30  |       await reg.expectUnitsTabActive();
  31  |       await expect(reg.uomCodeCell(unit.code)).toBeVisible({ timeout: 20_000 });
  32  |     } finally {
  33  |       await cleanupE2eData(page, { unitIds: [unit.id] });
  34  |     }
  35  |   });
  36  | 
  37  |   test("admin switches to Services, search filters catalog row", async ({ page }) => {
  38  |     await e2eBehaviors("admin", "registers · services search");
  39  |     const service = await createE2eService(page, "E2E AC service");
  40  |     try {
  41  |       const reg = new StaffRegistersPage(page);
  42  |       await reg.gotoRegistersSection();
  43  |       await expect
  44  |         .poll(async () => page.getByRole("tab", { name: "Units of measure" }).getAttribute("aria-selected"))
  45  |         .toBe("true");
  46  | 
  47  |       await Promise.all([
  48  |         page.waitForResponse(
  49  |           (r) => r.url().includes("/api/services") && r.request().method() === "GET" && r.status() === 200,
  50  |           { timeout: 30_000 },
  51  |         ),
  52  |         reg.openTab("Services"),
  53  |       ]);
  54  | 
  55  |       await reg.expectServicesWorkspaceVisible();
  56  |       await expect(page.locator(".services-register-page").getByText("Loading…")).toHaveCount(0, { timeout: 20_000 });
  57  | 
  58  |       await reg.servicesSearchInput().fill(service.name);
  59  |       const row = reg.serviceRowByNameSnippet(service.name);
  60  |       await expect(row).toBeVisible({ timeout: 15_000 });
  61  |       await expect(row.getByRole("group", { name: new RegExp(service.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") })).toBeVisible();
  62  |     } finally {
  63  |       await cleanupE2eData(page, { serviceIds: [service.id] });
  64  |     }
  65  |   });
  66  | 
  67  |   test("admin Registers tabs do not include Invoice lines", async ({ page }) => {
  68  |     await e2eBehaviors("admin", "registers · tabs set");
  69  |     const reg = new StaffRegistersPage(page);
  70  |     await reg.gotoRegistersSection();
  71  |     await expect(page.getByRole("tab", { name: "Units of measure" })).toBeVisible();
  72  |     await expect(page.getByRole("tab", { name: "Services" })).toBeVisible();
  73  |     await expect(page.getByRole("tab", { name: "Customers" })).toBeVisible();
  74  |     await expect(page.getByRole("tab", { name: "Invoice lines" })).toHaveCount(0);
  75  |   });
  76  | 
  77  |   test("admin Registers desktop has no collapsible help panels", async ({ page }) => {
  78  |     await e2eBehaviors("admin", "registers · desktop · no disclosure hints");
  79  |     const reg = new StaffRegistersPage(page);
  80  |     await reg.gotoRegistersSection();
  81  |     await expect(page.locator(".reference-workspace details.registers-help-disclosure")).toHaveCount(0);
  82  |   });
  83  | 
  84  |   test("admin switches to Customers and sees test-owned customer with vehicles", async ({ page }) => {
  85  |     await e2eBehaviors("admin", "registers · customers with vehicles");
  86  |     const fixture = await createE2eCustomerWithVehicle(page, "registers-customer");
  87  |     try {
  88  |       await openAdminApp(page);
  89  |       const reg = new StaffRegistersPage(page);
  90  |       await reg.gotoRegistersSection();
  91  |       await reg.openTab("Customers");
  92  |       await reg.expectCustomersWorkspaceVisible();
  93  | 
  94  |       await reg.expandCustomerMobileRowIfNeeded(fixture.customerName);
  95  |       const row = reg.customerRowByName(fixture.customerName);
> 96  |       await expect(row).toBeVisible({ timeout: 20_000 });
      |                         ^ Error: expect(locator).toBeVisible() failed
  97  |       await expect(row.getByRole("button", { name: "Save" })).toBeVisible();
  98  |       await expect(row.getByRole("button", { name: "Delete" })).toBeVisible();
  99  |     } finally {
  100 |       await cleanupE2eData(page, { vehicleIds: [fixture.vehicleId], customerIds: [fixture.customerId] });
  101 |     }
  102 |   });
  103 | });
  104 | 
  105 | test.describe("Registers workspace @mobile-only", () => {
  106 |   test.use({ storageState: AUTH_STATE_ADMIN });
  107 | 
  108 |   test.beforeEach(async ({ page }) => {
  109 |     await openAdminApp(page);
  110 |     await new StaffNavigationPage(page).waitForStaffNavigationChrome();
  111 |   });
  112 | 
  113 |   test("admin reaches Registers tabs and Services catalog on narrow viewport", async ({ page }) => {
  114 |     await e2eBehaviors("admin", "registers · mobile · services tab");
  115 |     const service = await createE2eService(page, "E2E mobile service");
  116 |     try {
  117 |       const reg = new StaffRegistersPage(page);
  118 |       await reg.gotoRegistersSection();
  119 |       await Promise.all([
  120 |         page.waitForResponse(
  121 |           (r) => r.url().includes("/api/services") && r.request().method() === "GET" && r.status() === 200,
  122 |           { timeout: 30_000 },
  123 |         ),
  124 |         reg.openTab("Services"),
  125 |       ]);
  126 |       await reg.expectServicesWorkspaceVisible();
  127 |       await expect(reg.serviceRowByNameSnippet(service.name)).toBeVisible({ timeout: 25_000 });
  128 |     } finally {
  129 |       await cleanupE2eData(page, { serviceIds: [service.id] });
  130 |     }
  131 |   });
  132 | 
  133 |   test("admin opens Registers on Units tab and sees test-owned UoM code", async ({ page }) => {
  134 |     await e2eBehaviors("admin", "registers · mobile · units of measure tab");
  135 |     const unit = await createE2eUnit(page, "muom");
  136 |     try {
  137 |       const reg = new StaffRegistersPage(page);
  138 |       await reg.gotoRegistersSection();
  139 |       await reg.expectUnitsTabActive();
  140 |       await expect(reg.uomCodeCell(unit.code)).toBeVisible({ timeout: 20_000 });
  141 |     } finally {
  142 |       await cleanupE2eData(page, { unitIds: [unit.id] });
  143 |     }
  144 |   });
  145 | 
  146 |   test("admin Registers tabs do not include Invoice lines on narrow viewport", async ({ page }) => {
  147 |     await e2eBehaviors("admin", "registers · mobile · tabs set");
  148 |     const reg = new StaffRegistersPage(page);
  149 |     await reg.gotoRegistersSection();
  150 |     await expect(page.getByRole("tab", { name: "Units of measure" })).toBeVisible();
  151 |     await expect(page.getByRole("tab", { name: "Services" })).toBeVisible();
  152 |     await expect(page.getByRole("tab", { name: "Customers" })).toBeVisible();
  153 |     await expect(page.getByRole("tab", { name: "Invoice lines" })).toHaveCount(0);
  154 |   });
  155 | 
  156 |   test("admin Registers mobile Units tab shows collapsible How units work", async ({ page }) => {
  157 |     await e2eBehaviors("admin", "registers · mobile · units disclosure hint");
  158 |     const reg = new StaffRegistersPage(page);
  159 |     await reg.gotoRegistersSection();
  160 |     await reg.expectUnitsTabActive();
  161 |     await expect(page.locator(".reference-workspace .uom-admin-page details.registers-help-disclosure")).toHaveCount(1);
  162 |     await expect(page.locator(".reference-workspace .uom-admin-page summary.registers-help-disclosure-summary", { hasText: "How units work" })).toBeVisible();
  163 |   });
  164 | });
  165 | 
```