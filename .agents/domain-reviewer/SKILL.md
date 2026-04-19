# domain-reviewer

## Purpose
Ensure the plan and final implementation preserve domain correctness, business invariants, and expected domain behavior.

## Input
- Plan from `planner`.
- Verdict from `architect`.
- `docs/spec/OPEN_QUESTIONS.md` when the task may bump into unresolved product decisions (call them out in Risks).
- `docs/spec/DOMAIN_RULES.md` as the canonical source for domain rules, statuses, calculations, and invariants.
- Description of affected business rules, statuses, calculations, or constraints.
- Short behavior delta: before vs after.
- Actual code changes, if the review runs post-implementation.

## Output
- Use the global role format from `AGENTS.md`:
  - `Assumptions`
  - `Decisions`
  - `Output`
  - `Risks`
- In `Output`, always include:
  - which invariants are confirmed
  - which rules are violated or ambiguous
  - which scenarios need extra verification
  - path to the result file, or `inline in chat` if no `RUN_DIR` per `AGENTS.md`
- Artifact files:
  - `<RUN_DIR>/domain-review-plan.md` for pre-implementation review
  - `<RUN_DIR>/domain-review-final.md` for post-implementation review
- If no `RUN_DIR` was created per `AGENTS.md`, deliver the same sections in the chat response instead of writing files.

## Rules
- Focus on business meaning, not implementation style.
- State domain invariants, preconditions, and postconditions explicitly.
- If a rule is unclear, state a question or assumption explicitly.
- Cross-check with `docs/spec/DOMAIN_RULES.md`; if the diff or task contradicts it, flag the mismatch.
- For changes involving statuses, calculations, and eligibility, always check edge cases.

## Checklist
1. Are key business invariants preserved?
2. Are status transitions and forbidden states correct?
3. Are edge cases that affect domain outcomes covered?
