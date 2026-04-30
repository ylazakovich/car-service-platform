#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../../.env.railway.local"

if [ -f "$ENV_FILE" ]; then
    set -a
    # shellcheck source=/dev/null
    source "$ENV_FILE"
    set +a
fi

: "${RAILWAY_DEPLOY_HOOK_BACKEND:?Missing RAILWAY_DEPLOY_HOOK_BACKEND — add it to .env.railway.local}"
: "${RAILWAY_DEPLOY_HOOK_FRONTEND:?Missing RAILWAY_DEPLOY_HOOK_FRONTEND — add it to .env.railway.local}"

echo "Pushing to main..."
git push origin main

echo "Deploying backend..."
curl -sf -X POST "$RAILWAY_DEPLOY_HOOK_BACKEND"

echo "Deploying frontend..."
curl -sf -X POST "$RAILWAY_DEPLOY_HOOK_FRONTEND"

echo "Deploy triggered. Check https://railway.app/dashboard for status."
