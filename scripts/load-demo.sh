#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

if [[ ! -f .env ]]; then
  echo "Error: .env file not found." >&2
  echo "Create it from template:"
  echo "  cp .env.example .env"
  exit 1
fi

set -a
source .env
set +a

DEMO_FILE="${ROOT_DIR}/demo/demo_data.sql"

if [[ ! -f "${DEMO_FILE}" ]]; then
  echo "Error: demo/demo_data.sql not found." >&2
  exit 1
fi

read -rp "This will INSERT demo data into the database. Continue? (yes/no) " CONFIRM
if [[ "${CONFIRM}" != "yes" ]]; then
  echo "Cancelled."
  exit 0
fi

echo "Loading demo data..."

docker compose exec -T db psql \
  -U "${POSTGRES_USER:-car_service_platform}" \
  -d "${POSTGRES_DB:-car_service_platform}" \
  < "${DEMO_FILE}"

echo ""
echo "Demo data loaded. The database now contains:"
echo "  2 users   (admin@autoservice.local / staff@autoservice.local)"
echo "  54 services with PLN prices"
echo "  10 customers"
echo "  16 vehicles"
echo "  ~50 repairs across all statuses (new / in_progress / waiting_parts / completed)"
echo "  ~60 purchases linked to repairs"
echo "  10 suppliers"
