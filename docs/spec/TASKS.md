# Task backlog (spec) — stable IDs

Current grouping: **NOW = M3 closeout only**. Deferred items keep their stable IDs and move to NEXT/LATER instead of being renumbered.

Use **`T-<AREA>-<nnn>`** when asking for a batch.

Update checkboxes in the **same change set** as the implementation unless the user directs otherwise.

---

## NOW — M3 closeout: E2E / Playwright / CI

- [x] `T-E2E-001` Target framework documented: `docs/testing/playwright-e2e-framework.md`
- [x] `T-E2E-002` `retries: 0` in Playwright config
- [x] `T-E2E-003` Restore `.agents/e2e-validator/SKILL.md`
- [x] `T-E2E-004` CI: wait for `GET /api/health` same origin before Playwright
- [x] `T-E2E-005` `frontend/e2e/global-setup.ts` health poll
- [ ] `T-E2E-006` Deterministic PDF E2E seed: initial state for “View PDF without extra POST” (isolated API fixture / Datafaker profile / Django seed command)
- [ ] `T-E2E-007` Dashboard E2E: assert KPI/widget text beyond headings (fixture-backed)
- [x] `T-E2E-008` Registers E2E admin: `staff-registers.spec.ts`, POM, `e2e-seed.ts`
- [x] `T-E2E-009` `vite preview` proxy `/api` and `/media` for `:4173`
- [x] `T-E2E-010` Document MCP set: `docs/dev/agents-and-mcp.md`

---

## NOW — M3 closeout: PDF + financial snapshot

- [x] `T-PDF-001` Completed repair: View PDF + Export new version + API GET/POST semantics
- [x] `T-PDF-002` Models `RepairDocument` + `RepairFinancialSnapshot`; `financial_totals` single source
- [x] `T-PDF-003` Wire snapshots to `GET /api/analytics/dashboard/` + MoneyFlow/Procurement/ServiceBoard UI
- [ ] `T-PDF-004` Design UX for historical analytics: period vs active snapshot version; no silent back-calculation
- [ ] `T-PDF-005` Align supplier/monthly analytics SOT with snapshot layer (no drift)
- [ ] `T-PDF-006` End-to-end story: export → dashboard totals → historical lookup (close gaps vs partial today)
- [ ] `T-PDF-007` Move `RepairDocument` binaries to S3-compatible storage; migration; `GET …/pdf/` + export upload; backup/lifecycle policy — **M4 unless production risk pulls it forward**

---

## NEXT — QuickFocus / VPR (deferred from M3 closeout)

- [ ] `T-QF-001` Inline create `Vehicle` when missing in QuickFocus / new VPR flow
- [ ] `T-QF-002` Inline create `Customer` when missing for new `Vehicle` (same fields/rules as Vehicle page)
- [ ] `T-QF-003` Unify/reuse customer+vehicle creation logic vs registry modals (no divergent validation)

---

## NOW — M3 closeout: Admin user management

- [ ] `T-USR-001` Admin Users UI: close access for `staff` (offboarding)
- [ ] `T-USR-002` Decide and implement revocation model: delete vs deactivate vs both + related data rules
- [ ] `T-USR-003` Backend + UI confirmation guards (prevent wrong user deletion)

---

## NOW — M3 closeout: Dashboard MoneyFlow default range

- [x] `T-MFD-001` On Dashboard entry: MoneyFlow range = last 30 days → today (local); reset on revisit
- [ ] `T-MFD-002` Tests (e2e/unit): leave tab → return → rolling 30d again
- [ ] `T-MFD-003` Timezone / date math tests for `today` / `-30d` (off-by-one)

---

## NOW — M3 closeout: Dashboard purchase summary placement

- [ ] `T-MFS-001` Decide final placement for purchase metrics already partly exposed in Warehouse/Consumables: MoneyFlow panel vs Warehouse vs M4 follow-up
- [ ] `T-MFS-002` If MoneyFlow remains target, add/confirm server-side aggregate; do not tie metrics to client purchase pagination
- [ ] `T-MFS-003` Document in [`DOMAIN_RULES.md`](./DOMAIN_RULES.md) or API note: which fields/states count; `delivered` effect explicit yes/no

