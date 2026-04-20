# Test pyramid snapshot

_Generated: `2026-04-20T09:03:22.290Z`_

## Counts by layer (`epic` / Allure `layer`)

| Layer | `epic` / `layer` | Cases | Passed | Failed | Broken | Skipped |
| --- | --- | --: | --: | --: | --: | --: |
| Unit (base) | `unit` | **0** | 0 | 0 | 0 | 0 |
| Integration (middle) | `api` / `integration` | **0** | 0 | 0 | 0 | 0 |
| UI / E2E (top) | `end-to-end` / `ui` | **0** | 0 | 0 | 0 | 0 |
| **Σ pyramid layers** | | **0** | | | | |

## Shares (pyramid layers only)

_No results in the given directory — nothing to chart._

## Advisory (planning only)

- No Allure results in this directory — pyramid share advisory skipped (run tests or point `--results` at merged CI output).

## Quality gates (non-blocking, advisory)

These checks **never fail the workflow**; they surface in GitHub **Annotations** (warnings) and in the **Job summary** when `pyramid-check` runs (Test Report workflow).

| Check | Status |
| --- | --- |
| Pyramid layer totals | ⚠️ skipped (no `unit`/`api`/`end-to-end`/`ui` cases in merged results) |

Canonical policy: [`docs/testing/test-pyramid.md`](./test-pyramid.md).