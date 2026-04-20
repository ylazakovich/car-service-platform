#!/usr/bin/env bash
set -euo pipefail

# Re-index this repository into MemPalace using only the repo root as the mine path.
# Never run mempalace mine from a parent directory (e.g. ~/Documents/Projects) — that
# merges unrelated trees into one wing. For work throwaways use a separate folder with
# its own init (e.g. ~/work-scratch).

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"
exec mempalace mine "${ROOT_DIR}"
