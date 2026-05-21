# Test pyramid snapshot

_Generated: `2026-05-21T11:36:46.671Z`_
_Source workflow run id: `26223342305`_
_Head SHA: `b6d2c0a`_

## Counts by layer (`epic` / Allure `layer`)

| Layer | `epic` / `layer` | Cases | Passed | Failed | Broken | Skipped |
| --- | --- | --: | --: | --: | --: | --: |
| Unit (base) | `unit` | **69** | 67 | 0 | 2 | 0 |
| Integration (middle) | `api` / `integration` | **158** | 158 | 0 | 0 | 0 |
| UI / E2E (top) | `end-to-end` / `ui` | **43** | 38 | 3 | 2 | 0 |
| **Σ pyramid layers** | | **270** | | | | |

## Shares (pyramid layers only)

| Layer | Share of Σ layers |
| --- | ---: |
| Unit (base) | 25.6% |
| Integration (middle) | 58.5% |
| UI / E2E (top) | 15.9% |

```text
Unit (base)    ██████ (69)
Integration (middle) ██████████████ (158)
UI / E2E (top) ████ (43)
```

## Advisory (planning only)

- **Unit share** 25.6% is below the soft planning target (~45%+). Consider adding or restoring fast unit tests before expanding API/E2E.

## Quality gates (non-blocking, advisory)

These checks **never fail the workflow**; they surface in GitHub **Annotations** (warnings) and in the **Job summary** when `pyramid-check` runs (Test Report workflow).

| Gate id | Status | Detail |
| --- | --- | --- |
| PYRAMID_UNIT_SHARE_LOW | ⚠️ warning | unit ≥ 45% of Σ layers (actual 25.6%) |
| PYRAMID_E2E_SHARE_HIGH | ✓ ok | UI/E2E ≤ 28% of Σ layers (actual 15.9%) |
| PYRAMID_UNKNOWN_EPIC | ✓ ok | other epic count: 0 |

_Blocking failures: none (reserved for a future strict mode)._

Canonical policy: [`docs/testing/test-pyramid.md`](./test-pyramid.md).