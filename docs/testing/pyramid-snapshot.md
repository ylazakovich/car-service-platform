# Test pyramid snapshot

_Generated: `2026-05-22T06:34:52.224Z`_
_Source workflow run id: `26272357511`_
_Head SHA: `9b77972`_

## Counts by layer (`epic` / Allure `layer`)

| Layer | `epic` / `layer` | Cases | Passed | Failed | Broken | Skipped |
| --- | --- | --: | --: | --: | --: | --: |
| Unit (base) | `unit` | **74** | 74 | 0 | 0 | 0 |
| Integration (middle) | `api` / `integration` | **162** | 162 | 0 | 0 | 0 |
| UI / E2E (top) | `end-to-end` / `ui` | **0** | 0 | 0 | 0 | 0 |
| **Σ pyramid layers** | | **236** | | | | |

## Shares (pyramid layers only)

| Layer | Share of Σ layers |
| --- | ---: |
| Unit (base) | 31.4% |
| Integration (middle) | 68.6% |
| UI / E2E (top) | 0.0% |

```text
Unit (base)    ████████ (74)
Integration (middle) ████████████████ (162)
UI / E2E (top) █ (0)
```

## Advisory (planning only)

- **Unit share** 31.4% is below the soft planning target (~45%+). Consider adding or restoring fast unit tests before expanding API/E2E.

## Quality gates (non-blocking, advisory)

These checks **never fail the workflow**; they surface in GitHub **Annotations** (warnings) and in the **Job summary** when `pyramid-check` runs (Test Report workflow).

| Gate id | Status | Detail |
| --- | --- | --- |
| PYRAMID_UNIT_SHARE_LOW | ⚠️ warning | unit ≥ 45% of Σ layers (actual 31.4%) |
| PYRAMID_E2E_SHARE_HIGH | ✓ ok | UI/E2E ≤ 28% of Σ layers (actual 0.0%) |
| PYRAMID_UNKNOWN_EPIC | ✓ ok | other epic count: 0 |

_Blocking failures: none (reserved for a future strict mode)._

Canonical policy: [`docs/testing/test-pyramid.md`](./test-pyramid.md).