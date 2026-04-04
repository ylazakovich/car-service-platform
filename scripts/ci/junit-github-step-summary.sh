#!/usr/bin/env bash
# Append a markdown table to GITHUB_STEP_SUMMARY from JUnit XML (Vitest / pytest / Playwright).
# Run with cwd = job results root (e.g. frontend/, backend/). Usage:
#   junit-github-step-summary.sh <variant> <title>
# Variants: frontend-single | backend-pytest | e2e-playwright
set -euo pipefail

VARIANT="${1:?variant}"
TITLE="${2:?title}"
SUMMARY="${GITHUB_STEP_SUMMARY:-}"

if [[ -z "${SUMMARY}" ]]; then
  echo "GITHUB_STEP_SUMMARY not set; skipping." >&2
  exit 0
fi

write_frontend_single() {
  local file="test-results/junit.xml"
  [[ -f "${file}" ]] || return 0
  local tests failures time passed
  tests=$(grep -o 'tests="[0-9]*"' "${file}" | head -1 | grep -o '[0-9]*' || true)
  failures=$(grep -o 'failures="[0-9]*"' "${file}" | head -1 | grep -o '[0-9]*' || true)
  time=$(grep -o 'time="[0-9.]*"' "${file}" | head -1 | grep -o '[0-9.]*' || true)
  passed=$((${tests:-0} - ${failures:-0}))
  if [ "${failures:-0}" = "0" ]; then
    echo "### ${TITLE}" >> "${SUMMARY}"
  else
    echo "### ${TITLE} (failures)" >> "${SUMMARY}"
  fi
  echo "| Tests | Passed | Failed | Duration |" >> "${SUMMARY}"
  echo "|-------|--------|--------|----------|" >> "${SUMMARY}"
  echo "| ${tests:-0} | ${passed} | ${failures:-0} | ${time:-?}s |" >> "${SUMMARY}"
}

write_backend_pytest() {
  local total=0 failures=0 errors=0
  shopt -s nullglob
  for xml in test-results/*.xml; do
    [[ -f "${xml}" ]] || continue
    local t f e
    t=$(grep -o 'tests="[0-9]*"' "${xml}" | head -1 | grep -o '[0-9]*' || true)
    f=$(grep -o 'failures="[0-9]*"' "${xml}" | head -1 | grep -o '[0-9]*' || true)
    e=$(grep -o 'errors="[0-9]*"' "${xml}" | head -1 | grep -o '[0-9]*' || true)
    total=$((total + ${t:-0}))
    failures=$((failures + ${f:-0}))
    errors=$((errors + ${e:-0}))
  done
  shopt -u nullglob
  local failed=$((failures + errors))
  local passed=$((total - failed))
  if [ "$failed" = "0" ]; then
    echo "### ${TITLE}" >> "${SUMMARY}"
  else
    echo "### ${TITLE} (failures)" >> "${SUMMARY}"
  fi
  echo "| Tests | Passed | Failed | Errors |" >> "${SUMMARY}"
  echo "|-------|--------|--------|--------|" >> "${SUMMARY}"
  echo "| ${total} | ${passed} | ${failures} | ${errors} |" >> "${SUMMARY}"
}

write_e2e_playwright() {
  local file="test-results/e2e-junit.xml"
  [[ -f "${file}" ]] || return 0
  local tests failures skipped time passed
  tests=$(grep -o 'tests="[0-9]*"' "${file}" | head -1 | grep -o '[0-9]*' || true)
  failures=$(grep -o 'failures="[0-9]*"' "${file}" | head -1 | grep -o '[0-9]*' || true)
  skipped=$(grep -o 'skipped="[0-9]*"' "${file}" | head -1 | grep -o '[0-9]*' || true)
  time=$(grep -o 'time="[0-9.]*"' "${file}" | head -1 | grep -o '[0-9.]*' || true)
  passed=$((${tests:-0} - ${failures:-0} - ${skipped:-0}))
  if [ "${failures:-0}" = "0" ]; then
    echo "### ${TITLE}" >> "${SUMMARY}"
  else
    echo "### ${TITLE} (failures)" >> "${SUMMARY}"
  fi
  echo "| Tests | Passed | Failed | Skipped | Duration |" >> "${SUMMARY}"
  echo "|-------|--------|--------|---------|----------|" >> "${SUMMARY}"
  echo "| ${tests:-0} | ${passed} | ${failures:-0} | ${skipped:-0} | ${time:-?}s |" >> "${SUMMARY}"
}

case "${VARIANT}" in
  frontend-single) write_frontend_single ;;
  backend-pytest) write_backend_pytest ;;
  e2e-playwright) write_e2e_playwright ;;
  *)
    echo "Unknown variant: ${VARIANT} (use frontend-single | backend-pytest | e2e-playwright)" >&2
    exit 1
    ;;
esac
