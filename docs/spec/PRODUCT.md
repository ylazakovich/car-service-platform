# Product specification (active)

**Owner roles:** planner + architect for updates.  
**Last aligned from code + merged PR history:** 2026-06-02.

## 1. Product goal

Build a durable **car-service-platform** for the operational repair loop, customer-facing repair status, completion documents, and post-repair analytics.

Core capabilities:

- Customer and vehicle registry.
- Repair lifecycle with tracking code and client portal status checks.
- Labor, parts, purchases, suppliers, services, units of measure, and shop consumables.
- Completion documents and **versioned PDF** export for completed repairs.
- **Financial snapshots** tied to PDF versions as the analytics source of truth.
- Staff Operations Dashboard (MoneyFlow, Warehouse, Consumables, ServiceBoard) with snapshot-backed blocks where required.
- Admin-facing user invite/reset workflow; staff offboarding is still an explicit M3 closeout decision.

## 2. Current baseline (summary)

- Django/DRF backend + React/Vite/TypeScript frontend; Docker Compose local/prod-like stack; Railway deployment runbook.
- CI covers backend tests, frontend Vitest suites, focused Client Portal status suite, Playwright App/Admin E2E, Datafaker generator checks, CodeQL, Allure/JUnit report publishing, and advisory test-pyramid gates.
- Delivered M3 baseline: `RepairDocument` + `RepairFinancialSnapshot`, PDF persist, snapshot-backed dashboard aggregates, Registers admin baseline, bulk purchases, shop consumables exclusion from PDF/snapshot, Units of Measure admin, Client Portal redesign, Django admin registrations, Datafaker demo generator.
- Delivered dashboard/product pivots: Service Board calendar is cancelled; `TodaySummary` and ServiceBoard cover operational “now”; Warehouse has invoice coverage split; Consumables has its own dashboard tab.
- **Still not M3-closeout-ready:** staff vehicle-only API without customer PII, admin staff offboarding decision + implementation, historical dashboard “as-of” UX decision, MoneyFlow/default-date tests, dashboard purchase/no-invoice/no-vehicle final placement, and deterministic fixture-backed dashboard/PDF E2E assertions. See `TASKS.md` and `OPEN_QUESTIONS.md`.

## 3. MVP scope (themes)

1. **Operations** — repairs, notes, purchases, services, vehicle history, staff mobile/desktop work surfaces.
2. **Client status** — tracking-code portal for one repair, no general client account.
3. **Documents** — completion PDF + stored snapshot per export version.
4. **Analytics** — dashboard from snapshots + live preview rules per [`DOMAIN_RULES.md`](./DOMAIN_RULES.md).
5. **Admin user management** — invite/reset baseline exists; staff offboarding must preserve history and remove access.
6. **ServiceBoard / TodaySummary** — compact operational view of what is happening now; no separate calendar scope.
7. **MoneyFlow defaults** — each dashboard entry starts with `StartDate = today - 30d`, `EndDate = today`; user may edit dates during the visit; the range is not sticky across fresh entries.
8. **Staff access** — global vehicle + repair visibility; **no** customer PII in staff API/UI.
9. **English-only** product UI and public API validation copy; engineering docs may be mixed while being migrated.
10. **Purchases depth** — bulk purchase lines and invoice evidence baseline exist; invoice header/OCR/PO/supplier deepening is M4 unless explicitly pulled forward.

## 4. Active milestone

**M3 Closeout — PDF-backed reporting + safe staff/admin operations.**

M3 is no longer “all historical backlog items under NOW”. It closes when the product is safe and coherent around:

- PDF/snapshot analytics invariants.
- Staff vehicle-only access without customer PII leakage.
- Admin staff offboarding.
- Dashboard finance gaps that affect daily operation.
- Deterministic, meaningful tests/E2E for those surfaces.

**M4 candidate themes:** QuickFocus inline customer/vehicle creation, VIN decode, OCR/supplier PO flow, S3-compatible document storage migration, deeper invoice/header model, CMR parity, broad Registers polish, mobile/desktop duplication policy.

## 5. Companion track: E2E / CI reliability

Non-functional requirement: Playwright must be deterministic (`retries: 0`), health-gated CI, PDF fixtures stable, dashboard asserts meaningful — see `docs/testing/playwright-e2e-framework.md`.

The test pyramid gate is advisory, not a metric to game. Add unit/API tests when they protect real product behavior; do not add tests only to raise the percentage.

## 6. Acceptance themes (M3 completion)

Work is **not** claimed “M3 done” until the themes below are satisfied **and** the corresponding rows in `docs/spec/TASKS.md` are checked off or explicitly deferred with a documented decision.

High-signal M3 closeout items:

- Completed repair: view latest PDF + export new version; PDF/snapshot invariants are tested.
- Snapshot-backed dashboard blocks do not silently back-calculate historical truth from mutable repair rows.
- Historical “as-of version” UX is specified or intentionally deferred to M4 with a safe current behavior note.
- Staff vehicle registry and repair history are globally visible to staff without customer identity/contacts in API or UI.
- Admin can close staff access without destroying historical authorship/assignment records.
- MoneyFlow default date behavior is covered by unit/API/E2E where meaningful.
- Dashboard purchase/invoice/no-vehicle gaps have a final placement decision: MoneyFlow, Warehouse, a separate tab, or M4 deferral.
- English-only product surfaces are swept for user-facing UI/API/PDF text that ships in M3.

## 7. Constraints

- Do not use PDF as the only store for analytics numbers; normalized snapshots in DB are mandatory.
- Do not build “historical truth” from mutable repair rows alone post-export.
- Do not add repair/CMR photo upload or repair photo storage; the customer rejected the photo workflow.
- Do not treat staff/customer PII masking as a frontend-only concern; the API must be safe.
- No full ERP scope (warehouse stock reservations, payments, tax, complex billing) without a separate decision.

## 8. Source-of-truth map

| Concern | File |
|---------|------|
| Strategy (this doc) | `docs/spec/PRODUCT.md` |
| Execution backlog | `docs/spec/TASKS.md` |
| Open decisions | `docs/spec/OPEN_QUESTIONS.md` |
| Domain calculations / statuses | [`DOMAIN_RULES.md`](./DOMAIN_RULES.md) |
| Stack | [`TECH_STACK.md`](./TECH_STACK.md) |
| Run dev / prod / LAN | [`RUNBOOK.md`](./RUNBOOK.md) |
| E2E target design | `docs/testing/playwright-e2e-framework.md` |
| Agent workflow (not product spec) | Root `AGENTS.md`; optional IDE bootstrap [`../dev/agent-session-bootstrap.md`](../dev/agent-session-bootstrap.md) |
