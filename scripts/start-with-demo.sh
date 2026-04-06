#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

if [[ ! -f .env ]]; then
  echo "Error: .env file not found." >&2
  echo "Create it from template:" >&2
  echo "  cp .env.example .env" >&2
  exit 1
fi

set -a
source .env
set +a

export COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml:docker-compose.dev.yml}"

bash "${ROOT_DIR}/scripts/start.sh"

echo ""
echo "Waiting for PostgreSQL to accept connections…"
ready=0
for _ in $(seq 1 60); do
  if docker compose exec -T db pg_isready -U "${POSTGRES_USER:-car_service_platform}" -d "${POSTGRES_DB:-car_service_platform}" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 2
done

if [[ "${ready}" != "1" ]]; then
  echo "Error: database did not become ready in time." >&2
  exit 1
fi

bash "${ROOT_DIR}/scripts/load-demo.sh" --yes

echo ""
echo "Stack is up and demo data is loaded."
echo "  Multi-task visits for UI demos: TOR-MV-001 … TOR-MV-004 (search in kanban)."
