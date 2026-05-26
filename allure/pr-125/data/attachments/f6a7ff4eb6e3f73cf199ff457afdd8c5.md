# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: staff-repair-intake-create.spec.ts >> Staff repair intake — create kanban card @desktop >> desktop: New Repair → intake → card on board
- Location: e2e/staff-repair-intake-create.spec.ts:15:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('dialog').filter({ hasText: 'Repair Intake' })
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByRole('dialog').filter({ hasText: 'Repair Intake' })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary "Workspace navigation" [ref=e4]:
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
            - generic [ref=e28]: Repairs
      - generic [ref=e29]:
        - generic [ref=e30]:
          - paragraph [ref=e31]: Today · Tue 26 May
          - generic [ref=e32]: live
        - list [ref=e34]:
          - listitem [ref=e35] [cursor=pointer]:
            - generic [ref=e37]: Open
            - strong [ref=e38]: "5"
          - listitem [ref=e39] [cursor=pointer]:
            - generic [ref=e41]: Waiting parts
            - strong [ref=e42]: "0"
          - listitem [ref=e43] [cursor=pointer]:
            - generic [ref=e45]: Ready to pickup
            - strong [ref=e46]: "57"
        - button "+ Add new repair" [ref=e47] [cursor=pointer]
    - generic [ref=e48]:
      - generic [ref=e49]:
        - generic [ref=e50]: S
        - generic [ref=e51]:
          - generic [ref=e52]: Signed in as
          - strong [ref=e53]: staff@autoservice.local
          - button "Ivan Master" [ref=e54] [cursor=pointer]
      - button "Sign Out" [ref=e55] [cursor=pointer]
  - main [ref=e56]:
    - generic [ref=e57]:
      - generic [ref=e58]:
        - generic [ref=e59]:
          - generic [ref=e60]:
            - paragraph [ref=e61]: Repairs
            - heading "Kanban Board" [level=2] [ref=e62]
          - generic [ref=e63]:
            - generic [ref=e64]:
              - button "7 days" [ref=e65] [cursor=pointer]
              - button "30 days" [ref=e66] [cursor=pointer]
              - button "90 days" [ref=e67] [cursor=pointer]
              - button "All time" [ref=e68] [cursor=pointer]
            - searchbox [ref=e70]
            - button "+ New Repair" [ref=e71] [cursor=pointer]
        - generic "Repairs kanban board" [ref=e73]:
          - generic [ref=e74]:
            - generic [ref=e75]:
              - generic [ref=e76]:
                - generic [ref=e77]: New
                - generic [ref=e78]:
                  - generic [ref=e79]: "2"
                  - button "▼" [ref=e80] [cursor=pointer]
              - generic [ref=e81]:
                - article [ref=e82] [cursor=pointer]:
                  - generic [ref=e83]:
                    - generic [ref=e84]: KA 1357 UU
                    - generic [ref=e85]: New
                  - paragraph [ref=e86]: Eclipse Cross · 2019 · 53,800 km
                  - paragraph [ref=e87]: Tire service — winter set
                  - paragraph [ref=e88]: Customer-supplied winter tyres mounted and balanced.
                  - generic [ref=e90]:
                    - img [ref=e92]
                    - generic [ref=e95]: Ivan Master
                  - generic [ref=e97]: "#TOR-2034"
                - article [ref=e98] [cursor=pointer]:
                  - generic [ref=e99]:
                    - generic [ref=e100]: AA 1234 BB
                    - generic [ref=e101]: New
                  - paragraph [ref=e102]: Camry · 2019 · 87,400 km
                  - paragraph [ref=e103]: Tire rotation and balancing
                  - paragraph [ref=e104]: Routine rotation at customer request. Rear tires moved to front.
                  - generic [ref=e106]:
                    - img [ref=e108]
                    - generic [ref=e111]: Ivan Master
                  - generic [ref=e113]: "#TOR-1006"
            - generic [ref=e114]:
              - generic [ref=e115]:
                - generic [ref=e116]: In Progress
                - generic [ref=e117]:
                  - generic [ref=e118]: "3"
                  - button "▼" [ref=e119] [cursor=pointer]
              - generic [ref=e120]:
                - article [ref=e121] [cursor=pointer]:
                  - generic [ref=e122]:
                    - generic [ref=e123]: BH 7788 GG
                    - generic [ref=e124]: In Progress
                  - paragraph [ref=e125]: Megane · 2015 · 148,500 km
                  - paragraph [ref=e126]: AC system diagnostics and re-gas
                  - paragraph [ref=e127]: AC blows warm air. Suspected refrigerant leak at condenser.
                  - generic [ref=e128]:
                    - generic [ref=e129]:
                      - img [ref=e131]
                      - generic [ref=e134]: Ivan Master
                    - time [ref=e135]: 20 Mar, 14:00
                  - generic [ref=e137]: "#TOR-1005"
                - article [ref=e138] [cursor=pointer]:
                  - generic [ref=e139]:
                    - generic [ref=e140]: BH 5566 FF
                    - generic [ref=e141]: In Progress
                  - paragraph [ref=e142]: Passat · 2018 · 112,000 km
                  - paragraph [ref=e143]: Timing belt + water pump replacement
                  - paragraph [ref=e144]: Manufacturer interval exceeded. Belt shows visible cracking.
                  - generic [ref=e145]:
                    - generic [ref=e146]:
                      - img [ref=e148]
                      - generic [ref=e151]: Ivan Master
                    - time [ref=e152]: 26 May, 04:40
                  - generic [ref=e154]: "#TOR-1004"
                - article [ref=e155] [cursor=pointer]:
                  - generic [ref=e156]:
                    - generic [ref=e157]: KA 4321 EE
                    - generic [ref=e158]: In Progress
                  - paragraph [ref=e159]: 3 Series · 2021 · 31,000 km
                  - paragraph [ref=e160]: Engine diagnostics
                  - paragraph [ref=e161]: Check engine light on. Fault codes P0171 and P0174 stored.
                  - generic [ref=e162]:
                    - generic [ref=e163]:
                      - img [ref=e165]
                      - generic [ref=e168]: Ivan Master
                    - time [ref=e169]: 5 Mar, 10:00
                  - generic [ref=e171]: "#TOR-1003"
            - generic [ref=e172]:
              - generic [ref=e173]:
                - generic [ref=e174]: Waiting Parts
                - generic [ref=e175]:
                  - generic [ref=e176]: "0"
                  - button "▼" [ref=e177] [cursor=pointer]
              - generic [ref=e179]: No repairs
            - generic [ref=e180]:
              - generic [ref=e181]:
                - generic [ref=e182]: Completed
                - generic [ref=e183]:
                  - generic [ref=e184]: "57"
                  - button "▼" [ref=e185] [cursor=pointer]
              - generic [ref=e186]:
                - article [ref=e187] [cursor=pointer]:
                  - generic [ref=e188]:
                    - generic [ref=e189]: AA 1234 BB
                    - generic [ref=e190]: Completed
                  - paragraph [ref=e191]: Camry · 2019 · 87,400 km
                  - paragraph [ref=e192]: Oil change + filter replacement +1
                  - paragraph [ref=e193]: Scheduled maintenance at 87 400 km. Customer requests synthetic 5W-40.
                  - generic [ref=e195]:
                    - img [ref=e197]
                    - generic [ref=e200]: Ivan Master
                  - generic [ref=e202]: "#TOR-1001"
                - article [ref=e203] [cursor=pointer]:
                  - generic [ref=e204]:
                    - generic [ref=e205]: BH 1111 XX
                    - generic [ref=e206]: Completed
                  - paragraph [ref=e207]: 370Z · 2018 · 38,900 km
                  - paragraph [ref=e208]: Coilover installation + alignment
                  - paragraph [ref=e209]: "March 2026 demo case: spring setup refresh with new camber plates and alignment session."
                  - generic [ref=e211]:
                    - img [ref=e213]
                    - generic [ref=e216]: Ivan Master
                  - generic [ref=e218]: "#TOR-3008"
                - article [ref=e219] [cursor=pointer]:
                  - generic [ref=e220]:
                    - generic [ref=e221]: BH 9876 WW
                    - generic [ref=e222]: Completed
                  - paragraph [ref=e223]: Civic Type R · 2022 · 24,600 km
                  - paragraph [ref=e224]: Alignment check — track setup
                  - paragraph [ref=e225]: "March 2026 demo case: suspension dial-in before the first circuit session of the season."
                  - generic [ref=e227]:
                    - img [ref=e229]
                    - generic [ref=e232]: Ivan Master
                  - generic [ref=e234]: "#TOR-3007"
                - article [ref=e235] [cursor=pointer]:
                  - generic [ref=e236]:
                    - generic [ref=e237]: BH 1122 PP
                    - generic [ref=e238]: Completed
                  - paragraph [ref=e239]: Transporter · 2019 · 195,000 km
                  - paragraph [ref=e240]: Brake pads — full axle replacement
                  - paragraph [ref=e241]: "March 2026 demo case: van brake overhaul completed ahead of fleet inspection."
                  - generic [ref=e243]:
                    - img [ref=e245]
                    - generic [ref=e248]: Ivan Master
                  - generic [ref=e250]: "#TOR-3006"
                - article [ref=e251] [cursor=pointer]:
                  - generic [ref=e252]:
                    - generic [ref=e253]: KA 8899 MM
                    - generic [ref=e254]: Completed
                  - paragraph [ref=e255]: Tucson · 2022 · 18,700 km
                  - paragraph [ref=e256]: Oil change + all filters
                  - paragraph [ref=e257]: "March 2026 demo case: post-winter maintenance with a full filter set and fluids top-up."
                  - generic [ref=e259]:
                    - img [ref=e261]
                    - generic [ref=e264]: Ivan Master
                  - generic [ref=e266]: "#TOR-3005"
                - article [ref=e267] [cursor=pointer]:
                  - generic [ref=e268]:
                    - generic [ref=e269]: AA 4455 KK
                    - generic [ref=e270]: Completed
                  - paragraph [ref=e271]: 6 · 2018 · 78,200 km
                  - paragraph [ref=e272]: Suspension & steering
                  - paragraph [ref=e273]: "March 2026 demo case: vibration at motorway speed traced to worn tie rod ends and front links."
                  - generic [ref=e275]:
                    - img [ref=e277]
                    - generic [ref=e280]: Ivan Master
                  - generic [ref=e282]: "#TOR-3004"
                - article [ref=e283] [cursor=pointer]:
                  - generic [ref=e284]:
                    - generic [ref=e285]: BH 5566 FF
                    - generic [ref=e286]: Completed
                  - paragraph [ref=e287]: Passat · 2018 · 112,000 km
                  - paragraph [ref=e288]: Timing belt + water pump replacement
                  - paragraph [ref=e289]: "March 2026 demo case: fleet Passat scheduled before regional delivery route starts."
                  - generic [ref=e291]:
                    - img [ref=e293]
                    - generic [ref=e296]: Ivan Master
                  - generic [ref=e298]: "#TOR-3003"
                - article [ref=e299] [cursor=pointer]:
                  - generic [ref=e300]:
                    - generic [ref=e301]: KA 4321 EE
                    - generic [ref=e302]: Completed
                  - paragraph [ref=e303]: 3 Series · 2021 · 31,000 km
                  - paragraph [ref=e304]: AC service
                  - paragraph [ref=e305]: "March 2026 demo case: AC performance dropped before spring season, condenser leak repaired and re-gassed."
                  - generic [ref=e307]:
                    - img [ref=e309]
                    - generic [ref=e312]: Ivan Master
                  - generic [ref=e314]: "#TOR-3002"
                - article [ref=e315] [cursor=pointer]:
                  - generic [ref=e316]:
                    - generic [ref=e317]: AA 1234 BB
                    - generic [ref=e318]: Completed
                  - paragraph [ref=e319]: Camry · 2019 · 87,400 km
                  - paragraph [ref=e320]: Brake system service
                  - paragraph [ref=e321]: "March 2026 demo case: front discs scored, full brake service completed with same-week parts arrival."
                  - generic [ref=e323]:
                    - img [ref=e325]
                    - generic [ref=e328]: Ivan Master
                  - generic [ref=e330]: "#TOR-3001"
                - article [ref=e331] [cursor=pointer]:
                  - generic [ref=e332]:
                    - generic [ref=e333]: KA 8899 MM
                    - generic [ref=e334]: Completed
                  - paragraph [ref=e335]: Tucson · 2022 · 18,700 km
                  - paragraph [ref=e336]: Oil change — Hyundai Genuine 5W-30
                  - paragraph [ref=e337]: First service at workshop. Hyundai Genuine oil and OEM filter.
                  - generic [ref=e339]:
                    - img [ref=e341]
                    - generic [ref=e344]: Ivan Master
                  - generic [ref=e346]: "#TOR-2046"
                - article [ref=e347] [cursor=pointer]:
                  - generic [ref=e348]:
                    - generic [ref=e349]: BH 9876 WW
                    - generic [ref=e350]: Completed
                  - paragraph [ref=e351]: Civic Type R · 2022 · 24,600 km
                  - paragraph [ref=e352]: Brake fluid flush — Motul RBF 660
                  - paragraph [ref=e353]: High-temp racing brake fluid for track use. Full system bleed.
                  - generic [ref=e355]:
                    - img [ref=e357]
                    - generic [ref=e360]: Ivan Master
                  - generic [ref=e362]: "#TOR-2041"
                - article [ref=e363] [cursor=pointer]:
                  - generic [ref=e364]:
                    - generic [ref=e365]: BH 9876 WW
                    - generic [ref=e366]: Completed
                  - paragraph [ref=e367]: Civic Type R · 2022 · 24,600 km
                  - paragraph [ref=e368]: Oil change — Shell Helix Ultra 0W-20
                  - paragraph [ref=e369]: Track prep service. Engine oil and filter only, as owner specified.
                  - generic [ref=e371]:
                    - img [ref=e373]
                    - generic [ref=e376]: Ivan Master
                  - generic [ref=e378]: "#TOR-2040"
                - article [ref=e379] [cursor=pointer]:
                  - generic [ref=e380]:
                    - generic [ref=e381]: AA 2233 HH
                    - generic [ref=e382]: Completed
                  - paragraph [ref=e383]: Corolla · 2020 · 42,500 km
                  - paragraph [ref=e384]: Oil change — Toyota Genuine 0W-20
                  - paragraph [ref=e385]: First service at our workshop. OEM filter and genuine Toyota oil.
                  - generic [ref=e387]:
                    - img [ref=e389]
                    - generic [ref=e392]: Ivan Master
                  - generic [ref=e394]: "#TOR-2012"
                - article [ref=e395] [cursor=pointer]:
                  - generic [ref=e396]:
                    - generic [ref=e397]: AA 9876 CC
                    - generic [ref=e398]: Completed
                  - paragraph [ref=e399]: Focus · 2017 · 54,200 km
                  - paragraph [ref=e400]: Brake pad replacement — front axle
                  - paragraph [ref=e401]: Customer reports squealing on light braking. Front pads worn to 2 mm.
                  - generic [ref=e403]:
                    - img [ref=e405]
                    - generic [ref=e408]: Ivan Master
                  - generic [ref=e410]: "#TOR-1002"
                - article [ref=e411] [cursor=pointer]:
                  - generic [ref=e412]:
                    - generic [ref=e413]: AA 6677 SS
                    - generic [ref=e414]: Completed
                  - paragraph [ref=e415]: Sportage · 2021 · 29,300 km
                  - paragraph [ref=e416]: Oil change — 5W-30
                  - paragraph [ref=e417]: First scheduled service at 29 000 km. OEM Kia oil and filter.
                  - generic [ref=e419]:
                    - img [ref=e421]
                    - generic [ref=e424]: Ivan Master
                  - generic [ref=e426]: "#TOR-2026"
                - button "Show 42 more" [ref=e427] [cursor=pointer]
      - dialog "New Repair" [ref=e428]:
        - generic [ref=e429]:
          - generic [ref=e430]:
            - generic [ref=e431]: Repairs
            - heading "New Repair" [level=2] [ref=e432]
            - generic "New repairs default to New" [ref=e434]: Will be created as · New
          - button "Close" [ref=e437] [cursor=pointer]:
            - img [ref=e438]
        - generic [ref=e440]:
          - generic [ref=e441]:
            - generic [ref=e442]:
              - generic [ref=e444]: Vehicle & customer
              - generic [ref=e445]:
                - generic [ref=e446]: Vehicle
                - generic [ref=e447]:
                  - searchbox "Search vehicle for repair" [active] [ref=e448]
                  - button "Or add a brand-new vehicle" [ref=e449] [cursor=pointer]:
                    - img [ref=e450]
                    - generic [ref=e452]: Or add a brand-new vehicle
              - generic [ref=e453]:
                - generic [ref=e454]: Owner
                - textbox "Owner Auto-filled from vehicle. Edit to override." [ref=e455]
                - generic [ref=e456]: Auto-filled from vehicle. Edit to override.
            - generic [ref=e457]:
              - generic [ref=e459]: Assignment
              - generic [ref=e460]:
                - generic [ref=e461]: Master
                - textbox "Master" [ref=e462]: Ivan Master
            - generic [ref=e463]:
              - generic [ref=e464]:
                - generic [ref=e465]: Services
                - generic [ref=e466]: at least one
              - generic [ref=e468]:
                - generic [ref=e469]: "1"
                - textbox "Line 1 service" [ref=e471]:
                  - /placeholder: Type or pick from catalog
                - button "Remove service line 1" [disabled] [ref=e472] [cursor=pointer]:
                  - img [ref=e473]
              - button "Add service" [ref=e475] [cursor=pointer]:
                - img [ref=e476]
                - text: Add service
            - generic [ref=e478]:
              - generic [ref=e480]: Notes
              - textbox [ref=e482]:
                - /placeholder: Describe the issue, customer expectations, additional context…
          - generic [ref=e483]:
            - generic [ref=e484]:
              - generic [ref=e485]: ⌘
              - generic [ref=e486]: ↵
              - text: to save
            - generic [ref=e487]:
              - button "Cancel" [ref=e488] [cursor=pointer]
              - button "Create Repair" [ref=e489] [cursor=pointer]
