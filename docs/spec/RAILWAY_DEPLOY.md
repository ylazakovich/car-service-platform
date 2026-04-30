# Railway Deployment Guide

## Architecture on Railway

Three Railway services in one project:

| Service | Root dir | Dockerfile | Port |
|---------|----------|------------|------|
| backend | `backend/` | `backend/Dockerfile` | 8000 |
| frontend | `frontend/` | `frontend/Dockerfile` | 80 |
| db | Railway PostgreSQL plugin | — | 5432 |

Backend exposes `/api/health` as health check. Frontend serves the React SPA via nginx and proxies `/api/` and `/media/` to the backend over Railway's private network.

## First-time Setup

### 1. Create Railway project

1. Go to [railway.app](https://railway.app) → New Project
2. Add **PostgreSQL** plugin (provides `${{Postgres.*}}` variable references)

### 2. Add backend service

- Source: this GitHub repository
- Root directory: `backend`
- Railway auto-detects `backend/railway.toml`

### 3. Add frontend service

- Source: same repository
- Root directory: `frontend`
- Railway auto-detects `frontend/railway.toml`

### 4. Attach Volume to backend (media files)

Backend service → Volumes → Add Volume → mount path: `/data/media`

This volume persists uploaded files (PDFs, images) across redeploys. Costs ~$0.25/GB/month.

### 5. Set environment variables

Set the following in **backend service** → Variables:

```
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=<generate: python -c "import secrets; print(secrets.token_urlsafe(50))">
DJANGO_ALLOWED_HOSTS=<your-backend>.up.railway.app
CORS_ALLOWED_ORIGINS=https://<your-frontend>.up.railway.app
FRONTEND_URL=https://<your-frontend>.up.railway.app
MEDIA_ROOT=/data/media

POSTGRES_DB=${{Postgres.PGDATABASE}}
POSTGRES_USER=${{Postgres.PGUSER}}
POSTGRES_PASSWORD=${{Postgres.PGPASSWORD}}
POSTGRES_HOST=${{Postgres.PGHOST}}
POSTGRES_PORT=${{Postgres.PGPORT}}

GUNICORN_WORKERS=2
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<strong-password>
STAFF_EMAIL=staff@yourdomain.com
STAFF_PASSWORD=<strong-password>

LOG_LEVEL=INFO
LOG_FORMAT=json
```

Set the following in **frontend service** → Variables:

```
BACKEND_URL=http://${{backend.RAILWAY_PRIVATE_DOMAIN}}:8000
```

> `${{backend.RAILWAY_PRIVATE_DOMAIN}}` is a Railway reference variable — it auto-resolves to the backend's internal hostname on Railway's private network.

### 6. Deploy

```bash
# Copy webhook URLs from Railway dashboard (service → Settings → Deploy Hooks)
cp .env.railway.local.example .env.railway.local
# Edit .env.railway.local and fill in both webhook URLs

# First deploy
bash scripts/deploy/deploy.sh
```

## Subsequent Deploys

```bash
bash scripts/deploy/deploy.sh
```

The script:
1. `git push origin main`
2. Triggers Railway redeploy for backend via webhook
3. Triggers Railway redeploy for frontend via webhook

## Startup sequence (automatic)

On each backend deploy, the container runs in order:
1. `python manage.py migrate --noinput` — applies DB migrations
2. `python manage.py collectstatic --noinput` — builds static files (served by WhiteNoise)
3. `python manage.py seed_admin` — creates admin account if missing
4. `python manage.py seed_staff` — creates staff account if missing
5. `gunicorn config.wsgi:application -c gunicorn.conf.py` — starts server

## Health checks

| Service | Endpoint | Expected |
|---------|----------|---------|
| backend | `GET /api/health` | `200 OK` (also checks DB connection, returns `503` if DB is down) |
| frontend | `GET /` | `200 OK` |

Railway waits up to 300 s (backend) / 60 s (frontend) for health checks to pass before marking deploy successful.

## Environment variable reference

See `# Railway production` section in `.env.example` at the repository root for a full commented reference.

## Secrets

- `.env.railway.local` — stores deploy webhook URLs locally; **never commit this file** (it is gitignored)
- All production secrets live in the Railway dashboard, never in the repository

## Rollback

Railway keeps previous deployments. To roll back: Railway Dashboard → service → Deployments → click the previous deploy → Redeploy.
