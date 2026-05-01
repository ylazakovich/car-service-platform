# Test pyramid snapshot

_Generated: `2026-05-01T09:07:33.860Z`_
_Source workflow run id: `25209002563`_
_Head SHA: `1c1e847`_

## Counts by layer (`epic` / Allure `layer`)

| Layer | `epic` / `layer` | Cases | Passed | Failed | Broken | Skipped |
| --- | --- | --: | --: | --: | --: | --: |
| Unit (base) | `unit` | **69** | 69 | 0 | 0 | 0 |
| Integration (middle) | `api` / `integration` | **157** | 157 | 0 | 0 | 0 |
| UI / E2E (top) | `end-to-end` / `ui` | **30** | 30 | 0 | 0 | 0 |
| **Σ pyramid layers** | | **256** | | | | |

## Shares (pyramid layers only)

| Layer | Share of Σ layers |
| --- | ---: |
| Unit (base) | 27.0% |
| Integration (middle) | 61.3% |
| UI / E2E (top) | 11.7% |

```text
Unit (base)    ██████ (69)
Integration (middle) ███████████████ (157)
UI / E2E (top) ███ (30)
```

## Advisory (planning only)

- **Unit share** 27.0% is below the soft planning target (~45%+). Consider adding or restoring fast unit tests before expanding API/E2E.

## Quality gates (non-blocking, advisory)

These checks **never fail the workflow**; they surface in GitHub **Annotations** (warnings) and in the **Job summary** when `pyramid-check` runs (Test Report workflow).

| Gate id | Status | Detail |
| --- | --- | --- |
| PYRAMID_UNIT_SHARE_LOW | ⚠️ warning | unit ≥ 45% of Σ layers (actual 27.0%) |
| PYRAMID_E2E_SHARE_HIGH | ✓ ok | UI/E2E ≤ 28% of Σ layers (actual 11.7%) |
| PYRAMID_UNKNOWN_EPIC | ✓ ok | other epic count: 0 |

_Blocking failures: none (reserved for a future strict mode)._

Canonical policy: [`docs/testing/test-pyramid.md`](./test-pyramid.md).