```

# Test source

```ts
  20  |   }
  21  | 
  22  |   /** Раскрытый блок секций/аккаунта (до открытия шапки `hidden` — не полагаемся на a11y tree). */
  23  |   staffQuickNav(): Locator {
  24  |     return this.page.locator("#mobile-section-picker");
  25  |   }
  26  | 
  27  |   /** Кнопка в шапке мобильного staff-shell: открыть/закрыть меню секций и аккаунта. */
  28  |   staffMobileWorkspaceMenuToggle(): Locator {
  29  |     return this.page.getByRole("button", { name: /Open workspace menu|Close workspace menu/ });
  30  |   }
  31  | 
  32  |   certificateDialog(): Locator {
  33  |     return this.page.getByRole("dialog", { name: "Certificate of Completion" });
  34  |   }
  35  | 
  36  |   /** Completed repair without an export yet shows **Make Act**; after first open — **View PDF**. */
  37  |   repairPdfPrimaryButton(): Locator {
  38  |     return this.page.getByRole("button", { name: /^(View PDF|Make Act)$/ });
  39  |   }
  40  | 
  41  |   exportNewVersionButton(): Locator {
  42  |     return this.page.getByRole("button", { name: "Export new version" });
  43  |   }
  44  | 
  45  |   /**
  46  |    * Перейти в раздел Repairs. На мобилке в DOM одновременно несколько кнопок «Repairs»
  47  |    * (tabbar / switcher / sidebar) — union `.or()` даёт strict mode violation при waitFor/click.
  48  |    * Сначала poll до появления любой навигации (гидрация), затем клик по приоритету как раньше в helpers/repair-board.
  49  |    */
  50  |   async gotoRepairsSection(): Promise<void> {
  51  |     await new StaffMobileNavigationPage(this.page).gotoStaffSection("Repairs");
  52  |   }
  53  | 
  54  |   /**
  55  |    * Карточка демо-ремонта TOR-1001 на канбане (колонка Completed может показывать только 15 карточек).
  56  |    */
  57  |   async seededRepairKanbanCard(): Promise<Locator> {
  58  |     const board = this.page.getByLabel("Repairs kanban board");
  59  |     await expect(board).toBeVisible({ timeout: 25_000 });
  60  |     const tracking = `#${E2E_DEMO_REPAIR_TRACKING_CODE}`;
  61  | 
  62  |     for (let attempt = 0; attempt < 24; attempt += 1) {
  63  |       const card = board.locator(".kanban-card").filter({ hasText: tracking });
  64  |       if ((await card.count()) > 0 && (await card.first().isVisible())) {
  65  |         return card.first();
  66  |       }
  67  |       const showMore = this.page.getByRole("button", { name: SHOW_MORE_COMPLETED });
  68  |       if (await showMore.isVisible()) {
  69  |         /* Fixed shell FAB (.shell-scroll-to-header-fab) can overlap bottom actions on narrow viewports. */
  70  |         await showMore.click({ force: true });
  71  |       } else {
  72  |         break;
  73  |       }
  74  |     }
  75  | 
  76  |     const card = board.locator(".kanban-card").filter({ hasText: tracking });
  77  |     await expect(card.first()).toBeVisible({ timeout: 25_000 });
  78  |     return card.first();
  79  |   }
  80  | 
  81  |   /**
  82  |    * Ждёт канбан, затем открывает демо-ремонт из `scripts/demo/demo_data.sql` (TOR-1001 в колонке Completed).
  83  |    */
  84  |   async openSeededRepairCard(): Promise<void> {
  85  |     const card = await this.seededRepairKanbanCard();
  86  |     await card.click();
  87  |   }
  88  | 
  89  |   async expectRepairsKanbanVisible(timeoutMs = 25_000): Promise<void> {
  90  |     await expect(this.page.getByLabel("Repairs kanban board")).toBeVisible({ timeout: timeoutMs });
  91  |   }
  92  | 
  93  |   async expectRepairDetailDialogVisible(): Promise<void> {
  94  |     const dialog = this.page.getByRole("dialog", { name: E2E_DEMO_REPAIR_DIALOG_NAME });
  95  |     await expect(dialog).toBeVisible({ timeout: 20_000 });
  96  |   }
  97  | 
  98  |   async openCertificateFromViewPdf(): Promise<void> {
  99  |     await this.repairPdfPrimaryButton().click();
  100 |     await expect(this.certificateDialog()).toBeVisible({ timeout: 30_000 });
  101 |   }
  102 | 
  103 |   async closeCertificateDialog(): Promise<void> {
  104 |     await this.certificateDialog().getByRole("button", { name: "Close" }).click();
  105 |     await expect(this.certificateDialog()).toBeHidden();
  106 |   }
  107 | 
  108 |   /**
  109 |    * Desktop staff: topbar **+ New Repair**. Mobile staff (≤820px): rail primary **New Repair** (no `+`).
  110 |    */
  111 |   async openNewRepairIntakeModal(): Promise<void> {
  112 |     const desktop = this.page.getByRole("button", { name: "+ New Repair" });
  113 |     const mobile = this.page.getByRole("button", { name: /^New Repair$/ });
  114 |     await expect(desktop.or(mobile)).toBeVisible({ timeout: 20_000 });
  115 |     if (await desktop.isVisible()) {
  116 |       await desktop.click();
  117 |     } else {
  118 |       await mobile.click();
  119 |     }
> 120 |     await expect(this.page.getByRole("dialog").filter({ hasText: "Repair Intake" })).toBeVisible({
      |                                                                                      ^ Error: expect(locator).toBeVisible() failed
  121 |       timeout: 15_000,
  122 |     });
  123 |   }
  124 | 
  125 |   /**
  126 |    * Desktop staff: topbar **+ New Repair**. Mobile staff (≤820px): rail primary **New Repair** (no `+`).
  127 |    * Waits for the create modal titled "New Repair" (not the intake step "Repair Intake").
  128 |    */
  129 |   async openNewRepairCreateModal(): Promise<void> {
  130 |     const desktop = this.page.getByRole("button", { name: "+ New Repair" });
  131 |     const mobile = this.page.getByRole("button", { name: /^New Repair$/ });
  132 |     await expect(desktop.or(mobile)).toBeVisible({ timeout: 20_000 });
  133 |     if (await desktop.isVisible()) {
  134 |       await desktop.click();
  135 |     } else {
  136 |       await mobile.click();
  137 |     }
  138 |     await expect(this.page.getByRole("dialog", { name: /New Repair/ })).toBeVisible({
  139 |       timeout: 15_000,
  140 |     });
  141 |   }
  142 | 
  143 |   async expectNewRepairDialogVisible(): Promise<void> {
  144 |     await expect(this.page.getByRole("dialog", { name: /New Repair/ })).toBeVisible({ timeout: 15_000 });
  145 |   }
  146 | 
  147 |   async expectNewRepairDialogHidden(): Promise<void> {
  148 |     await expect(this.page.getByRole("dialog", { name: /New Repair/ })).toBeHidden({ timeout: 15_000 });
  149 |   }
  150 | 
  151 |   /** Fill intake using demo vehicle + catalog service (`scripts/demo/demo_data.sql`). */
  152 |   async fillCreateRepairForm(issueNotesMarker: string): Promise<void> {
  153 |     await this.page.getByLabel("Search vehicle for repair").fill(E2E_DEMO_REPAIR_VEHICLE_PLATE);
  154 |     await this.page.getByRole("button", { name: new RegExp(`${E2E_DEMO_REPAIR_VEHICLE_PLATE}\\s*•`) }).click();
  155 | 
  156 |     const line1 = this.page.getByRole("textbox", { name: /Line 1/ });
  157 |     await line1.fill(E2E_DEMO_SERVICE_NAME_IN_CATALOG);
  158 |     // Select the matching catalog suggestion to ensure catalog_service_id is wired.
  159 |     const suggestion = this.page.getByRole("listbox").getByRole("button", {
  160 |       name: new RegExp(E2E_DEMO_SERVICE_NAME_IN_CATALOG, "i"),
  161 |     });
  162 |     await expect(suggestion).toBeVisible({ timeout: 10_000 });
  163 |     await suggestion.click();
  164 | 
  165 |     await this.page.getByLabel("Issue Notes").fill(issueNotesMarker);
  166 |   }
  167 | 
  168 |   async submitCreateRepair(): Promise<void> {
  169 |     await this.page.getByRole("button", { name: "Create Repair" }).click();
  170 |   }
  171 | 
  172 |   /** New repairs prepend; issue notes render in `.kanban-card-issue`. */
  173 |   async expectKanbanCardShowsIssueNotes(marker: string): Promise<void> {
  174 |     const cardIssue = this.page.locator(".kanban-card-issue").filter({ hasText: marker });
  175 |     await expect(cardIssue.first()).toBeVisible({ timeout: 30_000 });
  176 |   }
  177 | 
  178 |   /**
  179 |    * `.kanban-card-plate` inside the given kanban card.
  180 |    * Returns the plate span scoped to the card so callers can assert text content.
  181 |    */
  182 |   cardPlate(card: Locator): Locator {
  183 |     return card.locator(".kanban-card-plate");
  184 |   }
  185 | 
  186 |   /**
  187 |    * `.kanban-card-model` inside the given kanban card.
  188 |    * Rendered only when vehicle_model/year/mileage data is present.
  189 |    */
  190 |   cardModel(card: Locator): Locator {
  191 |     return card.locator(".kanban-card-model");
  192 |   }
  193 | 
  194 |   /**
  195 |    * `time.kanban-card-time` inside the given kanban card.
  196 |    * Rendered only when `started_at` is non-null on the repair.
  197 |    */
  198 |   cardTime(card: Locator): Locator {
  199 |     return card.locator("time.kanban-card-time");
  200 |   }
  201 | 
  202 |   /**
  203 |    * First kanban card in the "In Progress" column.
  204 |    * The column header contains the text "In Progress" — scoped via `.kanban-col` that contains it.
  205 |    */
  206 |   firstInProgressCard(): Locator {
  207 |     const board = this.page.getByLabel("Repairs kanban board");
  208 |     const inProgressCol = board.locator(".kanban-col").filter({ hasText: "In Progress" });
  209 |     return inProgressCol.locator(".kanban-card").first();
  210 |   }
  211 | }
  212 | 
```