#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if ! command -v railway &>/dev/null; then
  echo "Error: Railway CLI not installed. Run: npm install -g @railway/cli" >&2
  exit 1
fi

bash "${ROOT_DIR}/scripts/deploy/sentry-release.sh"

DEPLOY_BACKEND=true
DEPLOY_FRONTEND=true

for arg in "$@"; do
  case "$arg" in
    --backend-only) DEPLOY_FRONTEND=false ;;
    --frontend-only) DEPLOY_BACKEND=false ;;
  esac
done

echo "Pushing to main..."
git push origin main

if $DEPLOY_BACKEND; then
  echo "Deploying backend..."
  cd "$ROOT_DIR/backend"
  railway up --detach
  echo "Backend deploy triggered."
fi

if $DEPLOY_FRONTEND; then
  echo "Deploying frontend..."
  cd "$ROOT_DIR/frontend"
  railway up --detach
  echo "Frontend deploy triggered."
fi

echo ""
echo "Check status: https://railway.app/dashboard"
echo ""
echo "Note: if frontend returns 504 after a backend-only redeploy,"
echo "run: bash scripts/deploy/deploy.sh --frontend-only"
