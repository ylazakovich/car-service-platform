# Runbook — local development, production-like stack, LAN testing

Canonical operational spec for **how to run** `car-service-platform`. Root [`README.md`](../../README.md) is a short pointer here.

## Prerequisites

- Docker and Docker Compose
- `.env` in the repository root (copy from `.env.example`)

```bash
cp .env.example .env
```

## Compose files (mental model)

- `docker-compose.yml` — base stack (db, backend, frontend service definitions).
- `docker-compose.dev.yml` — merged by **`scripts/start.sh`**: Vite dev server, hot reload, bind mounts.
- `docker-compose.dev.lan.yml` — merged by **`scripts/publish-dev-to-lan.sh`**: bind frontend/backend on all interfaces for phones on the same Wi‑Fi.

`COMPOSE_FILE` defaults inside scripts; you normally do not set it by hand unless debugging.

---

## A) Development stack (hot reload) — primary day-to-day

**Start**

```bash
bash scripts/start.sh
```

- Uses `docker-compose.yml` **and** `docker-compose.dev.yml`.
- Optional DB backup runs if `db` is already up (see `scripts/db-backup.sh`).
- Frontend (Vite): `http://localhost:${FRONTEND_DEV_PORT:-4173}`
- Backend: `http://localhost:${BACKEND_PORT:-8000}` (browser talks to `/api` via Vite proxy)
- Django Admin: `http://localhost:${BACKEND_PORT:-8000}/admin/`

**Stop**

```bash
bash scripts/stop.sh
```

- Runs `docker compose down --remove-orphans` with the same dev `COMPOSE_FILE` merge as `start.sh`.

**Load demo SQL (optional)**

```bash
bash scripts/load-demo.sh
```

- Interactive confirmation (`yes` required).
- Pipes `demo/demo_data.sql` into Postgres via `docker compose exec -T db psql`.
- Useful for dashboard charts, registers, and E2E-aligned fixtures (see script output for counts).

### Dev pitfalls (read once)

1. **Do not run** `scripts/start-prod.sh` and **`scripts/start.sh` at the same time** on default ports — both want host **4173** unless you change `FRONTEND_PORT` / `FRONTEND_DEV_PORT` in `.env`.
2. **Login / session broken with Vite in Docker:** ensure `DJANGO_ALLOWED_HOSTS` includes `backend` (default in compose). Proxied `/api` uses `Host: backend`; if Django rejects the host, cookies and CSRF fail.
3. **Port 4173 busy:** stop prod (`bash scripts/stop-prod.sh`) or set e.g. `FRONTEND_DEV_PORT=5173` and extend `CORS_DEV_ORIGINS` if needed (see `.env.example`).

### Default dev credentials (from demo / `.env.example`)

- Admin: `admin@autoservice.local` / `admin12345`
- Staff (when seeded): `staff@autoservice.local` / `staff12345`

Client portal example URL shape (see demo data for real tokens): `http://localhost:4173/portal/<token>`.

---

## B) Production-like stack (static frontend build)

**Start**

```bash
bash scripts/start-prod.sh
```

- Uses **only** `docker-compose.yml` (no `docker-compose.dev.yml`): nginx + static frontend build, gunicorn-style production path as defined in compose.

**Stop**

```bash
bash scripts/stop-prod.sh
```

- `docker compose down --remove-orphans` on the default compose file.

**URLs**

- Frontend: `http://localhost:${FRONTEND_PORT:-4173}`
- Backend / Admin: same pattern as dev on `${BACKEND_PORT:-8000}`.

---

## C) LAN / mobile — share the **dev** stack on your network

Default **`start.sh`** keeps bindings suitable for localhost. To open the app from phones or tablets on the same LAN:

```bash
bash scripts/publish-dev-to-lan.sh
```

What it does (see script for details):

- Detects LAN IPv4 (macOS / Linux heuristics) or uses `DEV_LAN_IP` from `.env`.
- Appends `http://<LAN-IP>:<FRONTEND_DEV_PORT>` to `CORS_DEV_ORIGINS` for the compose session.
- Extends `DJANGO_ALLOWED_HOSTS` with the LAN IP.
- Sets `FRONTEND_DEV_URL` for Django (emails, admin “View site”).
- Sets `COMPOSE_FILE` to include `docker-compose.dev.lan.yml` and **recreates** `frontend` and `backend`.

**Revert to localhost-only dev**

```bash
bash scripts/start.sh
```

---

## D) Where this is referenced

- CI: `.github/workflows/pr.yml`, `.github/actions/compose-up` — health checks and demo load for E2E.
- Optional **IDE AI agents** (MCP / verify): `docs/dev/agent-session-bootstrap.md`. Role workflow: root `AGENTS.md`.

For **what** the product enforces (money, statuses, PDF), use [`DOMAIN_RULES.md`](./DOMAIN_RULES.md). For **stack** choices, use [`TECH_STACK.md`](./TECH_STACK.md).
