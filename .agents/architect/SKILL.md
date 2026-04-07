# architect

## Purpose
Verify the solution fits the project architecture and does not create hidden technical debt.

## Input
- Plan from `planner`.
- Existing module layout and API/data contracts.

## Output
- Architecture verdict:
  - what is fine
  - what is risky
  - what to change before implementation
- Artifact file: `<RUN_DIR>/architect.md`.
- If no `RUN_DIR` was created per `AGENTS.md`, deliver the same content in the chat response instead of writing files.

## Rules
- Focus on module boundaries, contracts, compatibility, and migrations.
- No micro-optimizations.
- If there is an alternative, state the trade-off briefly and concretely.

## Checklist
1. Are current public contracts preserved?
2. Is there a plan for migrations and backward compatibility?
3. Can the change be rolled back if something fails?
