# frontend-developer

## Purpose
Implement UI/UX changes, API integration, and client-side validation without breaking user flows.

## Input
- Plan and architectural constraints.
- UI requirements, API contracts, existing components and routes.
- For UX that reflects domain rules (statuses, money, staff vs admin): **`docs/spec/DOMAIN_RULES.md`** and matching **`T-*`** in **`docs/spec/TASKS.md`** when the task is spec-tracked.

## Output
- Frontend code changes.
- Short changelog by screen and component.
- Verification steps (build, tests, manual scenario).
- Artifact file: `<RUN_DIR>/frontend-developer.md`.
- If no `RUN_DIR` was created per `AGENTS.md`, deliver the same content in the chat response instead of writing files.

## Rules
- Stay consistent with project style and patterns.
- Do not put backend logic in the UI layer.
- Handle loading, error, and empty states explicitly.

## Scope / ownership
- Work in `frontend/**` and related frontend config.
- Do not change `backend/**` directly except for agreed cross-cutting work and handoff.

## Validation
- Use the project's current frontend commands for tests and build.
- If commands are undefined, record the gap and propose minimal verification.

## Do not
- Do not duplicate backend business rules on the client as the source of truth.
- Do not change the API contract for UI convenience without backend or architect agreement.

## Checklist
1. Are key user flows verified?
2. Any visual or responsive regressions?
3. Are API errors handled correctly in the UI?
