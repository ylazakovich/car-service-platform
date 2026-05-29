#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

if [[ ! -f .env ]]; then
  echo "Error: .env file not found." >&2
  exit 1
fi

set -a
source .env
set +a

: "${SENTRY_AUTH_TOKEN:?Error: SENTRY_AUTH_TOKEN is not set in .env}"
: "${SENTRY_ORG:?Error: SENTRY_ORG is not set in .env}"
: "${SENTRY_PROJECT:?Error: SENTRY_PROJECT is not set in .env}"

VERSION="$(git describe --tags --exact-match 2>/dev/null || true)"

if [[ -z "${VERSION}" ]]; then
  echo "No tag on HEAD — skipping Sentry release." >&2
  exit 0
fi

echo "Creating Sentry release: ${VERSION}"

if ! command -v sentry-cli &>/dev/null; then
  echo "Error: sentry-cli not installed. Run: npm install -g @sentry/cli" >&2
  exit 1
fi

if ! sentry-cli releases info "${VERSION}" --org "${SENTRY_ORG}" >/dev/null 2>&1; then
  sentry-cli releases new "${VERSION}" \
    --org "${SENTRY_ORG}" \
    --project "${SENTRY_PROJECT}"
fi

sentry-cli releases set-commits "${VERSION}" \
  --org "${SENTRY_ORG}" \
  --project "${SENTRY_PROJECT}" \
  --auto

sentry-cli releases finalize "${VERSION}" \
  --org "${SENTRY_ORG}" \
  --project "${SENTRY_PROJECT}"

sentry-cli releases deploys "${VERSION}" new \
  --org "${SENTRY_ORG}" \
  --env "${SENTRY_ENVIRONMENT:-production}"

echo ""
echo "Sentry release ${VERSION} created and deployed."
echo "View: https://sentry.io/organizations/${SENTRY_ORG}/releases/${VERSION}/"
