# Product specification (active)

**Owner roles:** planner + architect for updates.  
**Last aligned from plan snapshot:** 2026-04-19 (see `docs/planning/archive/DEVELOPMENT_PLAN_20260419.md`).

## 1. Product goal

Build a durable **car-service-platform** that covers the operational repair loop **and** post-repair analytics: final documents, financial slices, and historical reporting.

Core capabilities:

- Customer and vehicle registry
- Repair lifecycle with tracking code for customer status checks
- Labor, parts, purchases, suppliers, services
- Completion documents and **versioned PDF** export for completed repairs
- **Financial snapshots** tied to PDF versions as the analytics source of truth
- Analyst dashboard (MoneyFlow, Procurement, ServiceBoard, Consumables) with snapshot-backed blocks where required

## 2. Current baseline (summary)

- Django REST backend + React frontend; Docker-based dev; CI with backend tests + frontend unit + Playwright E2E.
- CRUD for core entities; role model `admin` / `staff` with API scoping.
- M3 slice delivered: `RepairDocument` + `RepairFinancialSnapshot`, PDF persist, dashboard read-only aggregates, Registers (admin) functional + E2E, bulk purchases, shop consumables flag excluded from completion PDF/snapshot.
- **Not done:** many M3 acceptance themes (calendar, staff PII-safe vehicle registry, QuickFocus inline create, admin revoke, MoneyFlow purchase summary relocation, No invoice / No vehicles dashboard tab, EN-only sweep, CMR parity, etc.) — see `TASKS.md`.

## 3. MVP scope (themes)

1. **Operations** — repairs, notes, purchases, services, vehicle history.
2. **Documents** — completion PDF + stored snapshot per export version.
3. **Analytics** — dashboard from snapshots + live preview rules per [`DOMAIN_RULES.md`](./DOMAIN_RULES.md).
4. **QuickFocus / VPR** — inline `Vehicle` and `Customer` creation without leaving flow, same validation as registry screens.
5. **Admin user management** — revoke/delete/deactivate staff with explicit model decision.
6. **Service board** — large operational calendar from “today”, status visualization + legend.
7. **MoneyFlow defaults** — each visit: `StartDate = today - 30d`, `EndDate = today` (rolling, not sticky).
8. **Staff access** — global vehicle + repair visibility; **no** customer PII in API/UI.
9. **English-only** product UI and public API validation copy (engineering docs follow same rule).
10. **CMR alignment** — service price on sync; CMR-created services visible in Django admin; no photo upload in CMR.
11. **Dashboard cohesion** — master drill-down / navigation between MoneyFlow and ServiceBoard (UX TBD).
12. **Purchases depth** — OCR / PO / supplier registry UI (beyond bulk lines baseline).

## 4. Active milestone

**M3 — PDF-backed reporting and analyst dashboard** (in progress).  
**M4** — deferred media (S3/MinIO), extended reporting, deeper invoicing — see `TASKS.md` LATER and OPEN_QUESTIONS.

## 5. Companion track: E2E / CI reliability

Non-functional requirement: Playwright must be deterministic (`retries: 0`), health-gated CI, PDF fixtures stable, dashboard asserts meaningful — see `docs/testing/playwright-e2e-framework.md`.

## 6. Acceptance themes (M3 completion)

Work is **not** claimed “M3 done” until the themes in root `AGENTS.md` / domain rules are satisfied **and** the corresponding rows in `docs/spec/TASKS.md` are checked off (or explicitly deferred with a decision in `OPEN_QUESTIONS.md`).

High-signal items:

- Completed repair: view latest PDF + export new version (guarded by status).
- Snapshots drive “by act” dashboard blocks; live blocks follow documented rules.
- Historical “as-of version” UX: specified or explicitly deferred.
- QuickFocus inline vehicle + customer.
- Admin staff offboarding flow decided and implemented.
- Service board calendar + legend.
- MoneyFlow default range behavior + tests.
- Staff vehicle-only model without PII leakage.
- MoneyFlow purchase summary (buy/sale/margin) + dashboard “No invoice / No vehicles” operational tab.
- EN-only surfaces (ongoing sweep).

## 7. Constraints

- Do not use PDF as the only store for analytics numbers; normalized snapshots in DB are mandatory.
- Do not build “historical truth” from mutable repair rows alone post-export.
- No full ERP scope (warehouse, complex payments) without a separate decision.

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
| Agent session bootstrap | `docs/dev/agent-session-bootstrap.md`, root `AGENTS.md` |
