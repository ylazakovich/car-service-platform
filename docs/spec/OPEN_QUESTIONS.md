# Open questions (needs owner input)

Items here block **spec completeness** or **safe implementation**. Agents must surface them in `Assumptions` / `Risks` until resolved. Questions that are no longer M3 blockers are marked as deferred instead of left in the active blocker list.

## Active M3 blockers

1. **Staff offboarding model** — Use deactivate-only, delete-only, or both? Recommended product default: deactivate to close access while preserving historical authorship/assignment; hard delete only for never-used mistaken accounts.
2. **Staff API shape / PII masking** — Separate staff-safe serializers/endpoints vs role-aware masking on existing payloads? Current code still exposes vehicle `customer.full_name` and filters staff vehicles by assigned customer, so this remains a real blocker for `T-STF-*`.
3. **Historical dashboard “as-of” UX** — Exact UX for picking snapshot version vs date range. Current dashboard has date ranges and snapshot-backed totals, but not an explicit “as-of version” selector.
4. **Dashboard purchase/no-invoice/no-vehicle placement** — Warehouse already has invoice coverage split; decide whether M3 still needs a dedicated “No invoice / No vehicles” tab or whether the remaining no-vehicle operational view moves to M4.
5. **Supplier / monthly reports aggregation path** — Use the existing dashboard aggregation path as the single source or introduce separate report code with drift risk?
6. **Manual snapshot corrections** — Should staff/admin edit persisted financial snapshot rows after export? If yes, who and with what audit?
7. **“Other costs” modeling** — Separate entity vs generic line items vs extending purchases/services only?
8. **MoneyFlow purchase summary semantics** — If purchase summary moves into MoneyFlow, which fields/states count and does `delivered` affect buy/sale/margin?
9. **Definition of “validation passed” for UI/domain tasks** — CI green on PR only vs mandatory local focused Vitest/API/E2E subset per epic.

## Deferred / M4+ decisions

10. **QuickFocus UI strategy** — Dedicated mini-wizard vs reuse existing customer/vehicle modals only. Deferred from M3 closeout unless explicitly pulled forward.
11. **VIN decode provider** — VPIC API (US/free) vs EU-focused provider such as carVertical/Autorigin. Deferred from M3 closeout.
12. **OCR pipeline** — In-house vs vendor; allowed inputs (PDF/scans); retention of raw scans. Deferred from M3 closeout; baseline invoice evidence exists without full OCR workflow.
13. **PDF/document storage** — Railway volume now vs S3-compatible/cloud object storage for `RepairDocument` and future generated documents. M4 hardening unless production risk requires earlier action.
14. **Invoice header entity** — Stay flat `Purchase` vs introduce header+lines for reporting/versioning. M4 unless reporting drift or invoice UX forces it earlier.
15. **Multi-problem repairs** — Can one repair represent multiple unrelated problems, or should problems become structured child records? M4 unless shop workflow requires it.
16. **Shop consumables evolution** — Flag-only baseline is done; decide later whether it needs a separate entity/workflow.
17. **Breakpoint canonicalization** — Migrate all per-feature deviations to canonical values (820/1023/1080px + coarse-pointer) or keep some feature-specific breakpoints.
18. **Mobile component duplication policy** — Define when new features need separate mobile/desktop React trees vs CSS-only responsiveness.
19. **Mobile E2E coverage policy** — Define which E2E stories require both `@desktop` and `@mobile` variants.

## Resolved / no longer open

- **Service board calendar** — Resolved: separate calendar scope cancelled; `TodaySummary` + ServiceBoard cover operational “what is happening now”.
- **MoneyFlow date picker** — Resolved: default on fresh dashboard entry is `today - 30d` → `today`; user may change dates freely during the current visit; fresh entries reset instead of persisting old dates.
- **Staff + Customers tab** — Resolved product direction: staff surface is vehicle-centric. Hide customer identity workflows from staff; expose vehicle/repair history without customer PII.
- **Client payments / parts inventory / maintenance reminders** — Explicitly outside MVP/M3. Keep as roadmap/non-goals unless user pulls them into a later milestone.
- **Portal / client-facing scope** — Portal exists as tracking-code repair status, not a full client account/cabinet. Remaining branding/EN-only work belongs to `T-I18-001` or a portal-specific follow-up if filed.
- **Who updates `TASKS.md`** — Resolved: same change set as implementation unless user directs otherwise; documented in `TASKS.md` and `SDD_WORKFLOW.md`.
- **ID stability** — Resolved: `T-*` IDs are stable and must not be renumbered when reordering; cancelled tasks stay traceable in the cancelled section.

When an active item is answered, either remove it from the active list and move the decision to [`DOMAIN_RULES.md`](./DOMAIN_RULES.md) / [`PRODUCT.md`](./PRODUCT.md), or leave a short resolved note here if it prevents future ambiguity.
