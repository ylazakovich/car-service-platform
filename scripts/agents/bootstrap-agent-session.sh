#!/usr/bin/env bash
# Agent session bootstrap: MCP profile merge into user-level config.
# Host npm/pip/playwright are skipped by default (Docker + hot reload is the norm).
# See docs/dev/agent-session-bootstrap.md and root AGENTS.md
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

MCP_TARGET="cursor"
MCP_PROFILE="default"
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
    --deps-only)
      DEPS_ONLY=1
      shift
      ;;
    --with-host-deps)
      WITH_HOST_DEPS=1
      shift
      ;;
    *)
      echo "Usage: $0 [--mcp-target cursor|claude] [--mcp-profile default|standalone] [--with-host-deps] [--deps-only]" >&2
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

echo ""
echo "[bootstrap-agent-session] Restart your IDE / Claude Code so MCP reloads."
echo "[bootstrap-agent-session] Then verify: node scripts/agents/verify-agent-environment.mjs --mcp-target ${MCP_TARGET}"
echo "[bootstrap-agent-session] (Codex default in verify is separate: run without args for ~/.codex/config.toml.)"
