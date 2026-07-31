#!/usr/bin/env bash
# Wait for the CSP API health endpoint to return the expected response body.
set -euo pipefail

API_HEALTH_URL="${1:?API health URL is required}"

for _ in $(seq 1 90); do
  if curl -sf -- "$API_HEALTH_URL" | grep -q '"status"'; then
    echo "api health body ok"
    exit 0
  fi
  sleep 2
done

echo "API health body check failed: $API_HEALTH_URL"
docker compose logs --tail=120 || true
exit 1