---

## NOW — M3 closeout: Dashboard No invoice / No vehicles decision

- [ ] `T-NIV-001` Decide whether dedicated tab is still needed now that Warehouse has invoice coverage split; remaining gap is no-vehicle operational triage
- [ ] `T-NIV-002` API: filters or light endpoints; staff responses without customer PII
- [ ] `T-NIV-003` UI: counts, table/cards, deep-link to purchase; E2E smoke with fixtures

---

## NOW — M3 closeout: Staff vehicle-only access

- [ ] `T-STF-001` Staff sees full `Vehicle` registry + repair history (not only assigned customers’ vehicles)
- [ ] `T-STF-002` Strip customer PII from API + UI on staff paths (name, phone, email, …)
- [ ] `T-STF-003` Keep staff on vehicle-centric surfaces only; no customer identity workflows

---

## NEXT — CMR / field app (deferred from M3 closeout)

- [ ] `T-CMR-001` API contract: CMR service create/update always sends price; map to `Service.price` (or line-item model)
- [ ] `T-CMR-002` Ensure CMR-created services appear in Django admin same registry as web `Service` (no shadow tables)

---

## NEXT — Registers UX polish (admin, deferred from M3 closeout)

- [ ] `T-REG-001` Empty states: no UoM / no services / no customers — copy + CTA
- [ ] `T-REG-002` Inline Services + Customer modals: error handling, loading, retry/rollback UX
- [ ] `T-REG-003` Visual consistency with Purchases/Vehicles/Repairs (density, headers, breakpoints)
- [ ] `T-REG-004` Mobile/narrow: Registers tabs, horizontal scroll, primary actions always reachable
- [ ] `T-REG-005` Destructive actions: confirm dialogs + consequence copy (UoM delete, service deactivate, …)
- [ ] `T-REG-006` a11y: modal focus, tab order in inline fields, aria on tabs/search (match app patterns)
- [ ] `T-REG-007` EN-only sweep for Registers strings; align terms with [`DOMAIN_RULES.md`](./DOMAIN_RULES.md)
- [ ] `T-REG-008` Context tooltips/help (UoM purpose, Active vs inactive catalog semantics)

---

## NEXT — Design system & UI/UX consolidation

Sourced from a code-driven audit of `frontend/src/styles.css` (11 423 lines) +
`frontend/src/App.tsx`. Each task is independent and can ship as a standalone PR.
Full visual rationale + before/after demos: `design-system/fixes.html` (in the
design-system project).

