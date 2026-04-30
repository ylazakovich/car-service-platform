# Railway Deployment Guide

> Railway is the **staging/testing environment** for this project.
> The goal is to validate features and fixes before migrating to a permanent VPS.

## Architecture

Three Railway services in one project:

| Service | Root dir | Port | Domain |
|---------|----------|------|--------|
| backend | `backend/` | 8000 | `backend-production-9f32.up.railway.app` |
| frontend | `frontend/` | dynamic `$PORT` | `torson.up.railway.app` |
| db | Railway PostgreSQL | 5432 | internal only |

Frontend nginx proxies `/api/` and `/media/` to backend over Railway's **private IPv6 network** (`backend.railway.internal`).

---

## First-time Setup

### 1. Create Railway project

Railway Dashboard → New Project → Empty Project.

### 2. Add PostgreSQL

New Service → Database → PostgreSQL. Note the values in its **Variables** tab — you will need them in step 5.

### 3. Add backend service

New Service → Empty Service → Settings → Source → connect GitHub repo, set **Root Directory** to `backend`.
Railway auto-detects `backend/railway.toml`.

### 4. Add frontend service

New Service → Empty Service → Settings → Source → connect same repo, set **Root Directory** to `frontend`.
Railway auto-detects `frontend/railway.toml`.

### 5. Set environment variables

**Backend service → Variables:**

```
DJANGO_SECRET_KEY=<generate: python -c "import secrets; print(secrets.token_urlsafe(50))">
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=<backend-domain>.up.railway.app,healthcheck.railway.app
CORS_ALLOWED_ORIGINS=https://<frontend-domain>.up.railway.app
FRONTEND_URL=https://<frontend-domain>.up.railway.app

# Copy exact values from PostgreSQL service → Variables tab (reference vars may not resolve)
POSTGRES_DB=railway
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<from postgres service>
POSTGRES_HOST=<from postgres service>
POSTGRES_PORT=5432

PORT=8000
GUNICORN_WORKERS=2
GUNICORN_BIND=[::]:8000

ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<strong-password>
STAFF_EMAIL=staff@yourdomain.com
STAFF_PASSWORD=<strong-password>

LOG_LEVEL=INFO
LOG_FORMAT=text
MEDIA_ROOT=/data/media
```

> **Important:** Railway reference variables (`${{Postgres.PGDATABASE}}`) may not resolve.
> Copy the actual values directly from the PostgreSQL service Variables tab.

> **Important:** `GUNICORN_BIND=[::]:8000` is required because Railway's private network
> routes inter-service traffic over IPv6. Without it nginx gets 504 timeouts.

**Frontend service → Variables:**

```
BACKEND_URL=http://backend.railway.internal:8000
PORT=80
CORS_ALLOWED_ORIGINS=https://<frontend-domain>.up.railway.app
FRONTEND_URL=https://<frontend-domain>.up.railway.app
```

### 6. Set custom domain (optional)

Frontend → Settings → Networking → edit the generated subdomain to your preferred name (e.g. `torson`).
After renaming update `CORS_ALLOWED_ORIGINS` and `FRONTEND_URL` on the **backend** service.

### 7. Attach Volume (media files)

Backend service → Volumes → Add Volume → mount path: `/data/media`.
Persists uploaded PDFs and images across redeploys (~$0.25/GB/month).

### 8. Link Railway CLI locally

```bash
npm install -g @railway/cli
railway login

cd backend
railway link   # select project → backend service

cd ../frontend
railway link   # select project → frontend service
```

---

## Deploying

```bash
# Full redeploy (backend + frontend)
bash scripts/deploy/deploy.sh

# Backend only
bash scripts/deploy/deploy.sh --backend-only

# Frontend only
bash scripts/deploy/deploy.sh --frontend-only
```

The script pushes `main` to GitHub then runs `railway up --detach` from each service directory.

---

## Startup sequence (automatic on each backend deploy)

1. `python manage.py migrate --noinput` — applies new DB migrations
2. `python manage.py collectstatic --noinput`
3. `python manage.py seed_admin` — creates admin account if missing (idempotent)
4. `python manage.py seed_staff` — creates staff account if missing (idempotent)
5. `gunicorn config.wsgi:application -c gunicorn.conf.py`

---

## Health checks

| Service | Endpoint | Timeout |
|---------|----------|---------|
| backend | `GET /api/health` | 300 s |
| frontend | `GET /` | 60 s |

---

## Database backup

```bash
# Get DATABASE_URL from PostgreSQL service → Variables tab
pg_dump "postgresql://postgres:<password>@<host>:<port>/railway" \
  --no-owner --no-acl -Fc -f backup.dump

# Restore to another server
pg_restore -d "postgresql://user:pass@host:5432/dbname" --no-owner backup.dump
```

---

## Troubleshooting

### Frontend returns 504 after backend redeploy

nginx resolves `backend.railway.internal` DNS at startup and caches the IP. When backend
gets a new container (redeploy), its internal IP changes — nginx still uses the old one.

**Fix:** redeploy frontend after backend:
```bash
bash scripts/deploy/deploy.sh --frontend-only
```

### `Invalid HTTP_HOST header: 'healthcheck.railway.app'`

Add `healthcheck.railway.app` to `DJANGO_ALLOWED_HOSTS` in backend Variables.

### gunicorn `Address already in use` on `[::]:8000`

Do not use `bind = ["0.0.0.0:8000", "[::]:8000"]` — it causes a conflict on Linux
because `[::]` already covers IPv4 via dual-stack. Use only `GUNICORN_BIND=[::]:8000`.

### nginx `io_setup() failed (Resource temporarily unavailable)`

Railway's seccomp policy blocks the Linux AIO syscall. Fixed via `frontend/nginx-main.conf`
which sets `aio off; sendfile off; worker_processes 1;`.

### nginx `send() failed (111: Connection refused) while resolving, resolver: 127.0.0.11`

`127.0.0.11` is Docker's embedded DNS — it is not available on Railway's Wireguard network.
Do not add a `resolver` directive to nginx.conf. nginx resolves `backend.railway.internal`
via the system resolver at startup, which works correctly on Railway.

---

## Rollback

Railway Dashboard → service → Deployments → previous deploy → Redeploy.

---

## Secrets

All production secrets live in the Railway Dashboard. Never commit them to the repository.
Deploy runs via Railway CLI — no webhook URLs or `.env.railway.local` file needed.
