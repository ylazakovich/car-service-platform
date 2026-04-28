# Test pyramid snapshot

_Generated: `2026-04-28T06:36:34.707Z`_
_Source workflow run id: `25037719832`_
_Head SHA: `3d71aff`_

## Counts by layer (`epic` / Allure `layer`)

| Layer | `epic` / `layer` | Cases | Passed | Failed | Broken | Skipped |
| --- | --- | --: | --: | --: | --: | --: |
| Unit (base) | `unit` | **64** | 64 | 0 | 0 | 0 |
| Integration (middle) | `api` / `integration` | **157** | 157 | 0 | 0 | 0 |
| UI / E2E (top) | `end-to-end` / `ui` | **27** | 17 | 0 | 1 | 9 |
| **Σ pyramid layers** | | **248** | | | | |

## Shares (pyramid layers only)

| Layer | Share of Σ layers |
| --- | ---: |
| Unit (base) | 25.8% |
| Integration (middle) | 63.3% |
| UI / E2E (top) | 10.9% |

```text
Unit (base)    ██████ (64)
Integration (middle) ███████████████ (157)
UI / E2E (top) ███ (27)
```

## Advisory (planning only)

- **Unit share** 25.8% is below the soft planning target (~45%+). Consider adding or restoring fast unit tests before expanding API/E2E.

## Quality gates (non-blocking, advisory)

These checks **never fail the workflow**; they surface in GitHub **Annotations** (warnings) and in the **Job summary** when `pyramid-check` runs (Test Report workflow).

| Gate id | Status | Detail |
| --- | --- | --- |
| PYRAMID_UNIT_SHARE_LOW | ⚠️ warning | unit ≥ 45% of Σ layers (actual 25.8%) |
| PYRAMID_E2E_SHARE_HIGH | ✓ ok | UI/E2E ≤ 28% of Σ layers (actual 10.9%) |
| PYRAMID_UNKNOWN_EPIC | ✓ ok | other epic count: 0 |

_Blocking failures: none (reserved for a future strict mode)._

Canonical policy: [`docs/testing/test-pyramid.md`](./test-pyramid.md).