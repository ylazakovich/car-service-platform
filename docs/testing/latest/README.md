# Test pyramid snapshot

_Generated: `2026-06-02T07:19:28.911Z`_
_Source workflow run id: `26804505252`_
_Head SHA: `01c2f8b`_

## Counts by layer (`epic` / Allure `layer`)

| Layer | `epic` / `layer` | Cases | Passed | Failed | Broken | Skipped |
| --- | --- | --: | --: | --: | --: | --: |
| Unit (base) | `unit` | **231** | 231 | 0 | 0 | 0 |
| Integration (middle) | `api` / `integration` | **187** | 187 | 0 | 0 | 0 |
| UI / E2E (top) | `end-to-end` / `ui` | **117** | 117 | 0 | 0 | 0 |
| **Σ pyramid layers** | | **535** | | | | |

## Shares (pyramid layers only)

| Layer | Share of Σ layers |
| --- | ---: |
| Unit (base) | 43.2% |
| Integration (middle) | 35.0% |
| UI / E2E (top) | 21.9% |

```text
UI / E2E (top)         117             ██████████████
Integration (middle)   187        ███████████████████████
Unit (base)            231      ████████████████████████████
```

## Advisory (planning only)

- **Unit share** 43.2% is below the soft planning target (~45%+). Consider adding or restoring fast unit tests before expanding API/E2E.

## Quality gates (non-blocking, advisory)

These checks **never fail the workflow**; they surface in GitHub **Annotations** (warnings) and in the **Job summary** when `pyramid-check` runs (Test Report workflow).

| Gate id | Status | Detail |
| --- | --- | --- |
| PYRAMID_UNIT_SHARE_LOW | ⚠️ warning | unit ≥ 45% of Σ layers (actual 43.2%) |
| PYRAMID_E2E_SHARE_HIGH | ✓ ok | UI/E2E ≤ 28% of Σ layers (actual 21.9%) |
| PYRAMID_UNKNOWN_EPIC | ✓ ok | other epic count: 0 |

_Blocking failures: none (reserved for a future strict mode)._

Canonical policy: [`docs/testing/test-pyramid.md`](../test-pyramid.md).