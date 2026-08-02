# Test pyramid (canonical)

This repository follows the **classic test pyramid** as a *direction of travel*: many fast tests at the base, fewer integration tests in the middle, and the smallest number of expensive UI (browser) tests at the top. **During MVP**, a **diamond** shape (dominant API / `integration` layer in Allure) is an **acceptable** distribution when there is no acute pain from regressions or compliance — soft targets below stay **review reminders**, not merge gates.

## Product policy verdict (MVP, single owner)

Recorded from owner Q&A so reviews and future-you share the same defaults:

| Topic | Decision |
| ----- | -------- |
| **Risk today** | No dominant pain (API/money/UI vs logic-without-UI); no special regulatory / money / SLA pressure driving test mix. |
| **Stage** | **MVP** — coverage may stay API-heavy while the domain evolves; no requirement to “freeze” pyramid shape yet. |
| **CI time** | No change goals for now; regression duration is acceptable. Path-level jobs later will shorten feedback further. |
| **Paying CI time for more unit tests** | **Yes** — adding Vitest/unit coverage is acceptable even if CI grows; rebalancing may later simplify some API tests where redundant. |
| **E2E share** | **As much as needed for release confidence** — no hard cap by percentage; keep E2E meaningful, not decorative. |
| **What counts as “unit” (base)** | **Vitest only** in this repo (`frontend/`). Fast isolated pytest without DB is *not* currently counted as the pyramid base in policy (may still be useful technically, but not the defined “unit” tier here). |
| **Integration vs unit (mental model)** | **Integration** = contract + DB (pytest API). **Unit** = no DB, Vitest. |
| **Soft numeric targets** | **Keep as written** — reminders in review and in Allure/README snapshots; **do not** retune numbers to match the current diamond. |
| **CI strictness** | **Warnings only** — no plan to fail builds on pyramid skew (`pyramid-check` stays advisory). |
| **Owner** | Single maintainer — this file is the canonical policy surface until a team process appears. |
| **Reviews** | Use the **checklist** in the next section for new tests. |

## PR / review checklist — new or changed tests

Apply in order unless the change is obviously UI-only (a11y, layout, cross-route flow):

1. **Can it be a Vitest test?** (no Django/DB, no real HTTP) — prefer `frontend/` unit/component tests first.
2. **If it needs Django/DRF/DB or HTTP contract** — add or extend **pytest API** tests (`backend/`, `epic: api`, `layer: integration`).
3. **If it needs a real browser and user journey** — add or extend **Playwright** (`epic: end-to-end`, `layer: e2e`); keep the scenario minimal and aligned with release confidence, not “because we can”.
4. **Labels** — keep `epic` and `layer` consistent with the tables above so Allure charts, snapshots, and gates stay truthful.

## Layers: `epic` vs Allure `layer`

| Pyramid position | Name in docs / README | Allure labels | Typical scope |
| ---------------- | --------------------- | ------------- | ------------- |
| **Base** | Unit (base) | `epic: unit`, `layer: unit` | Vitest: components, hooks, pure logic (`frontend/`, `*.test.ts`) |
| **Middle** | Integration (middle) | `epic: api`, `layer: integration` | pytest + Django/DRF: serializers, views, permissions (`backend/`) |
| **Top** | UI / E2E (top) | `epic: end-to-end` / `ui`, `layer: e2e` | Playwright: full flows in browser (`frontend/e2e/`) |

Epic labels are set in:

- `frontend/vitest.setup.ts` — `epic("unit")`, `component=frontend`
- `backend/conftest.py` — `epic("api")`, `component=backend`
- `frontend/playwright.config.ts` — `globalLabels: { epic: "end-to-end", layer: "e2e" }`

### Allure UI «Testing pyramid» vs `epic`

