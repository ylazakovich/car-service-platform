#!/usr/bin/env bash
# Background sampler: append docker stats rows while E2E runs (CI).
# Env: DOCKER_STATS_LOG (default docker-metrics/samples.tsv), DOCKER_STATS_INTERVAL (default 5).
set -euo pipefail

INTERVAL="${DOCKER_STATS_INTERVAL:-5}"
OUT="${DOCKER_STATS_LOG:-docker-metrics/samples.tsv}"
mkdir -p "$(dirname "$OUT")"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found; sampler exiting" >&2
  exit 0
fi

echo -e "timestamp_iso\tcontainer\tcpu_percent\tmem_usage_raw\tmem_percent" >"$OUT"

while true; do
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  mapfile -t ids < <(docker compose ps -q 2>/dev/null || true)
  if ((${#ids[@]} == 0)); then
    sleep "$INTERVAL"
    continue
  fi
  if docker stats --no-stream --format "{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" "${ids[@]}" 2>/dev/null \
    | awk -v ts="$ts" -F'\t' 'NF==4 { printf "%s\t%s\t%s\t%s\t%s\n", ts, $1, $2, $3, $4 }' >>"$OUT"; then
    :
  fi
  sleep "$INTERVAL"
done
