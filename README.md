# Car Service Platform

Bootstrap for an autoservice operations platform: Django + DRF backend, React + Vite frontend, Docker Compose.

## Documentation (canonical)

| Topic | Location |
|--------|----------|
| Spec index (product, tasks, SDD, open questions) | [`docs/spec/README.md`](docs/spec/README.md) |
| **Run** dev / prod-like / LAN & demo load | [`docs/spec/RUNBOOK.md`](docs/spec/RUNBOOK.md) |
| Domain rules (statuses, money, PDF, dashboard) | [`docs/spec/DOMAIN_RULES.md`](docs/spec/DOMAIN_RULES.md) |
| Technical stack & architecture | [`docs/spec/TECH_STACK.md`](docs/spec/TECH_STACK.md) |
| Agent session workflow (MCP, roles, verify) | [`AGENTS.md`](AGENTS.md) |

Quick start (details in the runbook):

```bash
cp .env.example .env
bash scripts/start.sh
```
