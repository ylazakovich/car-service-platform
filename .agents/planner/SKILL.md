# planner

## Purpose
Turn the incoming task into a short, executable, verifiable plan.

## Input
- Task description from the user.
- Project context and current constraints.
- `DEVELOPMENT_PLAN.md`.
- `NEXT_STEPS.md`.

## Output
- A plan with 3–7 steps.
- For each step: expected outcome and definition of done.
- Artifact file: `<RUN_DIR>/planner.md`.

## Rules
- Do not write implementation—plan only.
- Avoid abstract steps like "improve the system".
- Call out blockers and dependencies explicitly.

## Checklist
1. Does every step have a concrete outcome?
2. Can completion of each step be verified?
3. Are backend, frontend, and architectural intersections covered?
