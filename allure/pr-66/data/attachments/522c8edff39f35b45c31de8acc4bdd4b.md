# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: repair-pdf-view.spec.ts >> Repair PDF: view without new export >> two View PDF opens only call POST export once (first time) or zero times (if already exported)
- Location: e2e/repair-pdf-view.spec.ts:14:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'View PDF' })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e8]: CS
        - heading "Car Service" [level=1] [ref=e9]
        - paragraph [ref=e10]: Run the entire workshop from one board.
      - navigation "Staff sections" [ref=e11]:
        - generic [ref=e12]:
          - generic [ref=e13]: Records
          - button "Vehicles" [ref=e14] [cursor=pointer]:
            - img [ref=e16]
            - generic [ref=e21]: Vehicles
        - generic [ref=e22]:
          - generic [ref=e23]: Operations
          - button "Repairs" [ref=e24] [cursor=pointer]:
            - img [ref=e26]
            - generic [ref=e29]: Repairs
      - generic [ref=e30]:
        - paragraph [ref=e31]: Quick Focus
        - heading "Start with records." [level=2] [ref=e32]
        - paragraph [ref=e33]: Create repair jobs, assign masters, and keep every vehicle moving through the workshop.
        - button "Add New Repair" [ref=e35] [cursor=pointer]
    - generic [ref=e36]:
      - generic [ref=e37]:
        - generic [ref=e38]: S
        - generic [ref=e39]:
          - generic [ref=e40]: Signed in as
          - strong [ref=e41]: staff@autoservice.local
          - button "Ivan Master" [ref=e42] [cursor=pointer]
      - button "Sign Out" [ref=e43] [cursor=pointer]
  - main [ref=e44]:
    - generic [ref=e46]:
      - generic [ref=e47]:
        - generic [ref=e48]:
          - paragraph [ref=e49]: Repairs
          - heading "Kanban Board" [level=2] [ref=e50]
        - generic [ref=e51]:
          - generic [ref=e52]:
            - button "7 days" [ref=e53] [cursor=pointer]
            - button "30 days" [ref=e54] [cursor=pointer]
            - button "90 days" [ref=e55] [cursor=pointer]
            - button "All time" [ref=e56] [cursor=pointer]
          - searchbox [ref=e58]
          - button "+ New Repair" [ref=e59] [cursor=pointer]
      - generic "Desktop repairs board" [ref=e61]:
        - generic [ref=e62]:
          - generic [ref=e63]:
            - generic [ref=e64]:
              - generic [ref=e65]: New
              - generic [ref=e66]:
                - generic [ref=e67]: "0"
                - button "▼" [ref=e68] [cursor=pointer]
            - generic [ref=e70]: No repairs
          - generic [ref=e71]:
            - generic [ref=e72]:
              - generic [ref=e73]: In Progress
              - generic [ref=e74]:
                - generic [ref=e75]: "0"
                - button "▼" [ref=e76] [cursor=pointer]
            - generic [ref=e78]: No repairs
          - generic [ref=e79]:
            - generic [ref=e80]:
              - generic [ref=e81]: Waiting Parts
              - generic [ref=e82]:
                - generic [ref=e83]: "0"
                - button "▼" [ref=e84] [cursor=pointer]
            - generic [ref=e86]: No repairs
          - generic [ref=e87]:
            - generic [ref=e88]:
              - generic [ref=e89]: Completed
              - generic [ref=e90]:
                - generic [ref=e91]: "1"
                - button "▼" [ref=e92] [cursor=pointer]
            - article [ref=e94] [cursor=pointer]:
              - generic [ref=e95]:
                - heading "E2E-CI-001 • Demo Sedan" [level=4] [ref=e96]
                - generic "Drag to move" [ref=e97]: ⠿
              - paragraph [ref=e98]: "Client: E2E Demo Customer"
              - paragraph [ref=e99]: E2E completed service
              - paragraph [ref=e100]: Seeded for CI Playwright
              - generic [ref=e101]:
                - generic [ref=e102]: "Master: Ivan Master"
                - generic [ref=e103]:
                  - generic [ref=e104]: Created 05-04-2026
                  - generic [ref=e105]: Completed 05-04-2026
      - dialog "E2E-CI-001 • Demo Sedan" [ref=e106]:
        - generic [ref=e107]:
          - generic [ref=e108]:
            - paragraph [ref=e109]: Repair Update
            - heading "E2E-CI-001 • Demo Sedan" [level=3] [ref=e110]
          - generic [ref=e111]:
            - button "Make Act" [ref=e112] [cursor=pointer]
            - button "Close" [ref=e113] [cursor=pointer]
        - generic [ref=e114]:
          - generic [ref=e115]: Status
          - generic [ref=e116]:
            - button "New" [ref=e117] [cursor=pointer]: New
            - button "In Progress" [ref=e119] [cursor=pointer]: In Progress
            - button "Waiting Parts" [ref=e121] [cursor=pointer]: Waiting Parts
            - button "Completed" [ref=e123] [cursor=pointer]: Completed
        - generic [ref=e125]:
          - generic [ref=e126]: Completed Date
          - textbox "Completed Date" [ref=e129]:
            - /placeholder: dd-mm-yyyy
            - text: 05-04-2026
        - generic [ref=e130]:
          - generic [ref=e131]:
            - strong [ref=e132]: Repair Info
            - generic [ref=e133]:
              - generic [ref=e134]:
                - generic [ref=e135]: Created
                - paragraph [ref=e136]: 05-04-2026
              - generic [ref=e137]:
                - generic [ref=e138]: Completed
                - paragraph [ref=e139]: 05-04-2026
              - generic [ref=e140]:
                - generic [ref=e141]: Owner
                - paragraph [ref=e142]: E2E Demo Customer
              - generic [ref=e143]:
                - generic [ref=e144]: Service
                - paragraph [ref=e145]: E2E completed service
              - generic [ref=e146]:
                - generic [ref=e147]: Client Link
                - button "Copy client portal link" [ref=e149] [cursor=pointer]: Copy ⧉
              - generic [ref=e150]:
                - generic [ref=e151]: Est. Completion
                - textbox [ref=e152]
              - generic [ref=e153]:
                - generic [ref=e154]: Issue
                - paragraph [ref=e155]: Seeded for CI Playwright
          - generic [ref=e156]:
            - strong [ref=e157]: Linked Parts
            - paragraph [ref=e158]: No ordered parts linked to this repair yet.
          - generic [ref=e159]:
            - generic [ref=e160]: Master
            - paragraph [ref=e161]: Ivan Master
          - generic [ref=e162]:
            - generic [ref=e163]: Add Repair Note
            - textbox "Add Repair Note" [ref=e164]
          - button "Add Note" [ref=e166] [cursor=pointer]
          - generic [ref=e167]:
            - strong [ref=e168]: Repair Notes History
            - paragraph [ref=e169]: No repair notes yet.
          - generic [ref=e170]:
            - generic [ref=e171]: Photos Before Repair
            - button "Photos Before Repair" [disabled] [ref=e172]
          - generic [ref=e173]:
            - generic [ref=e174]: Photos During Repair
            - button "Photos During Repair" [disabled] [ref=e175]
          - generic [ref=e176]:
            - generic [ref=e177]: Photos After Repair
            - button "Photos After Repair" [disabled] [ref=e178]
          - generic [ref=e179]:
            - button "Save Repair Update" [ref=e180] [cursor=pointer]
            - button "Cancel" [ref=e181] [cursor=pointer]
