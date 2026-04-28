# Test pyramid snapshot

_Generated: `2026-04-26T13:43:22.535Z`_
_Source workflow run id: `24958034697`_
_Head SHA: `69e458d`_

## Counts by layer (`epic` / Allure `layer`)

| Layer | `epic` / `layer` | Cases | Passed | Failed | Broken | Skipped |
| --- | --- | --: | --: | --: | --: | --: |
| Unit (base) | `unit` | **64** | 64 | 0 | 0 | 0 |
| Integration (middle) | `api` / `integration` | **139** | 139 | 0 | 0 | 0 |
| UI / E2E (top) | `end-to-end` / `ui` | **26** | 26 | 0 | 0 | 0 |
| **Σ pyramid layers** | | **229** | | | | |

## Shares (pyramid layers only)

| Layer | Share of Σ layers |
| --- | ---: |
| Unit (base) | 27.9% |
| Integration (middle) | 60.7% |
| UI / E2E (top) | 11.4% |

```text
Unit (base)    ███████ (64)
Integration (middle) ███████████████ (139)
UI / E2E (top) ███ (26)
```

## Advisory (planning only)

- **Unit share** 27.9% is below the soft planning target (~45%+). Consider adding or restoring fast unit tests before expanding API/E2E.

## Quality gates (non-blocking, advisory)

These checks **never fail the workflow**; they surface in GitHub **Annotations** (warnings) and in the **Job summary** when `pyramid-check` runs (Test Report workflow).

| Gate id | Status | Detail |
| --- | --- | --- |
| PYRAMID_UNIT_SHARE_LOW | ⚠️ warning | unit ≥ 45% of Σ layers (actual 27.9%) |
| PYRAMID_E2E_SHARE_HIGH | ✓ ok | UI/E2E ≤ 28% of Σ layers (actual 11.4%) |
| PYRAMID_UNKNOWN_EPIC | ✓ ok | other epic count: 0 |

_Blocking failures: none (reserved for a future strict mode)._

Canonical policy: [`docs/testing/test-pyramid.md`](./test-pyramid.md).