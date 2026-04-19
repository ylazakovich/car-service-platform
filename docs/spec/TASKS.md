# Task backlog (spec) — stable IDs

Use **`T-<AREA>-<nnn>`** when asking for a batch: e.g. “implement `T-CAL-*`”.

Update checkboxes in the **same change set** as the implementation unless the user directs otherwise.

---

## NOW — Figma (client-facing mockup)

- [x] `T-FIG-001` Design System: 20 Auto Layout components + radii
- [x] `T-FIG-002` Design System: 15 color styles (Bg/*, Text/*, semantic)
- [x] `T-FIG-003` Design System: 6 text styles
- [x] `T-FIG-004` Extra components: Chip/Tracking, Chip/Date, Badge/Parts, Card/Registry
- [x] `T-FIG-005` Desktop: Nav items (9 Active+Inactive)
- [x] `T-FIG-006` Desktop: Status chips, tracking chips, parts badges, registry/metric/user cards
- [x] `T-FIG-007` Desktop: Inputs Default/Compact, Buttons Primary variants
- [ ] `T-FIG-008` Desktop: Sidebar buttons — finish remaining 7 pairs (parent IDs: 5:309, 5:678, 5:967, 5:1074)
- [ ] `T-FIG-009` Desktop: UOM inline buttons ×13 (5:1006, 5:1029–5:1070 in 5:966)
- [ ] `T-FIG-010` Desktop: Vehicles screen buttons ×2 (5:1107 → Primary/Small, 5:1113 → Secondary)
- [ ] `T-FIG-011` Mobile (393px): Bottom nav using Nav components
- [ ] `T-FIG-012` Mobile: Single-column kanban/metric/registry cards
- [ ] `T-FIG-013` Mobile: Sidebar → hamburger/drawer
- [ ] `T-FIG-014` Apply Color/Bg/* and Color/Text/* to fills/strokes
- [ ] `T-FIG-015` Share: view-only or comment-only Figma link for clients
- [ ] `T-FIG-016` Figma Annotations on key screens
- [ ] `T-FIG-017` Group frames by flow: Dashboard → Kanban → Registry → UOM Admin

---

## NOW — E2E / Playwright / CI

- [x] `T-E2E-001` Target framework documented: `docs/testing/playwright-e2e-framework.md`
- [x] `T-E2E-002` `retries: 0` in Playwright config
- [x] `T-E2E-003` Restore `.agents/e2e-validator/SKILL.md`
- [x] `T-E2E-004` CI: wait for `GET /api/health` same origin before Playwright
- [x] `T-E2E-005` `frontend/e2e/global-setup.ts` health poll
- [ ] `T-E2E-006` Deterministic PDF E2E seed: initial state for “View PDF without extra POST” (extend demo SQL / two repairs / E2E fragment)
- [ ] `T-E2E-007` Dashboard E2E: assert KPI/widget text beyond headings (fixture-backed)
- [x] `T-E2E-008` Registers E2E admin: `staff-registers.spec.ts`, POM, `e2e-seed.ts`
- [x] `T-E2E-009` `vite preview` proxy `/api` and `/media` for `:4173`
- [x] `T-E2E-010` Document MCP set: `docs/dev/agents-and-mcp.md`

---

## NOW — PDF + financial snapshot

- [x] `T-PDF-001` Completed repair: View PDF + Export new version + API GET/POST semantics
- [x] `T-PDF-002` Models `RepairDocument` + `RepairFinancialSnapshot`; `financial_totals` single source
- [x] `T-PDF-003` Wire snapshots to `GET /api/analytics/dashboard/` + MoneyFlow/Procurement/ServiceBoard UI
- [ ] `T-PDF-004` Design UX for historical analytics: period vs active snapshot version; no silent back-calculation
- [ ] `T-PDF-005` Align supplier/monthly analytics SOT with snapshot layer (no drift)
- [ ] `T-PDF-006` End-to-end story: export → dashboard totals → historical lookup (close gaps vs partial today)
- [ ] `T-PDF-007` Move `RepairDocument` binaries to S3-compatible storage; migration; `GET …/pdf/` + export upload; backup/lifecycle policy

---

## NOW — QuickFocus / VPR

- [ ] `T-QF-001` Inline create `Vehicle` when missing in QuickFocus / new VPR flow
- [ ] `T-QF-002` Inline create `Customer` when missing for new `Vehicle` (same fields/rules as Vehicle page)
- [ ] `T-QF-003` Unify/reuse customer+vehicle creation logic vs registry modals (no divergent validation)

---

## NOW — Admin user management

- [ ] `T-USR-001` Admin Users UI: close access for `staff` (offboarding)
- [ ] `T-USR-002` Decide and implement revocation model: delete vs deactivate vs both + related data rules
- [ ] `T-USR-003` Backend + UI confirmation guards (prevent wrong user deletion)

---

## NOW — Dashboard: Service Board calendar

- [ ] `T-CAL-001` Replace/enhance Service Board with large calendar operational view anchored on “today”
- [ ] `T-CAL-002` Visual language + legend for `in_progress`, `waiting_parts`, `new`, `completed`, …
- [ ] `T-CAL-003` Domain rule: which dates anchor repair on calendar (created vs planned span vs completed)

---

## NOW — Dashboard: MoneyFlow default range

- [x] `T-MFD-001` On Dashboard entry: MoneyFlow range = last 30 days → today (local); reset on revisit
- [ ] `T-MFD-002` Tests (e2e/unit): leave tab → return → rolling 30d again
- [ ] `T-MFD-003` Timezone / date math tests for `today` / `-30d` (off-by-one)

---

## NOW — Dashboard: MoneyFlow purchase summary

- [ ] `T-MFS-001` MoneyFlow panel: purchase metrics for same selected period (count, buy, sale, margin) — parity with removed Purchases summary
- [ ] `T-MFS-002` Server-side aggregate (extend dashboard API or new endpoint); not tied to client purchase pagination
- [ ] `T-MFS-003` Document in [`DOMAIN_RULES.md`](./DOMAIN_RULES.md) or API note: which fields/states count; `delivered` effect explicit yes/no

---

## NOW — Dashboard: No invoice / No vehicles

- [ ] `T-NIV-001` New dashboard sub-tab (near MoneyFlow / Procurement / ServiceBoard) for purchases without invoice + without vehicle
- [ ] `T-NIV-002` API: filters or light endpoints; staff responses without customer PII
- [ ] `T-NIV-003` UI: counts, table/cards, deep-link to purchase; E2E smoke with fixtures

---

## NOW — Staff vehicle-only access

- [ ] `T-STF-001` Staff sees full `Vehicle` registry + repair history (not only assigned customers’ vehicles)
- [ ] `T-STF-002` Strip customer PII from API + UI on staff paths (name, phone, email, …)
- [ ] `T-STF-003` Keep staff on vehicle-centric surfaces only; no customer identity workflows

---

## NOW — CMR / field app

- [ ] `T-CMR-001` API contract: CMR service create/update always sends price; map to `Service.price` (or line-item model)
- [ ] `T-CMR-002` Ensure CMR-created services appear in Django admin same registry as web `Service` (no shadow tables)
- [ ] `T-CMR-003` Remove photo upload from CMR client paths (UI + API calls)

---

## NOW — Registers UX polish (admin)

- [ ] `T-REG-001` Empty states: no UoM / no services / no customers — copy + CTA
- [ ] `T-REG-002` Inline Services + Customer modals: error handling, loading, retry/rollback UX
- [ ] `T-REG-003` Visual consistency with Purchases/Vehicles/Repairs (density, headers, breakpoints)
- [ ] `T-REG-004` Mobile/narrow: Registers tabs, horizontal scroll, primary actions always reachable
- [ ] `T-REG-005` Destructive actions: confirm dialogs + consequence copy (UoM delete, service deactivate, …)
- [ ] `T-REG-006` a11y: modal focus, tab order in inline fields, aria on tabs/search (match app patterns)
- [ ] `T-REG-007` EN-only sweep for Registers strings; align terms with [`DOMAIN_RULES.md`](./DOMAIN_RULES.md)
- [ ] `T-REG-008` Context tooltips/help (UoM purpose, Active vs inactive catalog semantics)

---

## NOW — Dashboard: masters + consumables

- [ ] `T-DSH-001` Link MoneyFlow ↔ ServiceBoard for master filter / drill / shared query state (UX spec + data boundaries snapshot vs live)
- [x] `T-DSH-002` Shop consumables baseline: `is_shop_consumable`, PDF/snapshot exclusion, API `shop_consumables`, Consumables tabs (polish follow-ups only if filed)

---

## NOW — Purchases / invoices / suppliers

- [x] `T-PUR-001` `POST /api/purchases/bulk/` multi-line purchases
- [ ] `T-PUR-002` Optional invoice header + lines entity if reporting needs it (migration plan)
- [ ] `T-PUR-003` OCR / scan capture: line extraction + supplier + human confirm before DB write (engine TBD)
- [ ] `T-PUR-004` Supplier PO flow + supplier registry UX (extend `Supplier`)

---

## NEXT (scheduled after NOW themes)

- [ ] `T-NXT-001` Monthly history on snapshot-backed data (filters: customer, vehicle, period)
- [ ] `T-NXT-002` Supplier reporting on same financial basis as PDF/dashboard
- [ ] `T-NXT-003` Completion “act” finalization: same PDF pipeline vs separate document flow — decide + implement
- [ ] `T-NXT-004` Vehicle card: real repair + document history
- [ ] `T-NXT-005` Customer card: real visit + completed repair history
- [x] `T-NXT-006` Minimal admin dashboard E2E visit (`admin-dashboard-visit.spec.ts`)
- [x] `T-NXT-007` Registers E2E desktop+mobile
- [ ] `T-NXT-008` E2E: assert `/analytics/dashboard/` load + KPIs (post-fixtures)
- [ ] `T-NXT-009` E2E: MoneyFlow purchase summary + No invoice/No vehicles tab + consumables asserts as needed
- [ ] `T-NXT-010` E2E: QuickFocus `search vehicle → create vehicle → create customer → create repair`
- [ ] `T-NXT-011` E2E + tests: admin user revocation flow
- [ ] `T-NXT-012` E2E: service board calendar (today, waiting parts, legend, period switch)
- [ ] `T-NXT-013` Tests: moneyflow default range behaviors
- [ ] `T-NXT-014` Tests/E2E: staff access model (all vehicles, no PII)

---

## LATER

- [ ] `T-LAT-001` Durable photo storage for repair UI (MinIO vs S3-compatible)
- [ ] `T-LAT-002` Observability, auditing, runbooks for documents/analytics
- [ ] `T-LAT-003` Payments, discounts, tax, inventory, notifications — if roadmap accepts
- [ ] `T-LAT-004` Backfill PDF/snapshot for old completed repairs if product requires history
- [ ] `T-LAT-005` CodeQL: remove `exclude js/xss-through-dom`; use `fetch → blob → createObjectURL` for repair images (break taint chain)

---

## Allure / report tree (non-blocking)

- [ ] `T-ALL-001` Environment allowlist for Allure `environment.properties` (no secrets)
- [ ] `T-ALL-002` Behaviors tree parity with `allure.config.mjs` groupBy + epic/feature/story table in plan
- [ ] `T-ALL-003` Playwright trace attachments + CI `retain-on-failure` policy; optional HTML report in Actions
- [ ] `T-ALL-004` Merge Playwright into unified Allure report with Vitest/pytest

---

## Localization / EN-only product surface

- [ ] `T-I18-001` Repository-wide sweep: production UI + public API errors + PDF templates → EN-only; align glossary with [`DOMAIN_RULES.md`](./DOMAIN_RULES.md) post-translation

---

## Cross-cutting: SDD hygiene

- [ ] `T-SDD-001` Team convention: who marks `TASKS.md` done and when (PR vs release train) — document in `SDD_WORKFLOW.md` once decided
