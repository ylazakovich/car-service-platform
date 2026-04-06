#!/usr/bin/env bash
# Archive Django MEDIA_ROOT (/app/media in the backend container) into backups/, same layout as db-backup.sh.
# Restore: scripts/media-restore.sh
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
FILENAME="car_service_media_${TIMESTAMP}.tar.gz"

echo "Creating media backup: ${FILENAME} (from running backend container)"

TEMP_FILE="${BACKUP_DIR}/${FILENAME}.tmp"
trap 'rm -f "${TEMP_FILE}"' EXIT

if ! docker compose ps backend 2>/dev/null | grep -q "Up"; then
  echo "Error: backend container is not running. Start the stack (e.g. bash scripts/start.sh), then retry." >&2
  exit 1
fi

docker compose exec -T backend tar czf - -C /app media >"${TEMP_FILE}"

if [[ ! -s "${TEMP_FILE}" ]]; then
  echo "Error: backup file is empty — tar may have failed." >&2
  exit 1
fi

mv "${TEMP_FILE}" "${BACKUP_DIR}/${FILENAME}"
trap - EXIT

SIZE=$(du -h "${BACKUP_DIR}/${FILENAME}" | cut -f1)
echo "Done: backups/${FILENAME} (${SIZE})"

cd "${BACKUP_DIR}"
ls -t car_service_media_*.tar.gz 2>/dev/null | tail -n +11 | while read -r old; do
  echo "Removing old media backup: ${old}"
  rm -f "${old}"
done
