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
mkdir -p "${BACKUP_DIR}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="${POSTGRES_DB:-car_service_platform}"
DB_USER="${POSTGRES_USER:-car_service_platform}"
FILENAME="car_service_${TIMESTAMP}.sql.gz"

echo "Creating backup: ${FILENAME}"

TEMP_FILE="${BACKUP_DIR}/${FILENAME}.tmp"
trap 'rm -f "${TEMP_FILE}"' EXIT

docker compose exec -T db \
  pg_dump -U "${DB_USER}" "${DB_NAME}" \
  | gzip > "${TEMP_FILE}"

if [[ ! -s "${TEMP_FILE}" ]]; then
  echo "Error: backup file is empty — pg_dump may have failed." >&2
  exit 1
fi

mv "${TEMP_FILE}" "${BACKUP_DIR}/${FILENAME}"
trap - EXIT

SIZE=$(du -h "${BACKUP_DIR}/${FILENAME}" | cut -f1)
echo "Done: backups/${FILENAME} (${SIZE})"

cd "${BACKUP_DIR}"
ls -t car_service_*.sql.gz 2>/dev/null | tail -n +11 | while read -r old; do
  echo "Removing old backup: ${old}"
  rm -f "${old}"
done
