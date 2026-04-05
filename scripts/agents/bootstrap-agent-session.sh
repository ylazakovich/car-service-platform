#!/usr/bin/env bash
# Agent session bootstrap: MCP profile + optional GitHub token from gh.
# Host npm/pip/playwright are skipped by default (Docker + hot reload is the norm).
# See docs/dev/agent-session-bootstrap.md and root AGENTS.md
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

MCP_TARGET="cursor"
MCP_PROFILE="default"
SKIP_GH=0
DEPS_ONLY=0
WITH_HOST_DEPS=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mcp-target)
      MCP_TARGET="${2:?}"
      shift 2
      ;;
    --mcp-profile)
      MCP_PROFILE="${2:?}"
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
    --with-host-deps)
      WITH_HOST_DEPS=1
      shift
      ;;
    *)
      echo "Usage: $0 [--skip-github-token] [--mcp-target cursor|claude] [--mcp-profile default|standalone] [--with-host-deps] [--deps-only]" >&2
      exit 1
      ;;
  esac
done

if [[ "${MCP_PROFILE}" != "default" && "${MCP_PROFILE}" != "standalone" ]]; then
  echo "Invalid --mcp-profile (use default | standalone). See docs/dev/mcp-deduplication.md" >&2
  exit 1
fi

if [[ "${DEPS_ONLY}" == "1" ]]; then
  bash "${ROOT_DIR}/scripts/agents/bootstrap-environment.sh"
  echo "[bootstrap-agent-session] --deps-only: done (host deps only)"
  exit 0
fi

if [[ "${WITH_HOST_DEPS}" == "1" ]]; then
  bash "${ROOT_DIR}/scripts/agents/bootstrap-environment.sh"
fi

echo "[bootstrap-agent-session] MCP install-user → target=${MCP_TARGET} profile=${MCP_PROFILE}"
node "${ROOT_DIR}/scripts/mcp/install-user.mjs" --target "${MCP_TARGET}" --profile "${MCP_PROFILE}"

if [[ "${SKIP_GH}" == "1" ]]; then
  echo "[bootstrap-agent-session] --skip-github-token: not running sync-github-token-from-gh"
else
  if command -v gh >/dev/null 2>&1; then
    echo "[bootstrap-agent-session] GitHub MCP token from gh → local.overrides + reinstall MCP"
    node "${ROOT_DIR}/scripts/mcp/sync-github-token-from-gh.mjs"
    node "${ROOT_DIR}/scripts/mcp/install-user.mjs" --target "${MCP_TARGET}" --profile "${MCP_PROFILE}"
  else
    echo "[bootstrap-agent-session] gh not found: skip GitHub token sync (install gh or use --skip-github-token)"
  fi
fi

echo ""
echo "[bootstrap-agent-session] Restart your IDE / Claude Code so MCP reloads."
echo "[bootstrap-agent-session] Then verify: node scripts/agents/verify-agent-environment.mjs --mcp-target ${MCP_TARGET}"
echo "[bootstrap-agent-session] (Codex default in verify is separate: run without args for ~/.codex/config.toml.)"
