#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

if [[ ! -f .env ]]; then
  echo "Error: .env file not found." >&2
  echo "Create it from template:"
  echo "  cp .env.example .env" >&2
  exit 1
fi

set -a
source .env
set +a

export COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml:docker-compose.dev.yml}"

DEMO_FILE="${ROOT_DIR}/demo/demo_data.sql"

if [[ ! -f "${DEMO_FILE}" ]]; then
  echo "Error: demo/demo_data.sql not found." >&2
  exit 1
fi

SKIP_CONFIRM=0
for arg in "$@"; do
  if [[ "${arg}" == "--yes" || "${arg}" == "-y" ]]; then
    SKIP_CONFIRM=1
  fi
done

if [[ "${SKIP_CONFIRM}" != "1" ]]; then
  read -rp "This will INSERT demo data into the database. Continue? (yes/no) " CONFIRM
  if [[ "${CONFIRM}" != "yes" ]]; then
    echo "Cancelled."
    exit 0
  fi
fi

echo "Loading demo data..."

docker compose exec -T db psql \
  -v ON_ERROR_STOP=1 \
  -U "${POSTGRES_USER:-car_service_platform}" \
  -d "${POSTGRES_DB:-car_service_platform}" \
  < "${DEMO_FILE}"

echo ""
echo "Demo data loaded. The database now contains:"
echo "  2 users   (admin@autoservice.local / staff@autoservice.local)"
echo "  54 services with PLN prices"
echo "  10 customers"
echo "  16 vehicles"
echo "  66 repair visits (62 legacy TOR-* + 4 multi-task TOR-MV-001 … 004)"
echo "  72 repair tasks (kanban cards), including several per visit for TOR-MV-*"
echo "  ~30 purchases linked by visit tracking code"
echo "  10 suppliers"
echo "  March 2026 moneyflow showcase rows"
echo ""
echo "Kanban: filter or search for TOR-MV-001 (VW Passat) to see 3 cards under one visit."