- [x] `T-DSY-001` Canonical status color mapping — drop the second mapping in `.status-btn-active.repair-status-*` / `.status-btn.repair-status-*` (`styles.css` L 8765–8786); keep the kanban-chip mapping as the single source: `new=info`, `in_progress=warning`, `waiting_parts=danger`, `completed=success`. Brand `--accent` stops being a status color.
- [x] `T-DSY-002` Global `:focus-visible` ring for the core interactive primitives (`.button`, `.button-secondary`, `.button-ghost`, `.button-danger`, `.text-action`, `.nav-link`, `.subnav-tab`, `.kanban-card`, `.kanban-date-chip`, `.repair-status-chip`). Implementation: single `:where(...)` block with zero specificity using existing `--accent` + `--accent-glow` tokens; existing per-component `:focus-visible` overrides (purchase rows, dropzones, mobile fab) keep working.
- [x] `T-DSY-003` Kanban card information hierarchy — 3-tier layout: **plate** (Plex Mono, 0.98rem, primary anchor) → **model/year/mileage** (context) → **service** (0.88rem semibold, scan target). Issue notes clamp to 1 line + `title` tooltip. Master row replaced with avatar (deterministic tint) + tabular-nums time. Files: `styles.css` L 8410–8500, `StaffRepairsKanban.tsx` L 105–165. **Backend dependency:** see `T-DSY-003-BE`.
- [x] `T-DSY-003-BE` Backend: split `repair.vehicle_label` into discrete fields on the repair list API: `vehicle_plate`, `vehicle_model`, `vehicle_year`, `mileage`. Required by `T-DSY-003`; client-side parsing acceptable as temporary fallback.
- [x] `T-DSY-004` Touch targets ≥ 44 px for `.kanban-drag-handle`, `.kanban-date-chip`, `.kanban-col-collapse`. Pattern: keep visual size compact via `padding`, extend tap zone via transparent `::before` overlay + negative `margin` compensation. Add `@media (pointer: coarse)` to switch visible elements to 44 px on touch contexts (iPad/phone shop usage).
- [x] `T-DSY-005` Form density scale — introduce `--field-h-compact: 36px`, `--field-h: 44px`, `--field-h-cozy: 48px` as `:root` tokens. Bind global `input, select, textarea { min-height: var(--field-h) }`. Density context via class on form/section wrapper: `.form--compact` / `.form--default` / `.form--cozy`. Remove the hardcoded `2.25rem` override on `input.friendly-date-input`. Follow-up cleanup of ~5 other hardcoded heights (`uom-mobile-input`, `purchases-delivered-field__input`, `invoice-parse-dropzone`, etc.) — non-blocking.
- [x] `T-DSY-006` Sidebar nav icons — redraw 7 icons on 20×20 viewBox with stroke 1.5 (was 16×16 / 1.6); extract `<NavIcon>` helper component; differentiate Vehicles silhouette (side-profile car) from Purchases (cart without body-circles); Registers → clipboard; Repairs → balanced single-stroke wrench. File: `App.tsx` L 51–122.
- [x] `T-DSY-007` Sidebar `Quick Focus` panel → `TodaySummary` — replace marketing copy + duplicate CTA with 3 live counts: open / waiting parts / ready to pickup. `waiting_parts >= 3` rendered in `--danger`. Compact secondary CTA at bottom. **Backend dependency:** see `T-DSY-007-BE`.
- [ ] `T-DSY-007-BE` Backend: `GET /api/repairs/counts/today/` returning `{ open: int, waiting_parts: int, ready: int }`. Define "ready to pickup" semantics in `DOMAIN_RULES.md` — either a 5th explicit status or `completed AND NOT picked_up_at`. Required by `T-DSY-007`; counts can be derived client-side from `useRepairs()` as a temporary fallback.
- [x] `T-DSY-008` Split `styles.css` (11 423 lines) into per-feature partials under `src/styles/`. Use existing `═══`-delimited section markers as the cut boundaries. Two-commit plan: (1) mechanical split preserving source order (cascade-safe); (2) post-split cleanups (media-query relocation, hardcoded-height cleanup from `T-DSY-005`, de-dupe two `repair-modal-*` definitions at L 5605 and L 6610). No `vite.config.ts` changes needed.

### Open questions for `T-DSY-*`

- **Q1 (T-DSY-001):** Is red the correct alarm level for `waiting_parts`? If parts-blocks are routine, introduce a 5th `blocked` status and use orange for `waiting_parts`. Add to [`OPEN_QUESTIONS.md`](./OPEN_QUESTIONS.md) before closing T-DSY-001.
- **Q2 (T-DSY-007):** Keep `TodaySummary` or remove the sidebar panel entirely? Decide with shift-shop floor staff; survey-driven, not designer-driven.
- **Q3 (T-DSY-003 / T-DSY-007):** Are the backend tasks `T-DSY-003-BE` and `T-DSY-007-BE` in scope for the same milestone, or do they slip to NEXT?

---

## NEXT — Dashboard: masters + consumables polish

- [ ] `T-DSH-001` Link MoneyFlow ↔ ServiceBoard for master filter / drill / shared query state (UX spec + data boundaries snapshot vs live)
- [x] `T-DSH-002` Shop consumables baseline: `is_shop_consumable`, PDF/snapshot exclusion, API `shop_consumables`, Consumables tabs (polish follow-ups only if filed)

---

## NEXT — Purchases / invoices / suppliers

