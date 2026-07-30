# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: django-admin-repairs.spec.ts >> Django admin — repairs CRUD @desktop @django-admin >> RepairFinancialSnapshot add page loads without 500 error
- Location: e2e/django-admin-repairs.spec.ts:264:3

# Error details

```
Error: expect(locator).not.toHaveText(expected) failed

Locator: locator('h1')
Expected pattern: not /server error/i
Error: strict mode violation: locator('h1') resolved to 2 elements:
    1) <h1 class="overflow-hidden leading-5 text-important flex items-center whitespace-nowrap xl:text-base">…</h1> aka getByRole('heading', { name: 'Repairs chevron_right Repair' })
    2) <h1 class="font-semibold text-base text-important tracking-tight">↵                    Available shortcuts↵        …</h1> aka getByRole('heading', { name: 'Available shortcuts' })

Call log:
  - Expect "not toHaveText" with timeout 5000ms
  - waiting for locator('h1')

```

# Page snapshot

```yaml
- status [ref=e3]: Loading app…
```

# Test source

```ts
  170 | 
  171 |     createdRepairId = await captureAdminIdFromUrlOrRow(page, /\/admin\/repairs\/repair\/(\d+)\/change\//, serviceName);
  172 |     expect(createdRepairId).not.toBeNull();
  173 | 
  174 |     await page.goto("/admin/repairs/repair/");
  175 |     await page.waitForLoadState("domcontentloaded");
  176 | 
  177 |     await expect(page.locator("#result_list").getByText(serviceName)).toBeVisible({ timeout: 10_000 });
  178 |   });
  179 | 
  180 |   test("Repair — update: change service_name and verify in changelist", async ({ page }) => {
  181 |     await e2eBehaviors("admin", "django admin · repair · update");
  182 | 
  183 |     const originalName = `E2E Admin Update Before ${Date.now()}`;
  184 |     const updatedName = `E2E Admin Update After ${Date.now()}`;
  185 | 
  186 |     await page.goto("/admin/repairs/repair/add/");
  187 |     await page.waitForLoadState("domcontentloaded");
  188 | 
  189 |     await page.locator("input#id_service_name").fill(originalName);
  190 |     await page.locator("select#id_vehicle").selectOption({ value: String(vehicleId) });
  191 |     await page.locator("select#id_status").selectOption("new");
  192 |     await page.locator("[name='_continue']").click();
  193 | 
  194 |     await page.waitForLoadState("domcontentloaded");
  195 | 
  196 |     const createMatch = page.url().match(/\/admin\/repairs\/repair\/(\d+)\/change\//);
  197 |     if (createMatch !== null) {
  198 |       createdRepairId = parseInt(createMatch[1], 10);
  199 |     } else {
  200 |       const row = await adminRowForText(page, originalName);
  201 |       await row.locator("a[href*='/change/']").first().click();
  202 |       await page.waitForLoadState("domcontentloaded");
  203 |       const editMatch = page.url().match(/\/admin\/repairs\/repair\/(\d+)\/change\//);
  204 |       if (editMatch !== null) {
  205 |         createdRepairId = parseInt(editMatch[1], 10);
  206 |       }
  207 |     }
  208 | 
  209 |     await page.locator("input#id_service_name").fill(updatedName);
  210 |     await page.locator("[name='_save']").click();
  211 | 
  212 |     await page.waitForLoadState("domcontentloaded");
  213 | 
  214 |     await page.goto("/admin/repairs/repair/");
  215 |     await page.waitForLoadState("domcontentloaded");
  216 | 
  217 |     await expect(page.locator("#result_list").getByText(updatedName)).toBeVisible({ timeout: 10_000 });
  218 |     await expect(page.locator("#result_list").getByText(originalName)).toHaveCount(0);
  219 |   });
  220 | 
  221 |   test("Repair — delete via detail page delete button", async ({ page }) => {
  222 |     await e2eBehaviors("admin", "django admin · repair · delete");
  223 | 
  224 |     const serviceName = `E2E Admin Delete ${Date.now()}`;
  225 | 
  226 |     await page.goto("/admin/repairs/repair/add/");
  227 |     await page.waitForLoadState("domcontentloaded");
  228 | 
  229 |     await page.locator("input#id_service_name").fill(serviceName);
  230 |     await page.locator("select#id_vehicle").selectOption({ value: String(vehicleId) });
  231 |     await page.locator("select#id_status").selectOption("new");
  232 |     await page.locator("[name='_continue']").click();
  233 | 
  234 |     await page.waitForLoadState("domcontentloaded");
  235 | 
  236 |     const createMatch = page.url().match(/\/admin\/repairs\/repair\/(\d+)\/change\//);
  237 |     if (createMatch !== null) {
  238 |       createdRepairId = parseInt(createMatch[1], 10);
  239 |     } else {
  240 |       const row = await adminRowForText(page, serviceName);
  241 |       await row.locator("a[href*='/change/']").first().click();
  242 |       await page.waitForLoadState("domcontentloaded");
  243 |       const editMatch = page.url().match(/\/admin\/repairs\/repair\/(\d+)\/change\//);
  244 |       if (editMatch !== null) {
  245 |         createdRepairId = parseInt(editMatch[1], 10);
  246 |       }
  247 |     }
  248 | 
  249 |     if (createdRepairId === null) {
  250 |       throw new Error("Expected created repair id before deleting through Django admin");
  251 |     }
  252 |     await page.goto(`/admin/repairs/repair/${createdRepairId}/delete/`);
  253 |     await page.waitForLoadState("domcontentloaded");
  254 | 
  255 |     await page.getByRole("button", { name: "Yes, I’m sure" }).click();
  256 |     await page.waitForLoadState("domcontentloaded");
  257 | 
  258 |     await expect(page).toHaveURL(/\/admin\/repairs\/repair\//);
  259 |     await expect(page.locator("#result_list").getByText(serviceName)).toHaveCount(0);
  260 | 
  261 |     createdRepairId = null;
  262 |   });
  263 | 
  264 |   test("RepairFinancialSnapshot add page loads without 500 error", async ({ page }) => {
  265 |     await e2eBehaviors("admin", "django admin · repairfinancialsnapshot · add page no 500");
  266 | 
  267 |     await page.goto("/admin/repairs/repairfinancialsnapshot/add/");
  268 |     await page.waitForLoadState("domcontentloaded");
  269 | 
> 270 |     await expect(page.locator("h1")).not.toHaveText(/server error/i);
      |                                          ^ Error: expect(locator).not.toHaveText(expected) failed
  271 |     await expect(page.locator("#content")).toBeVisible();
  272 |   });
  273 | 
  274 |   test("InviteToken changelist renders table structure or empty state", async ({ page }) => {
  275 |     await e2eBehaviors("admin", "django admin · invitetoken · changelist structure");
  276 | 
  277 |     await page.goto("/admin/users/invitetoken/");
  278 |     await page.waitForLoadState("domcontentloaded");
  279 | 
  280 |     const hasResultList = await page.locator("#result_list").count();
  281 |     const hasChangelistSearch = await page.locator("#changelist-search").count();
  282 |     const hasPaginator = await page.locator(".paginator").count();
  283 | 
  284 |     expect(hasResultList + hasChangelistSearch + hasPaginator).toBeGreaterThan(0);
  285 |   });
  286 | 
  287 |   test("InviteToken add link is present on changelist page", async ({ page }) => {
  288 |     await e2eBehaviors("admin", "django admin · invitetoken · add link present");
  289 | 
  290 |     await page.goto("/admin/users/invitetoken/");
  291 |     await page.waitForLoadState("domcontentloaded");
  292 | 
  293 |     await expect(page.locator("a[href*='/admin/users/invitetoken/add/']").first()).toBeVisible();
  294 |   });
  295 | });
  296 | 
```