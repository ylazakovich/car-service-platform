# Test pyramid snapshot

_Generated: `2026-04-20T17:36:40.646Z`_
_Source workflow run id: `24680926382`_
_Head SHA: `1f7cdb0`_

## Counts by layer (`epic` / Allure `layer`)

| Layer | `epic` / `layer` | Cases | Passed | Failed | Broken | Skipped |
| --- | --- | --: | --: | --: | --: | --: |
| Unit (base) | `unit` | **63** | 63 | 0 | 0 | 0 |
| Integration (middle) | `api` / `integration` | **144** | 144 | 0 | 0 | 0 |
| UI / E2E (top) | `end-to-end` / `ui` | **27** | 17 | 1 | 0 | 9 |
| **Σ pyramid layers** | | **234** | | | | |

## Shares (pyramid layers only)

| Layer | Share of Σ layers |
| --- | ---: |
| Unit (base) | 26.9% |
| Integration (middle) | 61.5% |
| UI / E2E (top) | 11.5% |

```text
Unit (base)    ██████ (63)
Integration (middle) ███████████████ (144)
UI / E2E (top) ███ (27)
```

## Advisory (planning only)

- **Unit share** 26.9% is below the soft planning target (~45%+). Consider adding or restoring fast unit tests before expanding API/E2E.

## Quality gates (non-blocking, advisory)

These checks **never fail the workflow**; they surface in GitHub **Annotations** (warnings) and in the **Job summary** when `pyramid-check` runs (Test Report workflow).

| Gate id | Status | Detail |
| --- | --- | --- |
| PYRAMID_UNIT_SHARE_LOW | ⚠️ warning | unit ≥ 45% of Σ layers (actual 26.9%) |
| PYRAMID_E2E_SHARE_HIGH | ✓ ok | UI/E2E ≤ 28% of Σ layers (actual 11.5%) |
| PYRAMID_UNKNOWN_EPIC | ✓ ok | other epic count: 0 |

_Blocking failures: none (reserved for a future strict mode)._

Canonical policy: [`docs/testing/test-pyramid.md`](./test-pyramid.md).