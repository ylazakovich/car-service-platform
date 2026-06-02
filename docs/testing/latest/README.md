# Test pyramid snapshot

_Generated: `2026-06-02T09:59:06.750Z`_
_Source workflow run id: `26812272049`_
_Head SHA: `b058f33`_

## Counts by layer (`epic` / Allure `layer`)

| Layer | `epic` / `layer` | Cases | Passed | Failed | Broken | Skipped |
| --- | --- | --: | --: | --: | --: | --: |
| Unit (base) | `unit` | **249** | 249 | 0 | 0 | 0 |
| Integration (middle) | `api` / `integration` | **187** | 187 | 0 | 0 | 0 |
| UI / E2E (top) | `end-to-end` / `ui` | **117** | 117 | 0 | 0 | 0 |
| **Σ pyramid layers** | | **553** | | | | |

## Shares (pyramid layers only)

| Layer | Share of Σ layers |
| --- | ---: |
| Unit (base) | 45.0% |
| Integration (middle) | 33.8% |
| UI / E2E (top) | 21.2% |

```text
UI / E2E (top)         117             █████████████
Integration (middle)   187         █████████████████████
Unit (base)            249      ████████████████████████████
```

## Advisory (planning only)

- Pyramid layer shares sit within the **soft** planning band documented in `docs/testing/test-pyramid.md` (not a merge gate).

## Quality gates (non-blocking, advisory)

These checks **never fail the workflow**; they surface in GitHub **Annotations** (warnings) and in the **Job summary** when `pyramid-check` runs (Test Report workflow).

| Gate id | Status | Detail |
| --- | --- | --- |
| PYRAMID_UNIT_SHARE_LOW | ✓ ok | unit ≥ 45% of Σ layers (actual 45.0%) |
| PYRAMID_E2E_SHARE_HIGH | ✓ ok | UI/E2E ≤ 28% of Σ layers (actual 21.2%) |
| PYRAMID_UNKNOWN_EPIC | ✓ ok | other epic count: 0 |

_Blocking failures: none (reserved for a future strict mode)._

Canonical policy: [`docs/testing/test-pyramid.md`](../test-pyramid.md).