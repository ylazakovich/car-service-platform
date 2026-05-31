#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

SEED="${DATAFAKER_DEMO_SEED:-123}"
LOCALE="${DATAFAKER_DEMO_LOCALE:-en-US}"
COUNT="${DATAFAKER_DEMO_COUNT:-10}"
PROFILE="${DATAFAKER_DEMO_PROFILE:-demo}"
OUTPUT="${DATAFAKER_DEMO_OUTPUT:-${ROOT_DIR}/tmp/datafaker-demo.json}"
GENERATOR="${DATAFAKER_DEMO_GENERATOR:-docker}"
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.dev.yml)
GENERATOR_ARGS="--seed ${SEED} --locale ${LOCALE} --count ${COUNT} --profile ${PROFILE} --output"

if [[ ! -f .env ]]; then
  echo "Error: .env file not found." >&2
  echo "Create it from template:"
  echo "  cp .env.example .env"
  exit 1
fi

read -rp "This will generate and replace Datafaker demo rows for seed ${SEED}. Continue? (yes/no) " CONFIRM
if [[ "${CONFIRM}" != "yes" ]]; then
  echo "Cancelled."
  exit 0
fi

mkdir -p "$(dirname "${OUTPUT}")"

case "${GENERATOR}" in
  docker)
    if ! docker compose version >/dev/null 2>&1; then
      echo "Error: Docker Compose v2 is required for DATAFAKER_DEMO_GENERATOR=docker." >&2
      exit 1
    fi
    if [[ "${OUTPUT}" != "${ROOT_DIR}"/* ]]; then
      echo "Error: DATAFAKER_DEMO_OUTPUT must be inside the repository when using the Docker generator." >&2
      echo "Current output: ${OUTPUT}" >&2
      exit 1
    fi

    CONTAINER_OUTPUT="/workspace/${OUTPUT#"${ROOT_DIR}/"}"

    echo "Building Datafaker generator image if needed..."
    "${COMPOSE[@]}" build datafaker-generator

    echo "Generating Datafaker demo JSON in Docker..."
    "${COMPOSE[@]}" run --rm --no-deps datafaker-generator "${GENERATOR_ARGS} ${CONTAINER_OUTPUT}"
    ;;
  host)
    if ! command -v gradle >/dev/null 2>&1; then
      echo "Error: gradle is required for DATAFAKER_DEMO_GENERATOR=host." >&2
      echo "Install Gradle 8+ and JDK 17+, or use the default Docker generator." >&2
      exit 1
    fi

    echo "Generating Datafaker demo JSON with host Gradle..."
    (
      cd tools/datafaker-generator
      gradle run --args="${GENERATOR_ARGS} ${OUTPUT}"
    )
    ;;
  *)
    echo "Error: unsupported DATAFAKER_DEMO_GENERATOR='${GENERATOR}'. Use 'docker' or 'host'." >&2
    exit 1
    ;;
esac

if [[ ! -s "${OUTPUT}" ]]; then
  echo "Error: generator did not create a non-empty JSON file at ${OUTPUT}." >&2
  exit 1
fi

echo "Importing Datafaker demo JSON into backend container..."
"${COMPOSE[@]}" cp "${OUTPUT}" backend:/tmp/datafaker-demo.json
"${COMPOSE[@]}" exec -T backend python manage.py import_datafaker_demo /tmp/datafaker-demo.json --replace

echo ""
echo "Datafaker demo data loaded from ${OUTPUT}."
echo "  seed: ${SEED}"
echo "  locale: ${LOCALE}"
echo "  count: ${COUNT}"
echo "  profile: ${PROFILE}"
echo "  generator: ${GENERATOR}"
