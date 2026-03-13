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

export GIT_COMMIT
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

docker compose build --build-arg GIT_COMMIT="${GIT_COMMIT}" backend
docker compose build frontend
docker compose up -d

echo ""
echo "${COMPOSE_PROJECT_NAME:-car-service-platform} is up:"
echo "  Frontend : http://localhost:${FRONTEND_PORT:-4173}"
echo "  Backend  : http://localhost:${BACKEND_PORT:-8000}"
echo "  Admin    : http://localhost:${BACKEND_PORT:-8000}/admin/"
echo ""
echo "Dev admin: ${ADMIN_EMAIL:-admin@autoservice.local}"
