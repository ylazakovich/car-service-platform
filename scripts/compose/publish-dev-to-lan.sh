#!/usr/bin/env bash
# Publish the Docker dev stack (Vite + Django) on all interfaces and allow browser origins for http://<LAN-IP>:FRONTEND_DEV_PORT.
# Default `scripts/compose/start.sh` keeps 127.0.0.1-only bindings — run this only when you want devices on your LAN to connect.
set -euo pipefail

# Docker Desktop on macOS often exposes 192.168.65.x on bridge interfaces — that is not your Wi‑Fi LAN; phones cannot reach it.
_is_darwin_docker_desktop_lan_wrong() {
  [[ "$1" =~ ^192\.168\.65\.[0-9]+$ ]]
}

# Prefer the interface used for the default route (Wi‑Fi vs Ethernet); en0 alone is often wrong on MacBooks.
# Sets globals DEV_LAN_IP and DETECTED_LAN_IFACE when successful (no subshell).
DETECTED_LAN_IFACE=""
detect_lan_ip_darwin() {
  local ifname ip
  ifname=$(route -n get default 2>/dev/null | awk '/interface: / { print $2; exit }')
  if [[ -n "${ifname}" ]] && ip=$(ipconfig getifaddr "${ifname}" 2>/dev/null) && [[ -n "${ip}" ]]; then
    if ! _is_darwin_docker_desktop_lan_wrong "${ip}"; then
      DEV_LAN_IP="${ip}"
      DETECTED_LAN_IFACE="${ifname}"
      return 0
    fi
  fi
  # No bridge100 here: it is commonly Docker Desktop, not the subnet your phone is on.
  for iface in en0 en1 en2 en3 en4 en5; do
    if ip=$(ipconfig getifaddr "${iface}" 2>/dev/null) && [[ -n "${ip}" ]]; then
      if _is_darwin_docker_desktop_lan_wrong "${ip}"; then
        continue
      fi
      DEV_LAN_IP="${ip}"
      DETECTED_LAN_IFACE="${iface}"
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
      DEV_LAN_IP="${ip}"
      return 0
    fi
  fi
  if command -v hostname >/dev/null 2>&1; then
    ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    if [[ -n "${ip}" ]]; then
      DEV_LAN_IP="${ip}"
      return 0
    fi
  fi
  return 1
}

# Git Bash / MSYS2 / Cygwin on Windows — use PowerShell (Get-NetRoute), not macOS ipconfig/route.
_detect_windows_powershell() {
  if command -v powershell.exe >/dev/null 2>&1; then
    printf '%s\n' "powershell.exe"
    return 0
  fi
  if command -v pwsh.exe >/dev/null 2>&1; then
    printf '%s\n' "pwsh.exe"
    return 0
  fi
  if command -v powershell >/dev/null 2>&1; then
    printf '%s\n' "powershell"
    return 0
  fi
  return 1
}

_is_ipv4() {
  [[ "$1" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]
}

detect_lan_ip_windows() {
  local ps_out ps_bin ip alias
  ps_bin=$(_detect_windows_powershell) || return 1
  # Default route → interface IPv4 (same idea as Linux `ip route get`); works with Wi‑Fi / Ethernet on Win10+.
  ps_out=$("${ps_bin}" -NoProfile -NonInteractive -Command "$(
    cat <<'PS1'
$ErrorActionPreference = 'Stop'
try {
  $r = Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Sort-Object RouteMetric | Select-Object -First 1
  if ($null -eq $r) { exit 1 }
  $c = Get-NetIPConfiguration -InterfaceIndex $r.InterfaceIndex
  $addr = $c.IPv4Address | Where-Object { $_.IPAddress -and ($_.IPAddress -notlike '169.254.*') } | Select-Object -First 1
  if ($null -eq $addr) { exit 1 }
  Write-Output ($addr.IPAddress.Trim())
  Write-Output ($c.InterfaceAlias)
} catch { exit 1 }
PS1
  )" 2>/dev/null) || return 1
  ip=$(printf '%s\n' "${ps_out}" | sed -n '1p' | tr -d '\r')
  alias=$(printf '%s\n' "${ps_out}" | sed -n '2p' | tr -d '\r')
  if _is_ipv4 "${ip}"; then
    DEV_LAN_IP="${ip}"
    DETECTED_LAN_IFACE="${alias:-Windows}"
    return 0
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
DETECTED_LAN_IFACE=""
if [[ -z "${DEV_LAN_IP}" ]]; then
  _u="$(uname -s)"
  case "${_u}" in
    Darwin)
      detect_lan_ip_darwin || true
      ;;
    Linux)
      detect_lan_ip_linux || true
      ;;
    MINGW* | MSYS* | CYGWIN* | *_NT-*)
      detect_lan_ip_windows || true
      ;;
  esac
fi

if [[ -z "${DEV_LAN_IP}" ]]; then
  echo "Could not detect LAN IP. Set DEV_LAN_IP in .env to your Wi‑Fi IPv4 address and run again." >&2
  echo "On Windows (Git Bash): ensure PowerShell is available (powershell.exe), or set DEV_LAN_IP manually." >&2
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

# Compose interpolates ${DEV_LAN_IP} in docker-compose.dev.lan.yml — must be exported for child process.
export DEV_LAN_IP

export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

docker compose up -d --build --force-recreate frontend backend

echo ""
echo "${COMPOSE_PROJECT_NAME:-car-service-platform} dev is reachable on the LAN (frontend + backend on all interfaces)."
if [[ -n "${DETECTED_LAN_IFACE}" ]]; then
  echo "  Detected IPv4: ${DEV_LAN_IP} (interface ${DETECTED_LAN_IFACE})"
fi
echo "  Phone/tablet (same Wi‑Fi): http://${DEV_LAN_IP}:${FRONTEND_DEV_PORT}"
echo "  This machine: http://localhost:${FRONTEND_DEV_PORT}"
echo "  Backend (if needed): http://${DEV_LAN_IP}:${BACKEND_PORT:-8000}"
echo ""
echo "If the phone still cannot load the app: same Wi‑Fi as the PC, no guest/VPN isolation; then check:"
echo "  macOS: System Settings → Network → Firewall (allow Docker)."
echo "  Windows: Windows Security → Firewall → allow Docker Desktop / private networks. Wrong IP? set DEV_LAN_IP in .env and re-run."
echo ""
echo "Bind to localhost only again: bash scripts/compose/start.sh"