- [x] `T-PUR-001` `POST /api/purchases/bulk/` multi-line purchases
- [ ] `T-PUR-002` Optional invoice header + lines entity if reporting needs it (migration plan)
- [ ] `T-PUR-003` OCR / scan capture: line extraction + supplier + human confirm before DB write (engine TBD)
- [ ] `T-PUR-004` Supplier PO flow + supplier registry UX (extend `Supplier`)

---

## NEXT (scheduled after M3 closeout themes)

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
- [ ] `T-NXT-013` Tests: moneyflow default range behaviors
- [ ] `T-NXT-014` Tests/E2E: staff access model (all vehicles, no PII)

---

## LATER

- [ ] `T-VIN-001` Choose VIN decode provider: VPIC API (US, free) or carVertical / Autorigin (EU); document choice in `DOMAIN_RULES.md`
- [ ] `T-VIN-002` Vehicle create/edit form: "Decode VIN" button — auto-fill `make`, `model`, `year`, `color` from provider response
- [ ] `T-VIN-003` Graceful degradation: provider timeout / unknown VIN → show warning, allow manual entry; no blocking of save
- [ ] `T-LAT-002` Observability, auditing, runbooks for documents/analytics
- [ ] `T-LAT-003` Payments, discounts, tax, inventory, notifications — if roadmap accepts
- [ ] `T-LAT-004` Backfill PDF/snapshot for old completed repairs if product requires history

---

## Allure / report tree (non-blocking)

- [ ] `T-ALL-001` Environment allowlist for Allure `environment.properties` (no secrets)
- [ ] `T-ALL-002` Behaviors tree parity with `allure.config.mjs` groupBy + epic/feature/story table in plan
- [ ] `T-ALL-003` Playwright trace attachments + CI `retain-on-failure` policy; optional HTML report in Actions
- [x] `T-ALL-004` Merge Playwright into unified Allure report with Vitest/pytest
- [x] `T-ALL-005` Test pyramid policy + Allure-derived latest snapshot under `docs/testing/latest/` (`docs/testing/test-pyramid.md`, Test Report artifacts/comments, scheduled Test Pyramid Snapshot Refresh rolling PR)

---

## Localization / EN-only product surface

- [ ] `T-I18-001` Repository-wide sweep: production UI + public API errors + PDF templates → EN-only; align glossary with [`DOMAIN_RULES.md`](./DOMAIN_RULES.md) post-translation

---

## Cross-cutting: SDD hygiene

- [x] `T-SDD-001` Team convention: update `TASKS.md` in the same change set as implementation unless the user directs otherwise; documented in `TASKS.md` and `SDD_WORKFLOW.md`

---

## Cancelled / removed from active plan

Product decision: customer rejected repair/CMR photo workflows. Do not enqueue or implement photo upload/storage tasks unless the product decision changes.

- [x] ~~`T-CMR-003` Remove photo upload from CMR client paths (UI + API calls)~~ — cancelled; no photo upload workflow remains in scope.
- [x] ~~`T-LAT-001` Durable photo storage for repair UI (MinIO vs S3-compatible)~~ — cancelled; repair photo storage is out of roadmap.
- [x] ~~`T-LAT-005` CodeQL: remove `exclude js/xss-through-dom`; use `fetch → blob → createObjectURL` for repair images (break taint chain)~~ — cancelled together with repair images/photo upload scope.

Product decision: client-facing design mockup work is no longer part of this backlog; design/prototyping is handled outside this SDD plan.

- [x] ~~`T-FIG-001` … `T-FIG-017` Client-facing design mockup task group~~ — cancelled; removed from active plan.

Product decision: Service Board calendar is no longer needed because `TodaySummary` covers the operational “what is happening now” view.

- [x] ~~`T-CAL-001` … `T-CAL-003` Dashboard: Service Board calendar task group~~ — cancelled; removed from active plan.
- [x] ~~`T-NXT-012` E2E: service board calendar (today, waiting parts, legend, period switch)~~ — cancelled together with the calendar scope.
