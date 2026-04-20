#!/usr/bin/env bash
# Publish the Docker dev stack (Vite + Django) on all interfaces and allow browser origins for http://<LAN-IP>:FRONTEND_DEV_PORT.
# Default `scripts/compose/start.sh` keeps 127.0.0.1-only bindings — run this only when you want devices on your LAN to connect.
set -euo pipefail

# Prefer the interface used for the default route (Wi‑Fi vs Ethernet); en0 alone is often wrong on MacBooks.
detect_lan_ip_darwin() {
  local ifname ip
  ifname=$(route -n get default 2>/dev/null | awk '/interface: / { print $2; exit }')
  if [[ -n "${ifname}" ]] && ip=$(ipconfig getifaddr "${ifname}" 2>/dev/null) && [[ -n "${ip}" ]]; then
    printf '%s\n' "${ip}"
    return 0
  fi
  for iface in en0 en1 bridge100 en2; do
    if ip=$(ipconfig getifaddr "${iface}" 2>/dev/null) && [[ -n "${ip}" ]]; then
      printf '%s\n' "${ip}"
      return 0
    fi
  done
  return 1
}

detect_lan_ip_linux() {
  local ip
  if command -v ip >/dev/null 2>&1; then
    ip=$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i = 1; i < NF; i++) if ($i == "src") { print $(i + 1); exit }}')
    if [[ -n "${ip}" ]]; then
      printf '%s\n' "${ip}"
      return 0
    fi
  fi
  if command -v hostname >/dev/null 2>&1; then
    ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    if [[ -n "${ip}" ]]; then
      printf '%s\n' "${ip}"
      return 0
    fi
  fi
  return 1
}

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

if [[ ! -f .env ]]; then
  echo "Error: .env file not found."
  echo "Create it from template:"
  echo "  cp .env.example .env"
  exit 1
fi

set -a
source .env
set +a

: "${FRONTEND_DEV_PORT:=4173}"

DEV_LAN_IP="${DEV_LAN_IP:-}"
if [[ -z "${DEV_LAN_IP}" ]]; then
  case "$(uname -s)" in
    Darwin)
      DEV_LAN_IP=$(detect_lan_ip_darwin || true)
      ;;
    Linux)
      DEV_LAN_IP=$(detect_lan_ip_linux || true)
      ;;
  esac
fi

if [[ -z "${DEV_LAN_IP}" ]]; then
  echo "Could not detect LAN IP. Set DEV_LAN_IP in .env to your Wi‑Fi IPv4 address and run again." >&2
  exit 1
fi

DEV_LAN_ORIGIN="http://${DEV_LAN_IP}:${FRONTEND_DEV_PORT}"

_default_cors_dev="http://localhost:${FRONTEND_DEV_PORT},http://127.0.0.1:${FRONTEND_DEV_PORT},http://localhost:5173,http://127.0.0.1:5173"
if [[ -n "${CORS_DEV_ORIGINS:-}" ]]; then
  _cors_merged="${CORS_DEV_ORIGINS}"
elif [[ -n "${CORS_ALLOWED_ORIGINS:-}" ]]; then
  _cors_merged="${CORS_ALLOWED_ORIGINS}"
else
  _cors_merged="${_default_cors_dev}"
fi
if [[ "${_cors_merged}" != *"${DEV_LAN_ORIGIN}"* ]]; then
  _cors_merged="${_cors_merged},${DEV_LAN_ORIGIN}"
fi
export CORS_DEV_ORIGINS="${_cors_merged}"

_hosts="${DJANGO_ALLOWED_HOSTS:-localhost,127.0.0.1,backend}"
if [[ "${_hosts}" != *"${DEV_LAN_IP}"* ]]; then
  _hosts="${_hosts},${DEV_LAN_IP}"
fi
export DJANGO_ALLOWED_HOSTS="${_hosts}"

# Django FRONTEND_URL (emails, admin “View site”) should match what the phone uses, not only localhost.
export FRONTEND_DEV_URL="${DEV_LAN_ORIGIN}"

export GIT_COMMIT
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

_base="${COMPOSE_FILE:-docker-compose.yml:docker-compose.dev.yml}"
export COMPOSE_FILE="${_base}:docker-compose.dev.lan.yml"

export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

docker compose up -d --build --force-recreate frontend backend

echo ""
echo "${COMPOSE_PROJECT_NAME:-car-service-platform} dev is reachable on the LAN (frontend + backend on all interfaces)."
echo "  Phone/tablet (same Wi‑Fi): http://${DEV_LAN_IP}:${FRONTEND_DEV_PORT}"
echo "  This machine: http://localhost:${FRONTEND_DEV_PORT}"
echo "  Backend (if needed): http://${DEV_LAN_IP}:${BACKEND_PORT:-8000}"
echo ""
echo "If the phone still cannot load the app: same Wi‑Fi as this Mac, no guest/VPN isolation; on macOS check"
echo "  System Settings → Network → Firewall (allow Docker). Wrong IP? set DEV_LAN_IP in .env and re-run."
echo ""
echo "Bind to localhost only again: bash scripts/compose/start.sh"
