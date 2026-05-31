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
CLI_ARGS=(generate datafaker-demo --seed "${SEED}" --locale "${LOCALE}" --count "${COUNT}" --profile "${PROFILE}" --output)

require_docker_compose() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Error: docker CLI is required to generate and import Datafaker demo data." >&2
    exit 1
  fi
  if ! docker compose version >/dev/null 2>&1; then
    echo "Error: Docker Compose v2 is required to generate and import Datafaker demo data." >&2
    exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    echo "Error: Docker daemon is not reachable. Start Docker and retry." >&2
    exit 1
  fi
}

if [[ ! -f .env ]]; then
  echo "Error: .env file not found." >&2
  echo "Create it from template:"
  echo "  cp .env.example .env"
  exit 1
fi

require_docker_compose

read -rp "This will generate and replace Datafaker demo rows for seed ${SEED}. Continue? (yes/no) " CONFIRM
if [[ "${CONFIRM}" != "yes" ]]; then
  echo "Cancelled."
  exit 0
fi

mkdir -p "$(dirname "${OUTPUT}")"

case "${GENERATOR}" in
  docker)
    if [[ "${OUTPUT}" != "${ROOT_DIR}"/* ]]; then
      echo "Error: DATAFAKER_DEMO_OUTPUT must be inside the repository when using the Docker generator." >&2
      echo "Current output: ${OUTPUT}" >&2
      exit 1
    fi

    CONTAINER_OUTPUT="/workspace/${OUTPUT#"${ROOT_DIR}/"}"

    echo "Building Datafaker generator image if needed..."
    "${COMPOSE[@]}" build datafaker-generator

    echo "Generating Datafaker demo JSON in Docker..."
    HOST_UID="$(id -u)" HOST_GID="$(id -g)" "${COMPOSE[@]}" run --rm --no-deps datafaker-generator "${CLI_ARGS[@]}" "${CONTAINER_OUTPUT}"
    ;;
  host)
    CLI_BIN="${ROOT_DIR}/tools/datafaker-generator/build/install/csp-demo-data/bin/csp-demo-data"
    if [[ ! -x "${CLI_BIN}" ]]; then
      if [[ -x "${ROOT_DIR}/tools/datafaker-generator/gradlew" ]] && command -v java >/dev/null 2>&1; then
        echo "Building Datafaker CLI with Gradle Wrapper..."
        (
          cd tools/datafaker-generator
          ./gradlew --no-daemon installDist
        )
      else
        echo "Error: host generator requires Java 17+ to run the Gradle Wrapper and CLI." >&2
        echo "Use the default Docker generator, or install Java and run:" >&2
        echo "  cd tools/datafaker-generator && ./gradlew installDist" >&2
        exit 1
      fi
    fi

    echo "Generating Datafaker demo JSON with host CLI..."
    "${CLI_BIN}" "${CLI_ARGS[@]}" "${OUTPUT}"
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
"${COMPOSE[@]}" exec -T backend python manage.py import_datafaker_demo /tmp/datafaker-demo.json --replace --replace-legacy-sql-demo

echo ""
echo "Datafaker demo data loaded from ${OUTPUT}."
echo "  seed: ${SEED}"
echo "  locale: ${LOCALE}"
echo "  count: ${COUNT}"
echo "  profile: ${PROFILE}"
echo "  generator: ${GENERATOR}"
