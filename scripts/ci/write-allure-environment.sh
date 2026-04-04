#!/usr/bin/env bash
# Writes Allure environment.properties into ALLURE_RESULTS_DIR (merged CI results).
set -euo pipefail

ALLURE_RESULTS_DIR="${ALLURE_RESULTS_DIR:-allure-results}"
REPO_ROOT="${REPO_ROOT:-${GITHUB_WORKSPACE:-.}}"
OUT="${ALLURE_RESULTS_DIR}/environment.properties"

mkdir -p "${ALLURE_RESULTS_DIR}"

write_kv() {
  local key="$1"
  local val="$2"
  val="${val//$'\r'/}"
  val="${val//$'\n'/ }"
  printf '%s=%s\n' "${key}" "${val}" >> "${OUT}"
}

: > "${OUT}"

# Prefixed job-level snapshots (PR test runners), merged by scripts/ci/merge-allure-result-dirs.sh
if [[ -n "${ALLURE_MERGED_CI_ENV:-}" && -f "${ALLURE_MERGED_CI_ENV}" ]]; then
  cat "${ALLURE_MERGED_CI_ENV}" >> "${OUT}"
fi

write_kv "CI" "${CI:-false}"

if [[ -n "${RUNNER_OS:-}" ]]; then
  write_kv "Runner.OS" "${RUNNER_OS}"
fi
if [[ -n "${RUNNER_ARCH:-}" ]]; then
  write_kv "Runner.Arch" "${RUNNER_ARCH}"
fi

runner_image="${RUNNER_IMAGE:-${ImageOS:-}}"
if [[ -z "${runner_image}" ]]; then
  runner_image="$(uname -r 2>/dev/null || true)"
fi
if [[ -n "${runner_image}" ]]; then
  write_kv "Runner.Image" "${runner_image}"
fi

if command -v uname >/dev/null 2>&1; then
  write_kv "OS.Kernel" "$(uname -srm)"
fi

if command -v node >/dev/null 2>&1; then
  write_kv "Node" "$(node -v)"
fi

if command -v python >/dev/null 2>&1; then
  write_kv "Python" "$(python -V 2>&1 | tr -d '\r')"
fi

if [[ -d "${REPO_ROOT}/backend" ]] && (cd "${REPO_ROOT}/backend" && python -c "import django" >/dev/null 2>&1); then
  django_v="$(cd "${REPO_ROOT}/backend" && python -c "import django; print(django.get_version())" 2>/dev/null || true)"
  if [[ -n "${django_v}" ]]; then
    write_kv "Django" "${django_v}"
  fi
fi

if [[ -n "${GITHUB_REPOSITORY:-}" ]]; then
  write_kv "GitHub.Repository" "${GITHUB_REPOSITORY}"
fi

sha="${GITHUB_SHA:-}"
if [[ -n "${sha}" ]]; then
  write_kv "GitHub.SHA" "${sha:0:7}"
fi

if [[ -n "${GITHUB_REF_NAME:-}" ]]; then
  write_kv "GitHub.Ref" "${GITHUB_REF_NAME}"
elif [[ -n "${GITHUB_REF:-}" ]]; then
  write_kv "GitHub.Ref" "${GITHUB_REF}"
fi

wf_name="${ALLURE_GITHUB_WORKFLOW:-${GITHUB_WORKFLOW:-}}"
if [[ -n "${wf_name}" ]]; then
  write_kv "GitHub.Workflow" "${wf_name}"
fi

if [[ -n "${GITHUB_JOB:-}" ]]; then
  write_kv "GitHub.Job" "${GITHUB_JOB}"
fi

run_id="${ALLURE_SOURCE_RUN_ID:-${GITHUB_RUN_ID:-}}"
if [[ -n "${run_id}" ]]; then
  write_kv "GitHub.RunId" "${run_id}"
fi

lock="${REPO_ROOT}/frontend/package-lock.json"
if [[ -f "${lock}" ]] && command -v sha256sum >/dev/null 2>&1; then
  write_kv "Frontend.Lockfile.SHA" "$(sha256sum "${lock}" | cut -c1-12)"
fi

req="${REPO_ROOT}/backend/requirements-test.txt"
if [[ -f "${req}" ]] && command -v sha256sum >/dev/null 2>&1; then
  write_kv "Backend.Requirements.SHA" "$(sha256sum "${req}" | cut -c1-12)"
fi

# Allure Report 3: глобальные variables в allurerc.mjs (JSON); environment.properties — legacy Metadata в результатах.
# JSON must NOT live inside ALLURE_RESULTS_DIR — the CLI treats unknown *.json there as result files.
ALLURE_VARIABLES_JSON="${ALLURE_VARIABLES_JSON:-${REPO_ROOT}/artifacts/allure-variables.json}"
if command -v python3 >/dev/null 2>&1; then
  mkdir -p "$(dirname "${ALLURE_VARIABLES_JSON}")"
  python3 - "${ALLURE_RESULTS_DIR}" "${ALLURE_VARIABLES_JSON}" <<'PY'
import json, pathlib, sys

results_dir = pathlib.Path(sys.argv[1])
out_path = pathlib.Path(sys.argv[2])
prop = results_dir / "environment.properties"
data = {}
if prop.exists():
    for line in prop.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        data[k.strip()] = v.strip()
out_path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
PY
fi
