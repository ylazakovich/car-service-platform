# Testing documentation

| Document | Purpose |
| -------- | ------- |
| [test-pyramid.md](./test-pyramid.md) | Canonical **test pyramid** (unit → API → UI/E2E), Allure `epic` mapping, soft planning targets. |
| [latest/README.md](./latest/README.md) | **Auto-generated latest accepted `main` snapshot** from merged Allure results (refreshed by scheduled/manual **Test Pyramid Snapshot Refresh** via rolling PR; do not hand-edit). |
| [latest/pyramid-snapshot.json](./latest/pyramid-snapshot.json) | Machine-readable latest accepted `main` snapshot (same source as above). |
| [latest/pyramid-quality-gates.json](./latest/pyramid-quality-gates.json) | Advisory quality-gate result for the latest accepted `main` snapshot (`warnings[]`; workflow still exits 0). |
| [playwright-e2e-framework.md](./playwright-e2e-framework.md) | Playwright E2E policy: determinism, CI, no retries. |

Product specs live under [`docs/spec/`](../spec/README.md); this folder is **engineering testing** policy and artifacts.
