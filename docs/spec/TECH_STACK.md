# TECH_STACK

Technical baseline for `car-service-platform`.

- Last updated: `2026-06-02`
- Status: `current implemented stack + M3/M4 guardrails`

## 1) Current Stack

### Backend

- `Python 3.12` target runtime for Django 6 compatibility.
- `Django >=6,<6.1`.
- `Django REST Framework >=3.17,<3.18`.
- `django-cors-headers`.
- `psycopg[binary]`.
- `Gunicorn`.
- `Whitenoise` for static assets.
- `ReportLab` + `pypdf` for completion PDF generation/handling.
- `pytesseract`, `pdf2image`, `Pillow` for invoice/OCR experiments and parsing helpers.
- `sentry-sdk[django]` for monitoring hooks.
- `django-unfold` for Django Admin styling/UX.

### Frontend

- `React 19`.
- `TypeScript 6`.
- `Vite 8`.
- `React Router 7`.
- `Axios`.
- `@sentry/react` + Sentry Vite plugin.
- `@e965/xlsx` for spreadsheet/XLSX handling.
- `Vitest` + Testing Library + jsdom.
- `Playwright 1.60` for App and Django Admin E2E.
- `allure-vitest` + `allure-playwright` for report publishing.

### Database

- `PostgreSQL 18` in current Docker Compose pin.
- Railway PostgreSQL for hosted deployment.

### Data/demo generator

- `tools/datafaker-generator/` Gradle project.
- Java 21 toolchain for current dependency/checkstyle compatibility.
- Datafaker demo generation is part of PR/main CI checks.

### Infrastructure

- Docker Compose for local/dev/prod-like bootstrap.
- Nginx in the frontend container, proxying `/api/` and `/media/`.
- Railway deployment documented in [`RAILWAY_DEPLOY.md`](./RAILWAY_DEPLOY.md).
- Backend media volume currently persists generated documents; S3-compatible object storage remains M4 hardening unless production risk requires earlier migration.

### CI / Quality

- PR Pipeline: Datafaker checks, frontend build/Vitest, focused client portal status suite, backend migrations/pytest, Playwright App/Admin E2E, CodeQL.
- Test Report workflow: collects artifacts, merges Allure/JUnit, publishes per-PR report, mirrors source pipeline conclusion.
- Test Pyramid Snapshot workflow: scheduled/manual rolling PR for latest test-pyramid docs and advisory gates.
- Release Please: tags/releases only; PR titles must be Conventional Commit compatible.
- Renovate: npm, Python, Gradle, Docker, GitHub Actions and custom regex managers.

## 2) Architecture Shape

1. `backend/`
   - Django monolith.
   - REST API for staff UI, admin helpers, analytics, portal tracking, documents, purchases.
   - Django Admin for operational/admin maintenance, not the primary staff work surface.

2. `frontend/`
   - One React application.
   - Separate routes/surfaces for staff app, admin-ish in-app management, invite acceptance, and client tracking portal.

3. `db/`
   - PostgreSQL as the source of truth for mutable operational data and persisted financial snapshots.

4. `media/documents`
   - Current baseline: backend media volume / Railway volume for generated documents.
   - M4 hardening: S3-compatible storage with migration, lifecycle, backup, and rollback policy.

## 3) Access Model

Do not build one universal UI for all roles. Use separate product surfaces.

### A. Django Admin (`/admin/`)

For:

- superuser/admin maintenance;
- technical model inspection;
- records that need controlled manual correction;
- operational debugging.

Do not use it as the primary staff interface.

### B. Staff App (`/app/*`)

For internal users:

- dashboard;
- vehicles;
- repairs;
- purchases;
- registers;
- documents/status operations.

Staff product direction: vehicle-centric. Staff must not receive customer identity/contact fields in staff-safe vehicle/repair APIs.

### C. Client Portal / Public Tracking (`/track/*`)

For customers:

- repair status by tracking code;
- limited scoped repair data;
- document/status visibility only when allowed by product rules;
- no general client account/cabinet in MVP.

## 4) Authentication Strategy

### Staff/Admin

- Email/password login.
- Session/cookie-based auth in current app shape.
- Admin can invite/reset staff; staff offboarding model is still an active M3 blocker.
- Staff/admin do not authenticate through public tracking flow.

### Clients

- Access by unique repair tracking code/token.
- No sequential repair ID as the only public identifier.
- Access is scoped to one repair/document context.

## 5) Test Stack

- Frontend unit/component: `Vitest` + Testing Library.
- Focused portal status suite: `npm run test:portal-status`.
- Backend: Django tests/pytest with JUnit + Allure results in CI.
- E2E: Playwright against full Docker Compose; App/Admin suite split via `PLAYWRIGHT_E2E_SUITE`.
- Reporting: Allure/JUnit artifacts and per-PR report comments.
- Test pyramid policy: advisory only; meaningful behavior coverage beats percentage gaming.

## 6) Why This Stack

- Django covers admin, ORM, auth, permissions and fast iteration for a small internal product.
- DRF gives predictable APIs for the React UI and client portal.
- React + Vite keeps staff UI iteration fast and compatible with existing project conventions.
- PostgreSQL is sufficient and simple for the current operational/analytics workload.
- Docker Compose and Railway keep deployment understandable without microservices.
- Allure/JUnit/Playwright give enough observability for agent-driven and human-driven PR review.

## 7) Deferred Infrastructure

Add only when a real requirement appears:

- `Redis` for background jobs, rate limiting, notifications.
- `Celery` / Django Q / another job runner for async OCR, notifications, or heavyweight document processing.
- S3-compatible object storage migration for generated documents.
- Dedicated warehouse/inventory system.
- Payment/tax/discount engine.
- GraphQL, event bus, Elasticsearch, microservices.

## 8) Source Of Truth

- Product strategy: [`PRODUCT.md`](./PRODUCT.md)
- Execution backlog: [`TASKS.md`](./TASKS.md)
- Domain rules: [`DOMAIN_RULES.md`](./DOMAIN_RULES.md)
- Technical baseline: this file ([`TECH_STACK.md`](./TECH_STACK.md))
- Run / dev / prod / LAN: [`RUNBOOK.md`](./RUNBOOK.md)
- Deployment: [`RAILWAY_DEPLOY.md`](./RAILWAY_DEPLOY.md)
- E2E: `docs/testing/playwright-e2e-framework.md`
- IDE / AI agents (outside product spec): `AGENTS.md`, `docs/dev/agent-session-bootstrap.md`, `docs/dev/agents-and-mcp.md`, `docs/dev/mcp-deduplication.md`
