# Tech quality hardening roadmap

- Last updated: `2026-07-11`
- Status: `proposal / backlog source for quality-focused technical work`

This document records the technology choices that should make `car-service-platform` more reliable and maintainable without turning the current Django/DRF + React monolith into unnecessary platform complexity.

## 1) Decision summary

Prioritize foundations before realtime transport:

1. API contracts and typed frontend clients.
2. Frontend server-state management.
3. Domain/audit event trail.
4. Background jobs for expensive or asynchronous work.
5. Durable document storage.
6. Realtime only where a concrete workflow needs it.

`WebSockets` are not the default next step. They remain useful later for genuinely collaborative staff workflows, but they should follow API/job/event foundations rather than lead the architecture.

## 2) Recommended roadmap

### T-QLT-001 — API contract and generated client types

**Goal:** make backend/frontend integration safer and easier to change.

Recommended technology:

- `drf-spectacular` for OpenAPI schema generation from DRF.
- Generated TypeScript API types/client or a lightweight typed wrapper generated from the schema.
- CI check that schema generation succeeds.

Why it matters here:

- Staff-safe APIs and PII masking must be contract-level guarantees, not only UI conventions.
- Dashboard, PDF/snapshot, purchases, and staff access endpoints already have non-trivial payloads.
- Agents and humans can review OpenAPI diffs when API behavior changes.

Acceptance direction:

- `/api/schema/` and/or a committed schema artifact exists.
- Core staff/public endpoints are represented in schema.
- Frontend uses generated or schema-derived types for new/changed API calls.

### T-QLT-002 — Server-state management in the React staff app

**Goal:** replace ad-hoc fetch/refetch/cache behavior with a predictable data layer.

Recommended technology:

- `@tanstack/react-query` for staff app server-state.
- Keep `axios` as the transport unless the generated client replaces it.

Why it matters here:

- Repairs, purchases, vehicles, registers, and dashboard screens all need consistent loading/error/refetch behavior.
- Mutations such as status changes, repair edits, purchases, and PDF export should invalidate or update related queries intentionally.
- Realtime/polling becomes easier when query invalidation is centralized.

Acceptance direction:

- New feature hooks use React Query.
- Existing high-traffic hooks (`useRepairs`, `usePurchases`, vehicle registry, dashboard) are migrated incrementally.
- Mutation success paths invalidate the right queries.

### T-QLT-003 — Domain/audit event trail

**Goal:** preserve operational history for important changes and staff offboarding.

Recommended technology options:

- Domain-first `ActivityEvent` / `RepairEvent` models for explicit product events.
- Or `django-simple-history` / `django-auditlog` where generic model diffs are enough.

Prefer a domain-first event model for actions that become user-visible history or support compliance/debugging.

Why it matters here:

- Staff offboarding must preserve authorship/assignment history.
- PDF export, snapshot creation, repair status changes, purchase edits, and manual corrections need traceability.
- Audit data is more important to product quality than low-level realtime transport.

Acceptance direction:

- Important state transitions emit durable events with actor, timestamp, entity, and concise payload.
- Offboarded users remain linkable historically without keeping active access.
- Dangerous/manual corrections have visible audit evidence.

### T-QLT-004 — Background jobs for async/heavy work

**Goal:** keep request/response paths fast and reliable for heavyweight operations.

Recommended technology:

- `Redis` plus `Celery`, `RQ`, or Django Q.
- Choose the smallest runner that supports retries, status, and operational visibility.

Natural candidates:

- OCR / invoice parsing.
- Email invites/resets if delivery should be reliable and retryable.
- Heavy PDF generation or batch document export.
- Scheduled cleanup / reporting jobs.

Why it matters here:

- OCR and document processing are already present in the stack direction.
- Job status can later power SSE/WebSocket progress updates.
- Redis should be introduced for a concrete job requirement, not as standalone complexity.

Acceptance direction:

