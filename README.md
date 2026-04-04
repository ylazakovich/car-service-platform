# Car Service Platform

Bootstrap foundation for an autoservice operations platform.

## Included in this branch

- Django backend with custom user model, admin, auth endpoints and health/version endpoints
- React + Vite frontend with separate staff and client portal surfaces
- Docker Compose foundation for local development
- CI-compatible project structure

## Quick Start

```bash
cp .env.example .env
bash scripts/start.sh
```

Services:

- Frontend: `http://localhost:4173`
- Backend health: `http://localhost:8000/api/health`
- Django Admin: `http://localhost:8000/admin/`
- Client portal example: `http://localhost:4173/portal/DEMO-CODE`

### Docker dev stack (hot reload)

Backend and frontend pick up code changes without rebuilding images (bind mounts + Django `runserver` + Vite):

```bash
bash scripts/start-dev.sh
```

- App (Vite): `http://localhost:4173` by default (same host port as prod static build; override with `FRONTEND_DEV_PORT` in `.env`)
- API: still `http://localhost:8000` (browser uses `/api` via Vite proxy)
- Stop: `bash scripts/stop-dev.sh`

Uses `docker-compose.dev.yml` merged with `docker-compose.yml` (dev overrides frontend ports to Vite only).

**Do not run** `start.sh` and `start-dev.sh` **at the same time** unless you change `FRONTEND_PORT` or `FRONTEND_DEV_PORT` — both default to host **4173**.

**Cannot log in (dev / Vite in Docker):** ensure `DJANGO_ALLOWED_HOSTS` contains `backend` (default in `docker-compose.yml`). Otherwise proxied `/api` requests use `Host: backend` and Django returns 400 — CSRF/session cookies never stick.

**Port 4173 busy:** stop the prod stack (`bash scripts/stop.sh`) or set `FRONTEND_DEV_PORT=5173` (or another free port) in `.env`. Default CORS also allows `http://localhost:5173` for local `npm run dev` against the Docker backend.

Default dev admin:

- Email: `admin@autoservice.local`
- Password: `admin12345`

## Stop

```bash
bash scripts/stop.sh
```
