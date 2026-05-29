# Test pyramid snapshot

_Generated: `2026-05-29T06:46:45.317Z`_
_Source workflow run id: `26622496412`_
_Head SHA: `a7114d4`_

## Counts by layer (`epic` / Allure `layer`)

| Layer | `epic` / `layer` | Cases | Passed | Failed | Broken | Skipped |
| --- | --- | --: | --: | --: | --: | --: |
| Unit (base) | `unit` | **227** | 227 | 0 | 0 | 0 |
| Integration (middle) | `api` / `integration` | **163** | 163 | 0 | 0 | 0 |
| UI / E2E (top) | `end-to-end` / `ui` | **64** | 64 | 0 | 0 | 0 |
| **Σ pyramid layers** | | **454** | | | | |

## Shares (pyramid layers only)

| Layer | Share of Σ layers |
| --- | ---: |
| Unit (base) | 50.0% |
| Integration (middle) | 35.9% |
| UI / E2E (top) | 14.1% |

```text
UI / E2E (top)          64                ████████
Integration (middle)   163          ████████████████████
Unit (base)            227      ████████████████████████████
```

## Advisory (planning only)

- Pyramid layer shares sit within the **soft** planning band documented in `docs/testing/test-pyramid.md` (not a merge gate).

## Quality gates (non-blocking, advisory)

These checks **never fail the workflow**; they surface in GitHub **Annotations** (warnings) and in the **Job summary** when `pyramid-check` runs (Test Report workflow).

| Gate id | Status | Detail |
| --- | --- | --- |
| PYRAMID_UNIT_SHARE_LOW | ✓ ok | unit ≥ 45% of Σ layers (actual 50.0%) |
| PYRAMID_E2E_SHARE_HIGH | ✓ ok | UI/E2E ≤ 28% of Σ layers (actual 14.1%) |
| PYRAMID_UNKNOWN_EPIC | ✓ ok | other epic count: 0 |

_Blocking failures: none (reserved for a future strict mode)._

Canonical policy: [`docs/testing/test-pyramid.md`](../test-pyramid.md).