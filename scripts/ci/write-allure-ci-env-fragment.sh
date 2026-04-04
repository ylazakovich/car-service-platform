#!/usr/bin/env bash
# Writes namespaced allowlisted lines into ALLURE_RESULTS_DIR/ci-env-fragment.properties (no secrets).
# Only job-specific keys — global CI/runner/repo versions are added once in write-allure-environment.sh
# after merge, to avoid duplicate Variables in Allure Report 3.
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

# Omit key entirely when unset or empty — avoids "-" placeholders in Allure Variables.
write_kv_nonempty() {
  local key="$1"
  local val="${2:-}"
  [[ -n "${val}" ]] || return
  write_kv "${key}" "${val}"
}

: > "${OUT}"

write_kv "Job" "${GITHUB_JOB:-local}"

if [[ "${PREFIX}" == "Frontend" ]]; then
  write_kv "Suite" "Vitest"
  write_kv_nonempty "NODE_ENV" "${NODE_ENV:-}"
fi

if [[ "${PREFIX}" == "Backend" ]]; then
  write_kv "Suite" "pytest"
  write_kv_nonempty "DJANGO_SETTINGS_MODULE" "${DJANGO_SETTINGS_MODULE:-}"
fi

if [[ "${PREFIX}" == "E2E" ]]; then
  write_kv "Suite" "Playwright"
  write_kv_nonempty "PLAYWRIGHT_BASE_URL" "${PLAYWRIGHT_BASE_URL:-}"
fi