The built-in **Testing pyramid** and **Durations by layer** widgets in [Allure Report 3](https://allurereport.org/docs/visual-analytics/) read the **`layer`** label (`unit`, `integration`, `e2e` by default), **not** `epic`. This repo sets **both**:

| Tier | `epic` (behaviors / our scripts) | `layer` (Allure charts) |
| ---- | -------------------------------- | ------------------------ |
| Base | `unit` | `unit` |
| Middle | `api` | `integration` (Allure’s name for the middle slice) |
| Top | `end-to-end` | `e2e` |

So the HTML report widgets and the exported `latest/` snapshot / quality gates (which use `epic`) describe the **same** three-tier pyramid with aligned counts.

## What “aligned with the pyramid” means here

1. **Growth**: when adding coverage, prefer **unit → integration (pytest `epic: api`) → E2E** in that order unless the risk is explicitly UI-only (accessibility, layout, cross-page flows).
2. **Ratios are advisory**, not hard gates: teams and products differ. We document **soft targets** below so planning and reviews have a shared vocabulary; CI does not fail PRs solely on pyramid shape.
3. **Source of truth for counts**: merged Allure `*-result.json` from successful runs on `main`. PRs expose the current run as artifacts/Pages/comment only; the latest accepted `main` snapshot is updated under `docs/testing/latest/` by the scheduled/manual **Test Pyramid Snapshot Refresh** workflow through a separate rolling PR.

## Soft targets (planning, not CI gates)

These are **orientation** numbers (similar in spirit to Mike Cohn’s pyramid) and **review reminders** — they are **not** retuned to match the current suite shape. In MVP, falling short on unit share while API dominates is **expected** until you deliberately invest in Vitest; adjust numbers in product threads only when strategy changes.

- **Unit** share of all pyramid-layer cases: aim **≥ about 45–55%** as the suite matures.
- **Integration** (`epic: api`): often **~25–40%** of pyramid-layer cases.
- **UI / E2E**: aim to stay the **smallest** slice in steady state, often **≤ ~25%** of pyramid-layer cases, unless explicitly driven by compliance or release sign-off.

“Pyramid-layer cases” = tests counted under `unit` + `api` + `end-to-end` + `ui` in Allure. Tests without a known epic fall into **Other** (see snapshot); they should stay rare.

## Quality gates (advisory, non-blocking)

The **Test Report** workflow calls [`project-toolkit/actions/allure-report@v2.7.2`](https://github.com/quokkify/project-toolkit/tree/v2.7.2/actions/allure-report), which delegates to the public [`allure-report-action@v0.1.2`](https://github.com/quokkify/allure-report-action/releases/tag/v0.1.2), on merged PR Allure results. The scheduled/manual **Test Pyramid Snapshot Refresh** workflow runs the same `pyramid-check` implementation before opening/updating the rolling snapshot PR. This is a **quality signal**, not a merge gate:

- **Violations** surface as GitHub **Annotations** (`::warning::`) and in the **Job summary** for the Test Report job.
- The workflow **always exits successfully** for this step (`exit 0`); it does **not** fail the run or block merge.
- Machine-readable output: [`latest/pyramid-quality-gates.json`](./latest/pyramid-quality-gates.json) (`warnings[]`, empty `blockingFailures[]` today; strict mode is reserved for the future if the team opts in).
- Human-readable table: same rules are duplicated in [`latest/README.md`](./latest/README.md) under **Quality gates (non-blocking, advisory)**.

Checked rules today (aligned with soft targets above):

| Gate id | Meaning |
| ------- | ------- |
| `PYRAMID_UNIT_SHARE_LOW` | Unit share of Σ pyramid layers falls **below** the soft ~45% target (advisory). |
| `PYRAMID_E2E_SHARE_HIGH` | UI/E2E share of Σ pyramid layers **exceeds** the soft ~28% ceiling (advisory). |
| `PYRAMID_UNKNOWN_EPIC` | At least one test has no known `epic` → not counted on the pyramid. |

## How to refresh snapshots locally

From the repo root, fetch the same immutable standalone implementation used by the toolkit wrapper:

```bash
ALLURE_CI="$(mktemp)"
trap 'rm -f "$ALLURE_CI"' EXIT
curl -fsSL \
  https://raw.githubusercontent.com/quokkify/allure-report-action/72fb74fff8b564040f12fd5d97b9867241e2c35d/allure-ci.mjs \
  -o "$ALLURE_CI"
```

Then, with a merged Allure results directory (e.g. after CI download or local runs copied into one folder):

```bash
node "$ALLURE_CI" pyramid \
  --results path/to/allure-results \
  --output docs/testing/latest/README.md \
  --json docs/testing/latest/pyramid-snapshot.json
```

Pass `--readme README.md` only for one-off local experiments; the scheduled/manual snapshot workflow intentionally leaves the root README stable and updates only generated files under `docs/testing/latest/`.

Quality gates only (warnings + JSON, optional CI-style annotations if `GITHUB_STEP_SUMMARY` is set):

```bash
node "$ALLURE_CI" pyramid-check \
  --results path/to/allure-results \
  --json docs/testing/latest/pyramid-quality-gates.json
```

## FAQ — generated snapshot on `main` looks stale

1. PR reporting is intentionally read-only for PR branches: **Test Report** publishes artifacts/Pages/comment and mirrors the source PR Pipeline conclusion, but it does **not** commit generated docs back to the PR head.
2. `main` snapshots are refreshed by **Test Pyramid Snapshot Refresh** (`schedule` + `workflow_dispatch`). It runs the test suite on `main`, regenerates `docs/testing/latest/README.md`, `docs/testing/latest/pyramid-snapshot.json`, and `docs/testing/latest/pyramid-quality-gates.json`, then opens/updates the rolling `chore/test-pyramid-snapshot` PR only when those files changed. The root README intentionally stays a stable navigation page and only links to the accepted latest snapshot.
3. **Fix now:** run **Test Pyramid Snapshot Refresh** manually from GitHub Actions, or refresh locally from merged `allure-results` using the command above and open a small PR.

## Related docs

- [Playwright E2E framework](./playwright-e2e-framework.md) — determinism, CI, no retries.
- [`docs/spec/SCRIPTS.md`](../spec/SCRIPTS.md) — Allure scripts and `allure-ci.mjs`.
