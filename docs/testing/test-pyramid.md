# Test pyramid (canonical)

This repository follows the **classic test pyramid**: many fast tests at the base, fewer integration tests in the middle, and the smallest number of expensive UI (browser) tests at the top.

## Layers and Allure `epic` labels

| Pyramid position | Layer (concept) | Allure `epic` in this repo | Typical scope |
| ---------------- | --------------- | -------------------------- | ------------- |
| **Base** | Unit | `unit` | Vitest: components, hooks, pure logic (`frontend/`, `*.test.ts`) |
| **Middle** | API | `api` | pytest + Django/DRF: serializers, views, permissions (`backend/`) |
| **Top** | UI / E2E | `end-to-end` (and optional `ui` if introduced) | Playwright: full flows in browser (`frontend/e2e/`) |

Epic labels are set in:

- `frontend/vitest.setup.ts` — `epic("unit")`, `component=frontend`
- `backend/conftest.py` — `epic("api")`, `component=backend`
- `frontend/playwright.config.ts` — `globalLabels: { epic: "end-to-end" }`

### Allure UI «Testing pyramid» vs `epic`

The built-in **Testing pyramid** and **Durations by layer** widgets in [Allure Report 3](https://allurereport.org/docs/visual-analytics/) read the **`layer`** label (`unit`, `integration`, `e2e` by default), **not** `epic`. This repo sets **both**:

| Tier | `epic` (behaviors / our scripts) | `layer` (Allure charts) |
| ---- | -------------------------------- | ------------------------ |
| Base | `unit` | `unit` |
| Middle | `api` | `integration` (Allure’s name for the middle slice) |
| Top | `end-to-end` | `e2e` |

So the HTML report widgets and the exported `pyramid-snapshot.*` / quality gates (which use `epic`) describe the **same** three-tier pyramid with aligned counts.

## What “aligned with the pyramid” means here

1. **Growth**: when adding coverage, prefer **unit → API → E2E** in that order unless the risk is explicitly UI-only (accessibility, layout, cross-page flows).
2. **Ratios are advisory**, not hard gates: teams and products differ. We document **soft targets** below so planning and reviews have a shared vocabulary; CI does not fail PRs solely on pyramid shape.
3. **Source of truth for counts**: merged Allure `*-result.json` from the PR Pipeline (same tree as the HTML report). A machine-readable snapshot is written to [`pyramid-snapshot.json`](./pyramid-snapshot.json) and a human summary to [`pyramid-snapshot.md`](./pyramid-snapshot.md) by the **Test Report** workflow after each successful PR Pipeline (same-repo branches only; fork PRs skip the git push).

## Soft targets (planning, not CI gates)

These are **orientation** numbers (similar in spirit to Mike Cohn’s pyramid); adjust in product threads if the MVP demands more E2E early.

- **Unit** share of all pyramid-layer cases: aim **≥ about 45–55%** as the suite matures.
- **API**: often **~25–40%** of pyramid-layer cases.
- **UI / E2E**: aim to stay the **smallest** slice in steady state, often **≤ ~25%** of pyramid-layer cases, unless explicitly driven by compliance or release sign-off.

“Pyramid-layer cases” = tests counted under `unit` + `api` + `end-to-end` + `ui` in Allure. Tests without a known epic fall into **Other** (see snapshot); they should stay rare.

## Quality gates (advisory, non-blocking)

The **Test Report** workflow runs `allure-ci.mjs pyramid-check` on merged Allure results. This is a **quality signal**, not a merge gate:

- **Violations** surface as GitHub **Annotations** (`::warning::`) and in the **Job summary** for the Test Report job.
- The workflow **always exits successfully** for this step (`exit 0`); it does **not** fail the run or block merge.
- Machine-readable output: [`pyramid-quality-gates.json`](./pyramid-quality-gates.json) (`warnings[]`, empty `blockingFailures[]` today; strict mode is reserved for the future if the team opts in).
- Human-readable table: same rules are duplicated in [`pyramid-snapshot.md`](./pyramid-snapshot.md) under **Quality gates (non-blocking, advisory)**.

Checked rules today (aligned with soft targets above):

| Gate id | Meaning |
| ------- | ------- |
| `PYRAMID_UNIT_SHARE_LOW` | Unit share of Σ pyramid layers falls **below** the soft ~45% target (advisory). |
| `PYRAMID_E2E_SHARE_HIGH` | UI/E2E share of Σ pyramid layers **exceeds** the soft ~28% ceiling (advisory). |
| `PYRAMID_UNKNOWN_EPIC` | At least one test has no known `epic` → not counted on the pyramid. |

## How to refresh snapshots locally

From the repo root, with a merged Allure results directory (e.g. after CI download or local runs copied into one folder):

```bash
node .github/scripts/allure-ci.mjs pyramid \
  --results path/to/allure-results \
  --output docs/testing/pyramid-snapshot.md \
  --json docs/testing/pyramid-snapshot.json \
  --readme README.md
```

Omit `--readme` if you do not want to touch the root README.

Quality gates only (warnings + JSON, optional CI-style annotations if `GITHUB_STEP_SUMMARY` is set):

```bash
node .github/scripts/allure-ci.mjs pyramid-check \
  --results path/to/allure-results \
  --json docs/testing/pyramid-quality-gates.json
```

## Related docs

- [Playwright E2E framework](./playwright-e2e-framework.md) — determinism, CI, no retries.
- [`docs/spec/SCRIPTS.md`](../spec/SCRIPTS.md) — Allure scripts and `allure-ci.mjs`.
