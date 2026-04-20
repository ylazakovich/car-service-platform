# Repository scripts — layout and purpose

Canonical index of **`scripts/`** and related operational assets. Day-to-day commands for Docker and demo data are summarized in [`RUNBOOK.md`](./RUNBOOK.md); this file is the **full map** of paths after the `scripts/` reorganization (compose / db / media / demo / mcp / allure / ci / agents / dev).

## Directory layout

| Path | Role |
|------|------|
| **`scripts/compose/`** | Docker Compose lifecycle: dev stack, prod-like stack, LAN publish, logs. |
| **`scripts/db/`** | Postgres backup/restore, demo SQL load, `seed_staff` helper. |
| **`scripts/media/`** | Tarball backup/restore of Django `MEDIA_ROOT` in the backend volume. |
| **`scripts/demo/`** | Versioned **demo SQL** (`demo_data.sql`) loaded by `scripts/db/load-demo.sh` and CI before Playwright. |
| **`scripts/mcp/`** | MCP JSON profiles + `install-user.mjs` (Cursor/Claude merge). Not product runtime — see `docs/dev/`. |
| **`scripts/allure/`** | Allure Report 3 config (`allurerc.mjs`) for unified HTML reports in CI (`report.yml`). |
| **`scripts/ci/`** | CI helpers: Allure env fragments, junit summaries, E2E docker stats, merged Allure dirs. |
| **`scripts/agents/`** | IDE agent session bootstrap, `verify-agent-environment.mjs`, `new-run.sh`, workspace file. |
| **`scripts/dev/`** | Optional maintainer tools: Renovate local dry-run, MemPalace mine wrapper. |

## `scripts/compose/`

| Script | Purpose |
|--------|---------|
| `start.sh` | Dev stack: `docker-compose.yml` + `docker-compose.dev.yml`, optional DB backup if `db` is up. |
| `stop.sh` | `docker compose down` for the dev merge. |
| `start-prod.sh` | Prod-like stack (default compose only, no dev overlay). |
| `stop-prod.sh` | Tear down prod-like compose. |
| `publish-dev-to-lan.sh` | Adds LAN bindings + CORS/allowed hosts; merges `docker-compose.dev.lan.yml`. |
| `show-logs.sh` | Tail-style access to container logs (see script for service names). |

## `scripts/db/`

| Script | Purpose |
|--------|---------|
| `db-backup.sh` | `pg_dump` from running `db` service into `backups/`. |
| `db-restore.sh` | Restore from a backup artifact (see script usage). |
| `load-demo.sh` | Interactive load of `scripts/demo/demo_data.sql` into Postgres. |
| `load-demo-staff.sh` | Runs `seed_staff` in backend container (expects stack up). |

## `scripts/media/`

| Script | Purpose |
|--------|---------|
| `media-backup.sh` | Archive backend volume media to a tarball. |
| `media-restore.sh` | Restore from tarball produced by `media-backup.sh`. |

## `scripts/demo/`

| File | Purpose |
|------|---------|
| `demo_data.sql` | Large deterministic fixture set (repairs, purchases, dashboard data, E2E anchors such as TOR-1001). **Change here** → keep [`docs/testing/playwright-e2e-framework.md`](../testing/playwright-e2e-framework.md) and `frontend/e2e/e2e-seed.ts` in sync. |

## `scripts/mcp/`

| File | Purpose |
|------|---------|
| `install-user.mjs` | Merges `car-service-platform.*.json` into `~/.cursor/mcp.json` or `~/.claude/settings.json`. |
| `car-service-platform.default.json` | Empty `mcpServers` — avoids duplicating ECC plugin servers. |
| `car-service-platform.standalone.json` | Full stdio MCP list when no plugin. |
| `local.overrides.json.example` | Copy to `local.overrides.json` (gitignored) for tokens. |
| `README.md` | MCP install and deduplication notes (links to `docs/dev/mcp-deduplication.md`). |

## `scripts/allure/`

| File | Purpose |
|------|---------|
| `allurerc.mjs` | Allure Report 3 configuration (variables, environments, awesome plugin). CI invokes `npx allure generate … --config scripts/allure/allurerc.mjs` (see `.github/workflows/report.yml`). |

## `scripts/ci/`

Shell helpers for GitHub Actions: Allure metadata (`write-allure-environment.sh`, `write-allure-ci-env-fragment.sh`, `merge-allure-result-dirs.sh`), junit step summary, E2E docker stats sampler/summarize. **Workflow-local** Node for PR badges: `.github/scripts/allure-ci.mjs` (not moved — tied to Actions layout).

## `scripts/agents/`

| File | Purpose |
|------|---------|
| `bootstrap-agent-session.sh` | Agent-oriented env prep (includes optional `install-user.mjs`). |
| `bootstrap-environment.sh` | Narrower bootstrap variant (see script header). |
| `verify-agent-environment.mjs` | Checks Cursor/Claude/Codex MCP surfaces per `docs/dev/agent-session-bootstrap.md`. |
| `new-run.sh` | Creates `.agents/runs/<timestamp>-<slug>/` when capturing role artifacts. |
| `car-service-platform.code-workspace` | Optional multi-root workspace for agents. |

## `scripts/dev/`

| Script | Purpose |
|--------|---------|
| `renovate-local-verify.sh` | Dockerized `renovate --platform=local` against repo root. |
| `mempalace-mine-car-service-platform.sh` | Wrapper: `mempalace mine` from repository root only. |

## Conventions

- **Repo root**: all scripts `cd` to root via `ROOT_DIR` (two levels up from nested `scripts/<group>/`).
- **Do not commit** `scripts/mcp/local.overrides.json` (secrets).
- **E2E + demo SQL**: CI loads `scripts/demo/demo_data.sql` in `.github/workflows/pr.yml` after compose is healthy; locally use `bash scripts/db/load-demo.sh`.
