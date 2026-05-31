# Runbook — local development, production-like stack, LAN testing

Canonical operational spec for **how to run** `car-service-platform`. Root [`README.md`](../../README.md) is a short pointer here. Full script index and folder layout: [`SCRIPTS.md`](./SCRIPTS.md).

## Prerequisites

- Docker and Docker Compose
- `.env` in the repository root (copy from `.env.example`)

```bash
cp .env.example .env
```

## Compose files (mental model)

- `docker-compose.yml` — base stack (db, backend, frontend service definitions).
- `docker-compose.dev.yml` — merged by **`scripts/compose/start.sh`**: Vite dev server, hot reload, bind mounts.
- `docker-compose.dev.lan.yml` — merged by **`scripts/compose/publish-dev-to-lan.sh`**: bind frontend/backend on all interfaces for phones on the same Wi‑Fi.

`COMPOSE_FILE` defaults inside scripts; you normally do not set it by hand unless debugging.

---

## A) Development stack (hot reload) — primary day-to-day

**Start**

```bash
bash scripts/compose/start.sh
```

- Uses `docker-compose.yml` **and** `docker-compose.dev.yml`.
- Optional DB backup runs if `db` is already up (see `scripts/db/db-backup.sh`).
- Frontend (Vite): `http://localhost:${FRONTEND_DEV_PORT:-4173}`
- Backend: `http://localhost:${BACKEND_PORT:-8000}` (browser talks to `/api` via Vite proxy)
- Django Admin: `http://localhost:${BACKEND_PORT:-8000}/admin/`

**Stop**

```bash
bash scripts/compose/stop.sh
```

- Runs `docker compose down --remove-orphans` with the same dev `COMPOSE_FILE` merge as `start.sh`.

**Load demo SQL (optional)**

```bash
bash scripts/db/load-demo.sh
```

- Interactive confirmation (`yes` required).
- Pipes `scripts/demo/demo_data.sql` into Postgres via `docker compose exec -T db psql`.
- Useful for dashboard charts, registers, and E2E-aligned fixtures (see script output for counts).

**Generate fresh Datafaker demo data (optional)**

```bash
DATAFAKER_DEMO_SEED=123 DATAFAKER_DEMO_COUNT=10 bash scripts/db/load-datafaker-demo.sh
```

- Interactive confirmation (`yes` required).
- Runs the Java CLI in `tools/datafaker-generator/` inside Docker Compose by default; use `DATAFAKER_DEMO_GENERATOR=host` to run a host `gradle` instead.
- Imports it with `python manage.py import_datafaker_demo ... --replace` inside the backend container.
- Default Docker mode does not require host Java/Gradle; the first run builds/pulls the Gradle JDK 17 generator image and reuses the `datafaker_gradle_cache` volume.
- The same seed/count/profile recreates a connected customer → vehicle → repair → purchase dataset.

**Regenerate demo invoice PDF (optional, for `docs/samples/sample-invoice-pl-01-demo.pdf`)**

```bash
docker compose exec -T backend python -c "
import runpy
from pathlib import Path
ns = runpy.run_path('/app/purchases/invoice_parse/demo_invoice_pdf.py')
Path('/tmp/sample-invoice-pl-01-demo.pdf').write_bytes(ns['build_sample_pl_table_invoice_pdf_bytes']())
"
docker compose cp backend:/tmp/sample-invoice-pl-01-demo.pdf docs/samples/sample-invoice-pl-01-demo.pdf
```

- With a local venv that has `reportlab`, you can instead run `python3 scripts/demo/generate_demo_invoice_pdf.py` from the repo root.

### Dev pitfalls (read once)

1. **Do not run** `scripts/compose/start-prod.sh` and **`scripts/compose/start.sh` at the same time** on default ports — both want host **4173** unless you change `FRONTEND_PORT` / `FRONTEND_DEV_PORT` in `.env`.
2. **Login / session broken with Vite in Docker:** ensure `DJANGO_ALLOWED_HOSTS` includes `backend` (default in compose). Proxied `/api` uses `Host: backend`; if Django rejects the host, cookies and CSRF fail.
3. **Port 4173 busy:** stop prod (`bash scripts/compose/stop-prod.sh`) or set e.g. `FRONTEND_DEV_PORT=5173` and extend `CORS_DEV_ORIGINS` if needed (see `.env.example`).

### Default dev credentials (from demo / `.env.example`)