- One concrete async workflow is moved behind a job queue.
- Job status is inspectable by staff/admin or at least logs/metrics.
- Failed jobs are retryable or have a clear operator action.

### T-QLT-005 — S3-compatible document storage

**Goal:** make generated repair documents production-safe.

Recommended technology:

- `django-storages` with S3-compatible storage.
- Private objects with controlled download endpoints or signed URLs.

Why it matters here:

- `RepairDocument` PDFs are business records.
- Railway/local media volume is acceptable for baseline but not ideal as the long-term document store.
- This aligns with existing `T-PDF-007`.

Acceptance direction:

- Existing documents can be migrated or read from both old and new storage during rollout.
- Backup/lifecycle/rollback plan is documented.
- PDF GET/export behavior stays compatible for users.

### T-QLT-006 — Realtime decision: polling/SSE first, WebSockets only when justified

**Goal:** add realtime behavior only where it improves an actual staff workflow.

Recommended staged approach:

1. Use React Query polling/refetch for dashboard and list freshness.
2. Use Server-Sent Events (SSE) for one-way progress/events such as OCR/PDF job status.
3. Use WebSockets only for true multi-user collaboration or bidirectional workflows.

WebSocket candidates if the requirement appears:

- Live repair board updates across multiple staff users.
- Collaborative status movement / assignment updates.
- Push notifications for important operational events.

Costs of WebSockets in this stack:

- `django-channels` and ASGI deployment path.
- Redis channel layer.
- Session/auth handling for WS connections.
- Additional E2E/integration tests and production operational complexity.

Acceptance direction before choosing WebSockets:

- A concrete workflow documents why polling/SSE is insufficient.
- Auth, deployment, and test strategy are part of the implementation plan.
- Realtime messages are derived from durable events/jobs, not ephemeral UI-only state.

### T-QLT-007 — Backend API quality hardening

**Goal:** make API behavior explicit, stable, and performant.

Recommended technology/practices:

- `django-filter` for filter contracts instead of scattered ad-hoc query params.
- Consistent pagination, ordering, and search behavior in DRF.
- Separate staff-safe serializers/endpoints where PII masking matters.
- Database indexes for frequent filters/searches: repair status/date/tracking code, portal token, purchase order date/supplier/repair linkage.

Acceptance direction:

- New list endpoints use documented filters.
- Staff-safe payloads are tested at API level.
- Query-heavy endpoints have targeted index tests or documented query rationale where useful.

### T-QLT-008 — Frontend form and validation consistency

**Goal:** reduce fragile hand-written validation and inconsistent form behavior.

Recommended technology:

- `react-hook-form` plus `zod` or another lightweight schema validator.
- Shared helper for DRF validation errors.

Candidate surfaces:

- Repair create/edit modals.
- Purchases and invoice import confirmation.
- Registers forms.
- Admin user invite/offboarding flows.

Acceptance direction:

- New complex forms use one validation pattern.
- Server validation errors render consistently.
- Tests cover a representative success and validation-failure path.

## 3) Explicit non-goals for now

Do not introduce these unless a separate product/architecture decision pulls them in:

- Microservices.
- GraphQL.
- Elasticsearch.
- Generic event bus.
- Full ERP inventory/payments/tax engine.
- WebSockets as a blanket replacement for normal REST/refetch behavior.

## 4) Suggested sequencing

For M3 closeout, keep quality work narrow and supportive:

1. API contract work that protects staff-safe APIs and dashboard/PDF contracts.
2. Audit/event trail work needed for staff offboarding and PDF/snapshot corrections.
3. Targeted frontend data-layer improvements only when touching a screen anyway.

For M4, pull in the heavier pieces when feature work demands them:

1. React Query migration for core staff screens.
2. Background jobs for OCR/PDF/email workflows.
3. S3-compatible storage for documents.
4. SSE/WebSockets only after durable events/jobs exist and a concrete workflow needs live updates.
