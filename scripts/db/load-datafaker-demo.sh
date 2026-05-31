#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

SEED="${DATAFAKER_DEMO_SEED:-123}"
LOCALE="${DATAFAKER_DEMO_LOCALE:-en-US}"
COUNT="${DATAFAKER_DEMO_COUNT:-10}"
PROFILE="${DATAFAKER_DEMO_PROFILE:-demo}"
OUTPUT="${DATAFAKER_DEMO_OUTPUT:-${ROOT_DIR}/tmp/datafaker-demo.json}"

if [[ ! -f .env ]]; then
  echo "Error: .env file not found." >&2
  echo "Create it from template:"
  echo "  cp .env.example .env"
  exit 1
fi

if ! command -v gradle >/dev/null 2>&1; then
  echo "Error: gradle is required to run tools/datafaker-generator." >&2
  echo "Install Gradle 8+ and JDK 17+, or generate the JSON on another machine and run:"
  echo "  docker compose exec -T backend python manage.py import_datafaker_demo /path/in/container.json --replace"
  exit 1
fi

read -rp "This will generate and replace Datafaker demo rows for seed ${SEED}. Continue? (yes/no) " CONFIRM
if [[ "${CONFIRM}" != "yes" ]]; then
  echo "Cancelled."
  exit 0
fi

mkdir -p "$(dirname "${OUTPUT}")"

echo "Generating Datafaker demo JSON..."
(
  cd tools/datafaker-generator
  gradle run --args="--seed ${SEED} --locale ${LOCALE} --count ${COUNT} --profile ${PROFILE} --output ${OUTPUT}"
)

echo "Importing Datafaker demo JSON into backend container..."
docker compose cp "${OUTPUT}" backend:/tmp/datafaker-demo.json
docker compose exec -T backend python manage.py import_datafaker_demo /tmp/datafaker-demo.json --replace

echo ""
echo "Datafaker demo data loaded from ${OUTPUT}."
echo "  seed: ${SEED}"
echo "  locale: ${LOCALE}"
echo "  count: ${COUNT}"
echo "  profile: ${PROFILE}"
