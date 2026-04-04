#!/usr/bin/env bash
# Local Renovate dry-run via official Docker image (same idea as CI bot, no GitHub token).
# Use after changing renovate.json (especially customManagers / regex file patterns).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE="${RENOVATE_IMAGE:-renovate/renovate:latest}"
LOG="${RENOVATE_LOG:-$(mktemp -t renovate-local.XXXXXX.log)}"

echo "Repo: $ROOT"
echo "Log:  $LOG"
echo "Pull/run image: $IMAGE"

docker pull "$IMAGE" >/dev/null

docker run --rm \
  -v "$ROOT:/tmp/repo" \
  -w /tmp/repo \
  -e LOG_LEVEL="${RENOVATE_LOG_LEVEL:-debug}" \
  -e RENOVATE_DRY_RUN=lookup \
  "$IMAGE" \
  renovate --platform=local 2>&1 | tee "$LOG"

echo ""
echo "=== Quick checks (custom regex + composite Node default) ==="
if grep -E 'Matched [0-9]+ file\(s\) for manager regex:.*setup-node/action\.yml' "$LOG" >/dev/null; then
  echo "OK: regex manager matched .github/actions/setup-node/action.yml"
else
  echo "FAIL: no 'Matched … manager regex' line for setup-node/action.yml."
  echo "    managerFilePatterns must be a slash-delimited regex (see Renovate docs), e.g."
  echo '    "/^\\.github\\/actions\\/setup-node\\/action\\.ya?ml$/"'
  exit 1
fi

if grep -E '"datasource":\s*"node-version"' "$LOG" >/dev/null || grep -E 'datasource.*node-version' "$LOG" >/dev/null; then
  echo "OK: node-version datasource referenced in extraction"
else
  echo "WARN: could not find node-version datasource string in log (may still be OK; inspect $LOG)"
fi

if grep -E 'default: "20"|currentValue.:.?.?20' "$LOG" >/dev/null; then
  echo "OK: saw Node major 20 in config or extracted value"
else
  echo "WARN: did not grep '20' / currentValue — open log and search for setup-node + node-version"
fi

echo ""
echo "Full log: $LOG"
