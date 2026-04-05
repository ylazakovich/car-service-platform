#!/usr/bin/env bash
# Full agent session bootstrap: deps + MCP profile + optional GitHub token from gh.
# See docs/dev/agent-session-bootstrap.md and root AGENTS.md
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

MCP_TARGET="cursor"
SKIP_GH=0
DEPS_ONLY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mcp-target)
      MCP_TARGET="${2:?}"
      shift 2
      ;;
    --skip-github-token)
      SKIP_GH=1
      shift
      ;;
    --deps-only)
      DEPS_ONLY=1
      shift
      ;;
    *)
      echo "Usage: $0 [--deps-only] [--skip-github-token] [--mcp-target cursor|claude]" >&2
      exit 1
      ;;
  esac
done

bash "${ROOT_DIR}/scripts/agents/bootstrap-environment.sh"

if [[ "${DEPS_ONLY}" == "1" ]]; then
  echo "[bootstrap-agent-session] --deps-only: skipping MCP"
  exit 0
fi

echo "[bootstrap-agent-session] MCP install-user → target=${MCP_TARGET}"
node "${ROOT_DIR}/scripts/mcp/install-user.mjs" --target "${MCP_TARGET}"

if [[ "${SKIP_GH}" == "1" ]]; then
  echo "[bootstrap-agent-session] --skip-github-token: not running sync-github-token-from-gh"
else
  if command -v gh >/dev/null 2>&1; then
    echo "[bootstrap-agent-session] GitHub MCP token from gh → local.overrides + reinstall MCP"
    node "${ROOT_DIR}/scripts/mcp/sync-github-token-from-gh.mjs"
    node "${ROOT_DIR}/scripts/mcp/install-user.mjs" --target "${MCP_TARGET}"
  else
    echo "[bootstrap-agent-session] gh not found: skip GitHub token sync (install gh or use --skip-github-token)"
  fi
fi

echo ""
echo "[bootstrap-agent-session] Restart your IDE / Claude Code so MCP reloads."
