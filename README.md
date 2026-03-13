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

Default dev admin:

- Email: `admin@autoservice.local`
- Password: `admin12345`

## Stop

```bash
bash scripts/stop.sh
```
