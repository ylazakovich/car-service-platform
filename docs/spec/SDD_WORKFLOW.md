# SDD × Agents workflow

This document aligns **spec-driven development** with the **project-local agent pipeline** described in root `AGENTS.md` and with the generic **orchestrator five-phase** pattern (assessment → research → planning → execution → validation).

## Spec artifacts vs agent roles

| Spec artifact | Typical consumer role | Notes |
|----------------|---------------------|--------|
| `PRODUCT.md` | `planner`, `architect`, `domain-reviewer` | Strategy, scope, milestone boundaries. |
| `TASKS.md` | `planner`, `plan-reviewer` | Executable backlog; planner turns selected `T-*` items into a 3–7 step plan. |
| `OPEN_QUESTIONS.md` | `planner`, `architect` | Blockers: planner must call them out or record explicit assumptions. |
| [`DOMAIN_RULES.md`](./DOMAIN_RULES.md) | `domain-reviewer`, dev roles | Domain source of truth (lives only under `docs/spec/`). |

## Mapping to orchestrator phases (portable pattern)

1. **Initial assessment** — Orchestrator (or main agent): read task, `PRODUCT.md` slice, relevant `T-*` rows, `OPEN_QUESTIONS.md` for conflicts.
2. **Deep research** — Delegate when code/architecture unknown; scope queries to files/APIs named in `TASKS.md`.
3. **Planning** — `planner` produces a verifiable plan tied to `T-*` IDs and acceptance cues from `PRODUCT.md`.
4. **Execution** — `backend-developer` / `frontend-developer` (and others per `AGENTS.md` triggers).
5. **Validation** — Commands (lint, tests, build) **plus** `domain-reviewer` / `e2e-validator` / `plan-reviewer` per `scope: full | iteration` in `AGENTS.md`.

## `scope: full` vs `iteration`

- **`scope: full`**: run the full pipeline including `plan-reviewer`; link plan steps to `T-*` IDs for traceability.
- **`scope: iteration`**: skip full replanning/re-review unless the user asks; still satisfy domain and minimal verification rules in `AGENTS.md`.

## When a task completes

- Update **`docs/spec/TASKS.md`**: flip `[ ]` → `[x]` for the completed `T-*` row (same PR as the implementation, unless user says otherwise).
- If scope or acceptance changed materially: adjust **`PRODUCT.md`** or **`OPEN_QUESTIONS.md`** in the same change set.

## Validation contract (for agents)

Every implementation PR or agent run should leave:

1. **Evidence**: command(s) run (or CI link) matching project norms.
2. **Traceability**: which `T-*` IDs were satisfied.
3. **Residual risk**: what was not tested or what remains in `OPEN_QUESTIONS.md`.

`plan-reviewer` uses this in addition to `.agents/templates/plan-review-report.md`.
