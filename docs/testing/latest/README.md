# Test pyramid snapshot

_Generated: `2026-05-28T10:11:29.783Z`_
_Source workflow run id: `26568324123`_
_Head SHA: `3b49ae3`_

## Counts by layer (`epic` / Allure `layer`)

| Layer | `epic` / `layer` | Cases | Passed | Failed | Broken | Skipped |
| --- | --- | --: | --: | --: | --: | --: |
| Unit (base) | `unit` | **77** | 77 | 0 | 0 | 0 |
| Integration (middle) | `api` / `integration` | **163** | 163 | 0 | 0 | 0 |
| UI / E2E (top) | `end-to-end` / `ui` | **60** | 60 | 0 | 0 | 0 |
| **Σ pyramid layers** | | **300** | | | | |

## Shares (pyramid layers only)

| Layer | Share of Σ layers |
| --- | ---: |
| Unit (base) | 25.7% |
| Integration (middle) | 54.3% |
| UI / E2E (top) | 20.0% |

```text
UI / E2E (top)          60               ██████████
Integration (middle)   163      ████████████████████████████
Unit (base)             77             █████████████
```

## Advisory (planning only)

- **Unit share** 25.7% is below the soft planning target (~45%+). Consider adding or restoring fast unit tests before expanding API/E2E.

## Quality gates (non-blocking, advisory)

These checks **never fail the workflow**; they surface in GitHub **Annotations** (warnings) and in the **Job summary** when `pyramid-check` runs (Test Report workflow).

| Gate id | Status | Detail |
| --- | --- | --- |
| PYRAMID_UNIT_SHARE_LOW | ⚠️ warning | unit ≥ 45% of Σ layers (actual 25.7%) |
| PYRAMID_E2E_SHARE_HIGH | ✓ ok | UI/E2E ≤ 28% of Σ layers (actual 20.0%) |
| PYRAMID_UNKNOWN_EPIC | ✓ ok | other epic count: 0 |

_Blocking failures: none (reserved for a future strict mode)._

Canonical policy: [`docs/testing/test-pyramid.md`](../test-pyramid.md).