# Test pyramid snapshot

_Generated: `2026-05-29T15:08:32.566Z`_
_Source workflow run id: `26644937821`_
_Head SHA: `42fda66`_

## Counts by layer (`epic` / Allure `layer`)

| Layer | `epic` / `layer` | Cases | Passed | Failed | Broken | Skipped |
| --- | --- | --: | --: | --: | --: | --: |
| Unit (base) | `unit` | **230** | 230 | 0 | 0 | 0 |
| Integration (middle) | `api` / `integration` | **163** | 163 | 0 | 0 | 0 |
| UI / E2E (top) | `end-to-end` / `ui` | **79** | 79 | 0 | 0 | 0 |
| **Σ pyramid layers** | | **472** | | | | |

## Shares (pyramid layers only)

| Layer | Share of Σ layers |
| --- | ---: |
| Unit (base) | 48.7% |
| Integration (middle) | 34.5% |
| UI / E2E (top) | 16.7% |

```text
UI / E2E (top)          79               ██████████
Integration (middle)   163          ████████████████████
Unit (base)            230      ████████████████████████████
```

## Advisory (planning only)

- Pyramid layer shares sit within the **soft** planning band documented in `docs/testing/test-pyramid.md` (not a merge gate).

## Quality gates (non-blocking, advisory)

These checks **never fail the workflow**; they surface in GitHub **Annotations** (warnings) and in the **Job summary** when `pyramid-check` runs (Test Report workflow).

| Gate id | Status | Detail |
| --- | --- | --- |
| PYRAMID_UNIT_SHARE_LOW | ✓ ok | unit ≥ 45% of Σ layers (actual 48.7%) |
| PYRAMID_E2E_SHARE_HIGH | ✓ ok | UI/E2E ≤ 28% of Σ layers (actual 16.7%) |
| PYRAMID_UNKNOWN_EPIC | ✓ ok | other epic count: 0 |

_Blocking failures: none (reserved for a future strict mode)._

Canonical policy: [`docs/testing/test-pyramid.md`](../test-pyramid.md).