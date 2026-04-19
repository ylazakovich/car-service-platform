# planner

## Purpose
Turn the incoming task into a short, executable, verifiable plan.

## Input
- Task description from the user.
- Project context and current constraints.
- `docs/spec/PRODUCT.md` (strategy / scope).
- `docs/spec/TASKS.md` (backlog rows and `T-*` IDs relevant to the task).
- `docs/spec/OPEN_QUESTIONS.md` (blockers and decisions not yet closed).
- `docs/spec/RUNBOOK.md` if the task depends on how the app is run locally, on LAN, or with demo data.
- `docs/spec/DOMAIN_RULES.md` when the task may touch business rules, statuses, or calculations.
- Root `DEVELOPMENT_PLAN.md` / `NEXT_STEPS.md` are pointers only — follow links into `docs/spec/`.

## Output
- A plan with 3–7 steps.
- For each step: expected outcome and definition of done.
- Artifact file: `<RUN_DIR>/planner.md`.
- If no `RUN_DIR` was created per `AGENTS.md`, deliver the same content in the chat response instead of writing files.

## Rules
- Do not write implementation—plan only.
- Avoid abstract steps like "improve the system".
- Call out blockers and dependencies explicitly.

## Checklist
1. Does every step have a concrete outcome?
2. Can completion of each step be verified?
3. Are backend, frontend, and architectural intersections covered?
