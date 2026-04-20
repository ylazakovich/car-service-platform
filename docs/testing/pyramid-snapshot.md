# Test pyramid snapshot

_Generated: `2026-04-20T09:06:37.550Z`_
_Source workflow run id: `24657912543`_
_Head SHA: `c36a1c6`_

## Counts by layer (`epic` / Allure `layer`)

| Layer | `epic` / `layer` | Cases | Passed | Failed | Broken | Skipped |
| --- | --- | --: | --: | --: | --: | --: |
| Unit (base) | `unit` | **63** | 63 | 0 | 0 | 0 |
| Integration (middle) | `api` / `integration` | **130** | 130 | 0 | 0 | 0 |
| UI / E2E (top) | `end-to-end` / `ui` | **26** | 26 | 0 | 0 | 0 |
| **Σ pyramid layers** | | **219** | | | | |

## Shares (pyramid layers only)

| Layer | Share of Σ layers |
| --- | ---: |
| Unit (base) | 28.8% |
| Integration (middle) | 59.4% |
| UI / E2E (top) | 11.9% |

```text
Unit (base)    ███████ (63)
Integration (middle) ██████████████ (130)
UI / E2E (top) ███ (26)
```

## Advisory (planning only)

- **Unit share** 28.8% is below the soft planning target (~45%+). Consider adding or restoring fast unit tests before expanding API/E2E.

## Quality gates (non-blocking, advisory)

These checks **never fail the workflow**; they surface in GitHub **Annotations** (warnings) and in the **Job summary** when `pyramid-check` runs (Test Report workflow).

| Gate id | Status | Detail |
| --- | --- | --- |
| PYRAMID_UNIT_SHARE_LOW | ⚠️ warning | unit ≥ 45% of Σ layers (actual 28.8%) |
| PYRAMID_E2E_SHARE_HIGH | ✓ ok | UI/E2E ≤ 28% of Σ layers (actual 11.9%) |
| PYRAMID_UNKNOWN_EPIC | ✓ ok | other epic count: 0 |

_Blocking failures: none (reserved for a future strict mode)._

Canonical policy: [`docs/testing/test-pyramid.md`](./test-pyramid.md).