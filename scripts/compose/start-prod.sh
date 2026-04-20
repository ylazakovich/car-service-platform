#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
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

if docker compose ps db | grep -q "Up"; then
  bash "${ROOT_DIR}/scripts/db/db-backup.sh" || true
fi

# Match CI (.github/actions/compose-up): BuildKit + Compose uses `docker build` with the current buildx builder (default on Docker Desktop).
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

docker compose up -d --build

echo ""
echo "${COMPOSE_PROJECT_NAME:-car-service-platform} is up:"
echo "  Frontend : http://localhost:${FRONTEND_PORT:-4173}"
echo "  Backend  : http://localhost:${BACKEND_PORT:-8000}"
echo "  Admin    : http://localhost:${BACKEND_PORT:-8000}/admin/"
echo ""
echo "Dev admin: ${ADMIN_EMAIL:-admin@autoservice.local}"
