#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

if [[ ! -f .env ]]; then
  echo "Error: .env file not found."
  echo "Create it from template:"
  echo "  cp .env.example .env"
  exit 1
fi

set -a
source .env
set +a

: "${FRONTEND_DEV_PORT:=4173}"

if command -v lsof >/dev/null 2>&1; then
  if lsof -nP -iTCP:"${FRONTEND_DEV_PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Error: TCP port ${FRONTEND_DEV_PORT} is already in use on this machine." >&2
    echo "Often the prod stack (start-prod.sh) or another app is using this port. Stop it, or pick a free port in .env, e.g.:" >&2
    echo "  FRONTEND_DEV_PORT=5173" >&2
    echo "Then add the same origin to CORS_DEV_ORIGINS if you use a non-default port (see .env.example)." >&2
    exit 1
  fi
fi

export GIT_COMMIT
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

export COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml:docker-compose.dev.yml}"

if docker compose ps db 2>/dev/null | grep -q "Up"; then
  bash "${ROOT_DIR}/scripts/db-backup.sh" || true
fi

export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

docker compose up -d --build

echo ""
echo "${COMPOSE_PROJECT_NAME:-car-service-platform} (dev / hot-reload) is up:"
echo "  Frontend (Vite): http://localhost:${FRONTEND_DEV_PORT:-4173}"
echo "  Backend (runserver): http://localhost:${BACKEND_PORT:-8000}"
echo "  Admin: http://localhost:${BACKEND_PORT:-8000}/admin/"
echo ""
echo "LAN / phone testing (optional): bash scripts/publish-dev-to-lan.sh"
echo "Stop: bash scripts/stop.sh"
echo "Prod-like stack: bash scripts/start-prod.sh"
