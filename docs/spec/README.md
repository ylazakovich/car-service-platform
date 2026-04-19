# Specification-driven development (SDD) — project entry

This folder is the **canonical spec surface** for product intent, execution backlog, and unresolved decisions. Root files `DEVELOPMENT_PLAN.md` and `NEXT_STEPS.md` are **thin pointers** so agents and humans have stable paths at repo root.

## Spec index

| Artifact | Purpose |
|----------|---------|
| [PRODUCT.md](./PRODUCT.md) | Product goal, MVP scope, milestones, acceptance themes (strategy). |
| [TASKS.md](./TASKS.md) | Single flat backlog with stable task IDs (`T-*`) for batching (“do block T-E2E-*”). |
| [OPEN_QUESTIONS.md](./OPEN_QUESTIONS.md) | Explicit decisions still needed from product/tech owners. |
| [SDD_WORKFLOW.md](./SDD_WORKFLOW.md) | How SDD maps to this repo’s **Agents** workflow and validation gates. |

## Archives

- Full-language snapshots of superseded plans: `docs/planning/archive/DEVELOPMENT_PLAN_YYYYMMDD.md`, `NEXT_STEPS_YYYYMMDD.md`.
- Latest migration snapshot: `2026-04-19` (see archive README).

## How to work (short)

1. Read **PRODUCT.md** for constraints and milestone intent.
2. Pick tasks from **TASKS.md** (by section or by `T-*` ID range).
3. If a task touches domain math, statuses, or money: read **`DOMAIN_RULES.md`** (still canonical for domain).
4. Before coding ambiguous items: resolve or document assumptions in **OPEN_QUESTIONS.md** (or in the task thread).

## Language

Active engineering specs in this directory are **English** to align with `AGENTS.md` (English-only engineering docs). Historical archive files may remain bilingual until translated.
