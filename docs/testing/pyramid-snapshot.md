# Test pyramid snapshot

_Generated: `2026-05-21T14:01:27.653Z`_
_Source workflow run id: `26230625775`_
_Head SHA: `2e7b3bc`_

## Counts by layer (`epic` / Allure `layer`)

| Layer | `epic` / `layer` | Cases | Passed | Failed | Broken | Skipped |
| --- | --- | --: | --: | --: | --: | --: |
| Unit (base) | `unit` | **74** | 74 | 0 | 0 | 0 |
| Integration (middle) | `api` / `integration` | **162** | 162 | 0 | 0 | 0 |
| UI / E2E (top) | `end-to-end` / `ui` | **48** | 48 | 0 | 0 | 0 |
| **Σ pyramid layers** | | **284** | | | | |

## Shares (pyramid layers only)

| Layer | Share of Σ layers |
| --- | ---: |
| Unit (base) | 26.1% |
| Integration (middle) | 57.0% |
| UI / E2E (top) | 16.9% |

```text
Unit (base)    ██████ (74)
Integration (middle) ██████████████ (162)
UI / E2E (top) ████ (48)
```

## Advisory (planning only)

- **Unit share** 26.1% is below the soft planning target (~45%+). Consider adding or restoring fast unit tests before expanding API/E2E.

## Quality gates (non-blocking, advisory)

These checks **never fail the workflow**; they surface in GitHub **Annotations** (warnings) and in the **Job summary** when `pyramid-check` runs (Test Report workflow).

| Gate id | Status | Detail |
| --- | --- | --- |
| PYRAMID_UNIT_SHARE_LOW | ⚠️ warning | unit ≥ 45% of Σ layers (actual 26.1%) |
| PYRAMID_E2E_SHARE_HIGH | ✓ ok | UI/E2E ≤ 28% of Σ layers (actual 16.9%) |
| PYRAMID_UNKNOWN_EPIC | ✓ ok | other epic count: 0 |

_Blocking failures: none (reserved for a future strict mode)._

Canonical policy: [`docs/testing/test-pyramid.md`](./test-pyramid.md).