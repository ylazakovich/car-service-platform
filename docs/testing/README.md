# Testing documentation

| Document | Purpose |
| -------- | ------- |
| [test-pyramid.md](./test-pyramid.md) | Canonical **test pyramid** (unit → API → UI/E2E), Allure `epic` mapping, soft planning targets. |
| [pyramid-snapshot.md](./pyramid-snapshot.md) | **Auto-generated** counts and shares from merged Allure results (refreshed by scheduled/manual **Test Pyramid Snapshot Refresh** via rolling PR; do not hand-edit). |
| [pyramid-snapshot.json](./pyramid-snapshot.json) | Machine-readable snapshot (same source as above). |
| [pyramid-quality-gates.json](./pyramid-quality-gates.json) | Advisory quality-gate result from `pyramid-check` (warnings list; workflow still exits 0). |
| [playwright-e2e-framework.md](./playwright-e2e-framework.md) | Playwright E2E policy: determinism, CI, no retries. |

Product specs live under [`docs/spec/`](../spec/README.md); this folder is **engineering testing** policy and artifacts.
