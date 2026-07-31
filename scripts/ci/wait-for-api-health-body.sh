#!/usr/bin/env bash
# Wait for the CSP API health endpoint to return the expected response body.
set -euo pipefail

API_HEALTH_URL="${1:?API health URL is required}"
deadline=$((SECONDS + 180))

for attempt in $(seq 1 90); do
  remaining=$((deadline - SECONDS))
  ((remaining > 0)) || break

  request_timeout=5
  ((request_timeout > remaining)) && request_timeout=$remaining
  if curl -sf --max-time "$request_timeout" -- "$API_HEALTH_URL" | grep -q '"status"'; then
    echo "api health body ok"
    exit 0
  fi

  remaining=$((deadline - SECONDS))
  ((attempt < 90 && remaining > 0)) || break
  sleep_seconds=2
  ((sleep_seconds > remaining)) && sleep_seconds=$remaining
  sleep "$sleep_seconds"
done

echo "API health body check failed: $API_HEALTH_URL"
docker compose logs --tail=120 || true
exit 1
