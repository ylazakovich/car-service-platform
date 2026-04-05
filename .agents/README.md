# .agents

Project-local role skills.

## How to use

1. Open the root `AGENTS.md`.
2. Determine the required role order from the workflow in `AGENTS.md`.
3. Run each role’s `SKILL.md` in that order.
4. Hand off to the next role using `Assumptions / Decisions / Output / Risks`.

## Role map

- `planner` — builds an executable plan.
- `architect` — validates architecture and risks.
- `domain-reviewer` — validates business invariants and domain correctness.
- `backend-developer` — implements server-side changes.
- `frontend-developer` — implements client-side changes.
- `e2e-validator` — Playwright E2E, scenario and CI stability (see `docs/testing/playwright-e2e-framework.md`).
- `plan-reviewer` — checks plan vs implementation, issues verdict.

## Required context

- `DEVELOPMENT_PLAN.md` — active strategy.
- `NEXT_STEPS.md` — active backlog.
- `DOMAIN_RULES.md` — required domain context when tasks touch business rules, statuses, calculations, or invariants.
- `docs/planning/archive/` — history and old snapshot plans.

## Templates

- Plan review report: `.agents/templates/plan-review-report.md`

## Local runs

- Artifact folder (optional): `.agents/runs/` — create a run folder and store role reports only if the user explicitly asks in the prompt; see root `AGENTS.md`.
- When artifacts are explicitly requested — new run folder:
  - `scripts/agents/new-run.sh "task name"`
