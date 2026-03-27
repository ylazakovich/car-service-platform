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

SERVICE="${1:-backend}"
LINES="${2:-200}"

if [[ "${SERVICE}" == "all" ]]; then
  docker compose logs --tail="${LINES}" --no-color
else
  docker compose logs "${SERVICE}" --tail="${LINES}" --no-color
fi