- Admin: `admin@autoservice.local` / `admin12345`
- Staff (when seeded): `staff@autoservice.local` / `staff12345`

Client portal example URL shape (see demo data for real tokens): `http://localhost:4173/portal/<token>`.

---

## B) Production-like stack (static frontend build)

**Start**

```bash
bash scripts/compose/start-prod.sh
```

- Uses **only** `docker-compose.yml` (no `docker-compose.dev.yml`): nginx + static frontend build, gunicorn-style production path as defined in compose.

**Stop**

```bash
bash scripts/compose/stop-prod.sh
```

- `docker compose down --remove-orphans` on the default compose file.

**URLs**

- Frontend: `http://localhost:${FRONTEND_PORT:-4173}`
- Backend / Admin: same pattern as dev on `${BACKEND_PORT:-8000}`.

---

## C) LAN / mobile — share the **dev** stack on your network

Default **`scripts/compose/start.sh`** keeps bindings suitable for localhost. To open the app from phones or tablets on the same LAN:

```bash
bash scripts/compose/publish-dev-to-lan.sh
```

What it does (see script for details):

- Detects LAN IPv4 (macOS / Linux heuristics) or uses `DEV_LAN_IP` from `.env`.
- Appends `http://<LAN-IP>:<FRONTEND_DEV_PORT>` to `CORS_DEV_ORIGINS` for the compose session.
- Extends `DJANGO_ALLOWED_HOSTS` with the LAN IP.
- Sets `FRONTEND_DEV_URL` for Django (emails, admin “View site”).
- Sets `COMPOSE_FILE` to include `docker-compose.dev.lan.yml` and **recreates** `frontend` and `backend`.
- Exports `DEV_LAN_IP` so compose can pass **`VITE_DEV_SERVER_ORIGIN`** into the Vite dev container (`server.origin` + `server.allowedHosts` for `http://<LAN-IP>:<port>` — avoids blocked host / wrong asset URLs on phones).

### Local `npm run dev` (host Vite) + phone — not Docker

`publish-dev-to-lan.sh` only adjusts env for **Compose**. If you run **`cd frontend && npm run dev`** and open **`http://<your-LAN-IPv4>:5173`** from a phone:

1. **Vite env:** `VITE_DEV_AUTO_LOGIN` and other `VITE_*` vars live in the **repo root** `.env`; Vite is configured with `envDir` pointing there so dev auto-login matches Docker.
2. **Django:** append **`http://<LAN-IPv4>:5173`** to **`CORS_ALLOWED_ORIGINS`** and the same IPv4 (host only, no scheme) to **`DJANGO_ALLOWED_HOSTS`**, then **restart the backend** — otherwise login and `/api` calls fail (CORS / CSRF). Update both when your Wi‑Fi IP changes.

### LAN is plain HTTP — “secure context” and APIs

Opening the dev app as **`http://<LAN-IPv4>:<FRONTEND_DEV_PORT>`** (typical phone URL) is **not** a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts). Browsers only treat **HTTPS** and **`http://localhost`** (and a few exceptions) as secure.

Implications for this repo:

- **`crypto.randomUUID()`** is **undefined** in that mode on Safari / iOS (and similar WebKit builds). Code that assumed it (e.g. React keys for repair service line drafts) would throw at startup → blank or error screen until replaced with **`frontend/src/lib/randomUuid.ts`**, which falls back to **`crypto.getRandomValues`**-based UUID v4 when needed.
- Prefer **`randomUuid()`** from that helper for any **new** client-only IDs on staff UI paths that must work over **LAN HTTP**, not bare `crypto.randomUUID()`.
- Other “secure context only” APIs may also be missing or restricted; if something works on `localhost` but fails on the phone over HTTP, check MDN secure-context rules first.

**Revert to localhost-only dev**

```bash
bash scripts/compose/start.sh
```

---

## D) Where this is referenced

- CI: `.github/workflows/pr.yml`, `.github/actions/compose-up` — health checks and demo load for E2E.
- Optional **IDE AI agents** (MCP / verify): `docs/dev/agent-session-bootstrap.md`. Role workflow: root `AGENTS.md`.

For **what** the product enforces (money, statuses, PDF), use [`DOMAIN_RULES.md`](./DOMAIN_RULES.md). For **stack** choices, use [`TECH_STACK.md`](./TECH_STACK.md).
