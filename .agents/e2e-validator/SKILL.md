---
name: e2e-validator
description: Validate UI and critical flows with Playwright; on failure fix code/tests and add minimal unit tests for regression.
---

# e2e-validator (car-service-platform)

## When to run

- Pages, forms, navigation, or PDF/dashboard/repairs actions changed.
- The user asked for E2E explicitly, or `scope: full` with a UI trigger from `AGENTS.md`.

## Required context

- `docs/testing/playwright-e2e-framework.md` — no-retries policy, layers, seeds, CI health gate.
- `.agents/e2e-testing/SKILL.md` — POM, wait patterns, CI/reporting reference (respect project overrides table first).
- `frontend/playwright.config.ts` (`globalSetup`), `frontend/e2e/global-setup.ts`, `frontend/e2e/`.
- `docs/spec/DOMAIN_RULES.md` — if the scenario touches repair status, PDF, snapshot, admin/staff roles.
- CI: `e2e` job in `.github/workflows/pr.yml`.

## Process

1. Locally: start the stack (`docker compose` / `scripts/`), `cd frontend && npx playwright test` (or grep a single spec).
2. On failure: open trace from `test-results` / Allure; localize (timing, selector, data, API).
3. Prefer **product stabilization** (explicit loading states, stable `data-testid` where needed) over `sleep`.
4. Update Python seeds + `e2e-seed.ts` if data keys change.
5. Do not enable retries in `playwright.config.ts` to hide flakes.

## Role output

Use the root `AGENTS.md` format: Assumptions, Decisions, Output, Risks.

## Risks

- E2E without `/api/health` readiness causes false failures — see the framework doc (global setup / CI poll).
