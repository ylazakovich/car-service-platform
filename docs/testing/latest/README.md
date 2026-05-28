# Test pyramid snapshot

_Generated: `2026-05-28T11:04:54.057Z`_
_Source workflow run id: `26570705437`_
_Head SHA: `0b8b77d`_

## Counts by layer (`epic` / Allure `layer`)

| Layer | `epic` / `layer` | Cases | Passed | Failed | Broken | Skipped |
| --- | --- | --: | --: | --: | --: | --: |
| Unit (base) | `unit` | **225** | 225 | 0 | 0 | 0 |
| Integration (middle) | `api` / `integration` | **163** | 163 | 0 | 0 | 0 |
| UI / E2E (top) | `end-to-end` / `ui` | **60** | 60 | 0 | 0 | 0 |
| **Σ pyramid layers** | | **448** | | | | |

## Shares (pyramid layers only)

| Layer | Share of Σ layers |
| --- | ---: |
| Unit (base) | 50.2% |
| Integration (middle) | 36.4% |
| UI / E2E (top) | 13.4% |

```text
UI / E2E (top)          60                ███████
Integration (middle)   163          ████████████████████
Unit (base)            225      ████████████████████████████
```

## Advisory (planning only)

- Pyramid layer shares sit within the **soft** planning band documented in `docs/testing/test-pyramid.md` (not a merge gate).

## Quality gates (non-blocking, advisory)

These checks **never fail the workflow**; they surface in GitHub **Annotations** (warnings) and in the **Job summary** when `pyramid-check` runs (Test Report workflow).

| Gate id | Status | Detail |
| --- | --- | --- |
| PYRAMID_UNIT_SHARE_LOW | ✓ ok | unit ≥ 45% of Σ layers (actual 50.2%) |
| PYRAMID_E2E_SHARE_HIGH | ✓ ok | UI/E2E ≤ 28% of Σ layers (actual 13.4%) |
| PYRAMID_UNKNOWN_EPIC | ✓ ok | other epic count: 0 |

_Blocking failures: none (reserved for a future strict mode)._

Canonical policy: [`docs/testing/test-pyramid.md`](../test-pyramid.md).