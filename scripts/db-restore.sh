#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

if [[ ! -f .env ]]; then
  echo "Error: .env file not found." >&2
  exit 1
fi

set -a
source .env
set +a

BACKUP_DIR="${ROOT_DIR}/backups"
DB_NAME="${POSTGRES_DB:-car_service_platform}"
DB_USER="${POSTGRES_USER:-car_service_platform}"

if [[ -n "${1:-}" ]]; then
  BACKUP_FILE="$1"
else
  echo ""
  echo "Available backups:"
  echo "─────────────────────────────────────────"
  ls -lt "${BACKUP_DIR}"/*.sql.gz 2>/dev/null | awk '{print NR") " $NF " (" $5 " bytes, " $6" "$7" "$8")"}' \
    || { echo "No backups found in ${BACKUP_DIR}"; exit 1; }
  echo ""
  read -rp "Enter backup filename (or number): " choice

  if [[ "${choice}" =~ ^[0-9]+$ ]]; then
    BACKUP_FILE=$(ls -t "${BACKUP_DIR}"/*.sql.gz | sed -n "${choice}p")
  else
    BACKUP_FILE="${BACKUP_DIR}/${choice}"
  fi
fi

if [[ ! -f "${BACKUP_FILE}" ]]; then
  echo "Error: File not found: ${BACKUP_FILE}" >&2
  exit 1
fi

echo ""
echo "WARNING: This will REPLACE all data in '${DB_NAME}' with the backup."
echo "Backup : ${BACKUP_FILE}"
read -rp "Are you sure? (yes/no): " confirm
if [[ "${confirm}" != "yes" ]]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo "Stopping backend..."
docker compose stop backend

echo "Dropping existing data..."
docker compose exec -T db psql -U "${DB_USER}" -d "${DB_NAME}" \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

echo "Restoring from: ${BACKUP_FILE}"
gunzip -c "${BACKUP_FILE}" \
  | docker compose exec -T db psql -U "${DB_USER}" -d "${DB_NAME}" --quiet

echo "Starting backend..."
docker compose start backend

echo ""
echo "Restore complete."
