#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
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

DEMO_STAFF_EMAIL="${DEMO_STAFF_EMAIL:-staff@autoservice.local}"
DEMO_STAFF_PASSWORD="${DEMO_STAFF_PASSWORD:-staff12345}"

if ! docker compose ps backend --format json | grep -q '"State":"running"'; then
  echo "Error: backend container is not running." >&2
  echo "Start the application first:"
  echo "  bash scripts/compose/start-prod.sh"
  exit 1
fi

echo "Creating or updating demo staff user..."

docker compose exec -T \
  -e STAFF_EMAIL="${DEMO_STAFF_EMAIL}" \
  -e STAFF_PASSWORD="${DEMO_STAFF_PASSWORD}" \
  backend \
  python manage.py seed_staff

echo ""
echo "Demo staff is ready:"
echo "  Email    : ${DEMO_STAFF_EMAIL}"
echo "  Password : ${DEMO_STAFF_PASSWORD}"
