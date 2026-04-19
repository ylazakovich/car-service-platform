# Specification-driven development (SDD) — project entry

This folder is the **canonical spec surface** for product intent, execution backlog, operations, domain, and stack. Root files `DEVELOPMENT_PLAN.md`, `NEXT_STEPS.md`, `DOMAIN_RULES.md`, and `TECH_STACK.md` are **thin pointers** where we keep stable paths at repo root.

## Spec index

| Artifact | Purpose |
|----------|---------|
| [RUNBOOK.md](./RUNBOOK.md) | How to run dev (hot reload), prod-like compose, demo SQL, LAN/mobile via `publish-dev-to-lan.sh`. |
| [DOMAIN_RULES.md](./DOMAIN_RULES.md) | Source of truth for domain entities, statuses, money, PDF/snapshot, access rules. |
| [TECH_STACK.md](./TECH_STACK.md) | Stack, architecture shape, access surfaces, risks, non-goals. |
| [PRODUCT.md](./PRODUCT.md) | Product goal, MVP scope, milestones, acceptance themes (strategy). |
| [TASKS.md](./TASKS.md) | Single flat backlog with stable task IDs (`T-*`) for batching (“do block T-E2E-*”). |
| [OPEN_QUESTIONS.md](./OPEN_QUESTIONS.md) | Explicit decisions still needed from product/tech owners. |
| [SDD_WORKFLOW.md](./SDD_WORKFLOW.md) | How SDD maps to this repo’s **Agents** workflow and validation gates. |

## Archives

- Planning snapshots: `docs/planning/archive/` (`DEVELOPMENT_PLAN_YYYYMMDD.md`, `NEXT_STEPS_YYYYMMDD.md`, …).

## How to work (short)

1. Read **PRODUCT.md** for constraints and milestone intent.
2. Use **RUNBOOK.md** before running Docker scripts the first time in an environment.
3. Pick tasks from **TASKS.md** (by section or by `T-*` ID range).
4. If a task touches domain math, statuses, or money: read **DOMAIN_RULES.md**.
5. Before coding ambiguous items: resolve or document assumptions in **OPEN_QUESTIONS.md** (or in the task thread).

## Language

`PRODUCT.md`, `TASKS.md`, `OPEN_QUESTIONS.md`, `SDD_WORKFLOW.md`, `RUNBOOK.md`, and this file are **English** to align with `AGENTS.md`. **`DOMAIN_RULES.md`** and **`TECH_STACK.md`** are largely **Russian** legacy specs; translate incrementally if you standardize on English-only engineering docs.
