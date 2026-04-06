#!/usr/bin/env bash
# Restore MEDIA_ROOT from a tarball produced by scripts/media-backup.sh (replaces /app/media in the backend volume).
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

if [[ -n "${1:-}" ]]; then
  BACKUP_FILE="$1"
else
  echo ""
  echo "Available media backups:"
  echo "─────────────────────────────────────────"
  ls -lt "${BACKUP_DIR}"/car_service_media_*.tar.gz 2>/dev/null | awk '{print NR") " $NF " (" $5 " bytes, " $6" "$7" "$8")"}' \
    || { echo "No media backups found in ${BACKUP_DIR}"; exit 1; }
  echo ""
  read -rp "Enter backup filename (or number): " choice

  if [[ "${choice}" =~ ^[0-9]+$ ]]; then
    BACKUP_FILE=$(ls -t "${BACKUP_DIR}"/car_service_media_*.tar.gz | sed -n "${choice}p")
  else
    BACKUP_FILE="${BACKUP_DIR}/${choice}"
  fi
fi

if [[ ! -f "${BACKUP_FILE}" ]]; then
  echo "Error: File not found: ${BACKUP_FILE}" >&2
  exit 1
fi

echo ""
echo "WARNING: This will REPLACE the backend media directory (PDF exports, uploads, etc.) with the archive."
echo "Backup : ${BACKUP_FILE}"
read -rp "Are you sure? (yes/no): " confirm
if [[ "${confirm}" != "yes" ]]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo "Stopping backend..."
docker compose stop backend

echo "Clearing /app/media in the backend volume..."
docker compose run --rm --no-deps --entrypoint sh backend -c 'rm -rf /app/media && mkdir -p /app/media'

echo "Restoring from: ${BACKUP_FILE}"
gunzip -c "${BACKUP_FILE}" | docker compose run --rm --no-deps -T --entrypoint tar backend xf - -C /app

echo "Starting backend..."
docker compose up -d backend

echo ""
echo "Media restore complete."
