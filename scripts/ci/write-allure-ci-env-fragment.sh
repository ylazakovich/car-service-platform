#!/usr/bin/env bash
# Writes namespaced allowlisted env lines into ALLURE_RESULTS_DIR/ci-env-fragment.properties (no secrets).
# Usage: write-allure-ci-env-fragment.sh <Prefix> <allure_results_dir>
set -euo pipefail

PREFIX="${1:?prefix e.g. Frontend}"
ALLURE_RESULTS_DIR="${2:?allure results dir}"

mkdir -p "${ALLURE_RESULTS_DIR}"
OUT="${ALLURE_RESULTS_DIR}/ci-env-fragment.properties"

write_kv() {
  local key="$1"
  local val="$2"
  val="${val//$'\r'/}"
  val="${val//$'\n'/ }"
  printf '%s.%s=%s\n' "${PREFIX}" "${key}" "${val}" >> "${OUT}"
}

: > "${OUT}"

write_kv "Job" "${GITHUB_JOB:-local}"
write_kv "Runner.OS" "${RUNNER_OS:-}"
write_kv "CI" "${CI:-false}"

if [[ "${PREFIX}" == "Frontend" ]]; then
  write_kv "Suite" "Vitest"
  if command -v node >/dev/null 2>&1; then
    write_kv "Node" "$(node -v)"
  fi
  write_kv "NODE_ENV" "${NODE_ENV:-}"
fi

if [[ "${PREFIX}" == "Backend" ]]; then
  write_kv "Suite" "pytest"
  if command -v python >/dev/null 2>&1; then
    write_kv "Python" "$(python -V 2>&1 | tr -d '\r')"
  fi
  write_kv "DJANGO_SETTINGS_MODULE" "${DJANGO_SETTINGS_MODULE:-}"
fi

if [[ "${PREFIX}" == "E2E" ]]; then
  write_kv "Suite" "Playwright"
  if command -v node >/dev/null 2>&1; then
    write_kv "Node" "$(node -v)"
  fi
  write_kv "PLAYWRIGHT_BASE_URL" "${PLAYWRIGHT_BASE_URL:-}"
fi
