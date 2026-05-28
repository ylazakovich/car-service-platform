# Car Service Platform

Bootstrap for an autoservice operations platform: Django + DRF backend, React + Vite frontend, Docker Compose.

## Documentation (canonical)

| Topic | Location |
|--------|----------|
| Spec index (product, tasks, SDD, open questions) | [`docs/spec/README.md`](docs/spec/README.md) |
| **Run** dev / prod-like / LAN & demo load | [`docs/spec/RUNBOOK.md`](docs/spec/RUNBOOK.md) |
| **`scripts/`** index (compose, db, demo SQL, MCP, Allure, CI) | [`docs/spec/SCRIPTS.md`](docs/spec/SCRIPTS.md) |
| Domain rules (statuses, money, PDF, dashboard) | [`docs/spec/DOMAIN_RULES.md`](docs/spec/DOMAIN_RULES.md) |
| Technical stack & architecture | [`docs/spec/TECH_STACK.md`](docs/spec/TECH_STACK.md) |
| Agent workflow (roles, scope, routing) | [`AGENTS.md`](AGENTS.md) |
| Optional: IDE agents — MCP / verify / bootstrap | [`docs/dev/agent-session-bootstrap.md`](docs/dev/agent-session-bootstrap.md) |
| **Test pyramid** (unit → API → UI/E2E) + machine snapshot | [`docs/testing/test-pyramid.md`](docs/testing/test-pyramid.md) · [`docs/testing/pyramid-snapshot.md`](docs/testing/pyramid-snapshot.md) |

### Test pyramid (live counts from Allure)

Policy and soft targets: [`docs/testing/test-pyramid.md`](docs/testing/test-pyramid.md). Full breakdown + advisory text: [`docs/testing/pyramid-snapshot.md`](docs/testing/pyramid-snapshot.md). JSON for tooling: [`docs/testing/pyramid-snapshot.json`](docs/testing/pyramid-snapshot.json). **Updates:** PRs publish report artifacts/comments only; the scheduled/manual **Test Pyramid Snapshot Refresh** workflow updates this table and snapshot files through a separate rolling PR from `main`. **Advisory quality gates:** `pyramid-check` stays warnings-only (see `docs/testing/test-pyramid.md` § Quality gates).

<!-- CSP_PYRAMID_TABLE_START -->
| Layer | `epic` / `layer` | Cases |
| :--- | :--- | ---: |
| Unit (base) | `unit` | **74** |
| Integration (middle) | `api` / `integration` | **163** |
| UI / E2E (top) | `end-to-end` / `ui` | **56** |
| **Σ pyramid layers** | | **293** |
<!-- CSP_PYRAMID_TABLE_END -->

Quick start (details in the runbook):

```bash
cp .env.example .env
bash scripts/compose/start.sh
```
