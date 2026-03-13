#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   scripts/agents/new-run.sh "short task name"
# Output:
#   prints created run directory path

TASK_SLUG="${1:-task}"
TASK_SLUG="$(echo "$TASK_SLUG" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-')"
TASK_SLUG="${TASK_SLUG#-}"
TASK_SLUG="${TASK_SLUG%-}"
if [ -z "$TASK_SLUG" ]; then
  TASK_SLUG="task"
fi

RUN_ID="$(date +"%Y%m%d-%H%M%S")"
RUN_DIR=".agents/runs/${RUN_ID}-${TASK_SLUG}"

mkdir -p "$RUN_DIR"

cat > "${RUN_DIR}/final-summary.md" <<EOF
# Final Summary

- Run ID: ${RUN_ID}
- Task: ${TASK_SLUG}
- Status: in_progress
- Notes:
  -
EOF

echo "$RUN_DIR"
