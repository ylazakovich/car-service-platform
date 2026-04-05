#!/usr/bin/env bash
# Optional: install Node/Python/Playwright on the HOST (for running tests outside Docker).
# Default workflow uses Docker + hot reload — you usually do NOT need this. See docs/dev/agent-session-bootstrap.md
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

SKIP_PLAYWRIGHT="${SKIP_PLAYWRIGHT:-0}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-playwright) SKIP_PLAYWRIGHT=1 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
  shift
done

if command -v npm >/dev/null 2>&1 && [[ -f frontend/package-lock.json ]]; then
  echo "[bootstrap] frontend: npm ci"
  (cd frontend && npm ci)
else
  echo "[bootstrap] skip npm (no npm or no package-lock.json)"
fi

if command -v python3 >/dev/null 2>&1; then
  if [[ -f backend/requirements.txt ]]; then
    echo "[bootstrap] backend: pip install -r requirements.txt"
    (cd backend && python3 -m pip install -r requirements.txt)
  fi
  if [[ -f backend/requirements-test.txt ]]; then
    echo "[bootstrap] backend: pip install -r requirements-test.txt"
    (cd backend && python3 -m pip install -r requirements-test.txt)
  fi
else
  echo "[bootstrap] skip pip (no python3)"
fi

if [[ "${SKIP_PLAYWRIGHT}" != "1" ]] && command -v npx >/dev/null 2>&1 && [[ -f frontend/package.json ]]; then
  echo "[bootstrap] frontend: playwright chromium"
  (cd frontend && npx playwright install chromium)
else
  echo "[bootstrap] skip playwright install (SKIP_PLAYWRIGHT=${SKIP_PLAYWRIGHT})"
fi

if command -v gh >/dev/null 2>&1; then
  echo "[bootstrap] gh CLI present (use scripts/mcp/sync-github-token-from-gh.mjs for GitHub MCP token)"
else
  echo "[bootstrap] hint: install GitHub CLI (gh) for session token → GitHub MCP"
fi

echo "[bootstrap] done"
