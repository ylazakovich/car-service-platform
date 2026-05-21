# Open questions (needs owner input)

Items here block **spec completeness** or **safe implementation**. Agents must surface them in `Assumptions` / `Risks` until resolved.

## Product / domain

1. **Manual snapshot corrections** — Should staff/admin edit persisted financial snapshot rows after export? If yes, who and with what audit?
2. **“Other costs” modeling** — Separate entity vs generic line items vs extending purchases/services only?
3. **QuickFocus UI strategy** — Dedicated mini-wizard vs reuse existing customer/vehicle modals only?
4. **Staff offboarding** — Hard delete vs deactivate vs both; what happens to `Customer.assigned_to`, repairs, audit trail?
5. **Service board calendar** — Time scale (month / 2 weeks / rolling); mapping repairs to days (created vs planned span vs completed); visualization (markers vs spans vs lanes).
6. **MoneyFlow date picker** — After first paint with default `today-30`→`today`, may the user change dates freely? Any “reset to default” control?
7. **Staff + customers** — Hide Customers tab entirely vs anonymized read-only?
8. **Staff API shape** — Separate serializer/viewset vs role-aware masking on existing vehicle payloads?
9. **Multi-problem repairs** — Can one repair represent multiple unrelated problems (product split)?
10. **Client payments** — In scope for MVP or explicitly later?
11. **Parts inventory** — Stock/inventory layer or stays purchase-line-only?
12. **Maintenance reminders** — Notifications / scheduled comms in roadmap?
13. **OCR pipeline** — In-house vs vendor; allowed inputs (photo vs PDF); retention of raw scans.
14. **Shop consumables evolution** — Flag-only baseline done; any future separate entity?

## Technical / platform

15. **Media + PDF storage** — MinIO self-hosted vs cloud S3-compatible for `RepairDocument` and future photos (M4).
16. **Historical dashboard “as-of”** — Exact UX for picking snapshot version vs date range (partially implemented range only).
17. **Supplier / monthly reports** — Single aggregation code path vs risk of drift between reports.
18. **Invoice header entity** — Stay flat `Purchase` vs introduce header+lines for reporting/versioning.

## SDD × process (meta — you partially answered by adopting this folder)

19. **Who updates `TASKS.md`?** — Same PR as code vs batch edits at end of sprint (team convention).
20. **ID stability** — `T-*` IDs are stable; do not renumber when reordering — mark cancelled tasks as `[cancelled]` with a note instead.

## UI / Responsive

24. **Breakpoint canonicalization** — The CSS audit found 10+ different `max-width` values in use. Should all per-feature deviations be migrated to the 4 canonical values (820/1023/1080px + coarse-pointer), or are some intentionally feature-specific (e.g. `max-width: 420px` for VIN copy button text)?
25. **Mobile component duplication policy** — Currently mobile and desktop render entirely different React component trees (`features/staff/mobile/` vs `features/staff/web/`). As the app grows, should new features always ship both desktop and mobile components? Or should some features be CSS-only responsive? Define the threshold and document it in `UI_RESPONSIVE.md`.
26. **Mobile E2E coverage gap** — The `repair-make-act-updates-vehicle-panel.spec.ts` E2E test is `@desktop` only. The mobile equivalent (`StaffVehicleMobileDetail`) renders the act total differently (inline card, not a table cell). Should a `@mobile` variant of this test be added? What is the policy for which E2E tests require both `@mobile` and `@desktop` variants?

## Not closed in your message (gaps)

21. **Priority order among NOW epics** — You did not restack Figma vs M3 functional gaps vs E2E hardening; default remains order in `TASKS.md` until you say otherwise.
22. **Definition of “validation passed” for agents** — CI green on PR only vs mandatory local Playwright subset for UI tasks (recommend: document per-epic in `TASKS.md` notes column — optional follow-up).
23. **Portal / client-facing scope** — Portal exists; English-only and branding for client portal not fully enumerated in old plans.

When you answer any item, either remove it from this file (if fully decided) or move the decision to [`DOMAIN_RULES.md`](./DOMAIN_RULES.md) / [`PRODUCT.md`](./PRODUCT.md) and leave a short “Resolved YYYY-MM-DD: …” note in archive or git history.
