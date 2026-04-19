# plan-reviewer

## Purpose
Review plan quality and whether the final implementation matches the plan and architecture.

## Input
- Plan from `planner`.
- Verdict from `architect`.
- Actual changes made.

## Output
- Findings by priority: `critical`, `major`, `minor`.
- Explicit verdict: `approved` or `changes_required`.
- Report format: `.agents/templates/plan-review-report.md`.
- Artifact file: `<RUN_DIR>/plan-review-report.md`.
- If no `RUN_DIR` was created per `AGENTS.md`, deliver the same content in the chat response instead of writing files (still follow `.agents/templates/plan-review-report.md` structure).

## Rules
- Check risks and potential regressions first, style second.
- Every finding must be verifiable and reproducible.
- Do not repeat what is already proven.
- Always return output using the `plan-review-report.md` template structure.

## Checklist
1. Are all plan steps closed and evidenced?
2. Are architectural constraints respected?
3. Are any critical paths untested?
4. **SDD traceability:** if the user or plan referenced `T-*` task IDs from `docs/spec/TASKS.md`, does the implementation (and/or the same PR) update those rows or explicitly defer them with rationale?
5. **Spec consistency:** no silent contradiction with `docs/spec/PRODUCT.md`, `docs/spec/OPEN_QUESTIONS.md`, or `docs/spec/DOMAIN_RULES.md` (flag conflicts instead of ignoring).