```

# Test source

```ts
  1   | import { expect, type Locator, type Page } from "@playwright/test";
  2   | import { SEEDED_REPAIR_CARD_HEADING } from "../e2e-seed";
  3   | 
  4   | /**
  5   |  * Staff repairs board (desktop kanban + mobile list) and seeded E2E card.
  6   |  */
  7   | export class StaffRepairsPage {
  8   |   readonly page: Page;
  9   | 
  10  |   constructor(page: Page) {
  11  |     this.page = page;
  12  |   }
  13  | 
  14  |   staffQuickNav(): Locator {
  15  |     return this.page.getByRole("navigation", { name: "Staff quick navigation" });
  16  |   }
  17  | 
  18  |   certificateDialog(): Locator {
  19  |     return this.page.getByRole("dialog", { name: "Certificate of Completion" });
  20  |   }
  21  | 
  22  |   viewPdfButton(): Locator {
  23  |     return this.page.getByRole("button", { name: "View PDF" });
  24  |   }
  25  | 
  26  |   exportNewVersionButton(): Locator {
  27  |     return this.page.getByRole("button", { name: "Export new version" });
  28  |   }
  29  | 
  30  |   /**
  31  |    * Перейти в раздел Repairs. На мобилке в DOM одновременно несколько кнопок «Repairs»
  32  |    * (tabbar / switcher / sidebar) — union `.or()` даёт strict mode violation при waitFor/click.
  33  |    * Сначала poll до появления любой навигации (гидрация), затем клик по приоритету как раньше в helpers/repair-board.
  34  |    */
  35  |   async gotoRepairsSection(): Promise<void> {
  36  |     const quickNav = this.page.getByLabel("Staff quick navigation");
  37  |     const taskSwitcher = this.page.getByLabel("Staff task switcher");
  38  |     const staffSections = this.page.getByLabel("Staff sections");
  39  | 
  40  |     await expect
  41  |       .poll(
  42  |         async () =>
  43  |           (await quickNav.isVisible()) || (await taskSwitcher.isVisible()) || (await staffSections.isVisible()),
  44  |         { timeout: 20_000 },
  45  |       )
  46  |       .toBe(true);
  47  | 
  48  |     if (await quickNav.isVisible()) {
  49  |       await quickNav.getByRole("button", { name: "Repairs" }).click();
  50  |       return;
  51  |     }
  52  |     if (await taskSwitcher.isVisible()) {
  53  |       await taskSwitcher.getByRole("button", { name: "Repairs" }).click();
  54  |       return;
  55  |     }
  56  |     await staffSections.getByRole("button", { name: "Repairs" }).click();
  57  |   }
  58  | 
  59  |   /**
  60  |    * Ждёт видимый kanban или мобильный список, затем открывает CI-seeded completed repair.
  61  |    */
  62  |   async openSeededRepairCard(): Promise<void> {
  63  |     const mobileList = this.page.getByLabel("Mobile repairs list");
  64  |     const desktopBoard = this.page.getByLabel("Desktop repairs board");
  65  |     await expect
  66  |       .poll(
  67  |         async () => (await mobileList.isVisible()) || (await desktopBoard.isVisible()),
  68  |         { timeout: 25_000 },
  69  |       )
  70  |       .toBe(true);
  71  | 
  72  |     if (await mobileList.isVisible()) {
  73  |       await this.page.locator(".repair-mobile-open").filter({ hasText: /E2E-CI-001/ }).first().click();
  74  |       return;
  75  |     }
  76  | 
  77  |     await this.page.getByRole("heading", { name: SEEDED_REPAIR_CARD_HEADING }).first().click();
  78  |   }
  79  | 
  80  |   async expectMobileRepairsListVisible(timeoutMs = 25_000): Promise<void> {
  81  |     await expect(this.page.getByLabel("Mobile repairs list")).toBeVisible({ timeout: timeoutMs });
  82  |   }
  83  | 
  84  |   async expectRepairDetailDialogVisible(): Promise<void> {
  85  |     await expect(
  86  |       this.page.getByRole("dialog", { name: /E2E-CI-001|Demo Sedan/ }),
  87  |     ).toBeVisible({ timeout: 15_000 });
  88  |   }
  89  | 
  90  |   async openCertificateFromViewPdf(): Promise<void> {
> 91  |     await this.viewPdfButton().click();
      |                                ^ Error: locator.click: Test timeout of 30000ms exceeded.
  92  |     await expect(this.certificateDialog()).toBeVisible({ timeout: 30_000 });
  93  |   }
  94  | 
  95  |   async closeCertificateDialog(): Promise<void> {
  96  |     await this.certificateDialog().getByRole("button", { name: "Close" }).click();
  97  |     await expect(this.certificateDialog()).toBeHidden();
  98  |   }
  99  | }
  100 | 
```