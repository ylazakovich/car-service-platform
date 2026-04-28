# Test pyramid snapshot

_Generated: `2026-04-28T06:25:01.416Z`_
_Source workflow run id: `25037372413`_
_Head SHA: `d9bda19`_

## Counts by layer (`epic` / Allure `layer`)

| Layer | `epic` / `layer` | Cases | Passed | Failed | Broken | Skipped |
| --- | --- | --: | --: | --: | --: | --: |
| Unit (base) | `unit` | **64** | 63 | 0 | 1 | 0 |
| Integration (middle) | `api` / `integration` | **0** | 0 | 0 | 0 | 0 |
| UI / E2E (top) | `end-to-end` / `ui` | **0** | 0 | 0 | 0 | 0 |
| **Σ pyramid layers** | | **64** | | | | |

## Shares (pyramid layers only)

| Layer | Share of Σ layers |
| --- | ---: |
| Unit (base) | 100.0% |
| Integration (middle) | 0.0% |
| UI / E2E (top) | 0.0% |

```text
Unit (base)    ████████████████████████ (64)
Integration (middle) █ (0)
UI / E2E (top) █ (0)
```

## Advisory (planning only)

- Pyramid layer shares sit within the **soft** planning band documented in `docs/testing/test-pyramid.md` (not a merge gate).

## Quality gates (non-blocking, advisory)

These checks **never fail the workflow**; they surface in GitHub **Annotations** (warnings) and in the **Job summary** when `pyramid-check` runs (Test Report workflow).

| Gate id | Status | Detail |
| --- | --- | --- |
| PYRAMID_UNIT_SHARE_LOW | ✓ ok | unit ≥ 45% of Σ layers (actual 100.0%) |
| PYRAMID_E2E_SHARE_HIGH | ✓ ok | UI/E2E ≤ 28% of Σ layers (actual 0.0%) |
| PYRAMID_UNKNOWN_EPIC | ✓ ok | other epic count: 0 |

_Blocking failures: none (reserved for a future strict mode)._

Canonical policy: [`docs/testing/test-pyramid.md`](./test-pyramid.md).