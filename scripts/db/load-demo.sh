#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cd "${ROOT_DIR}"

echo "scripts/db/load-demo.sh now loads generated Datafaker demo data."
echo "Delegating to scripts/db/load-datafaker-demo.sh ..."
exec bash "${ROOT_DIR}/scripts/db/load-datafaker-demo.sh" "$@"
