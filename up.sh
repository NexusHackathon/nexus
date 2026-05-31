#!/usr/bin/env bash
# NEXUS - start backend (FastAPI) + frontend (Vite), both with hot-reload.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# Prefer the backend virtualenv python; fall back to system python.
if [ -x "backend/.venv/Scripts/python.exe" ]; then
  PY="backend/.venv/Scripts/python.exe"   # Windows venv layout
elif [ -x "backend/.venv/bin/python" ]; then
  PY="backend/.venv/bin/python"           # POSIX venv layout
else
  PY="python"
fi

# "auto" by default: poll the real ESP32, fall back to the simulator if it is
# unreachable. Force pure simulator with NEXUS_SIM=sim, force device-only with
# NEXUS_SIM=device. Point NEXUS_ESP32_IP at the device's LAN IP (printed on its
# serial monitor); NEXUS_ESP32_PORT defaults to 80 (the Arduino WebServer port).
export NEXUS_SIM="${NEXUS_SIM:-auto}"

pids=()
cleanup() {
  echo ""
  echo "[nexus] shutting down..."
  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup INT TERM EXIT

echo "[nexus] backend  -> http://localhost:8800  (NEXUS_SIM=$NEXUS_SIM ESP32=${NEXUS_ESP32_IP:-192.168.0.146}:${NEXUS_ESP32_PORT:-80})"
"$PY" -m uvicorn main:app --reload --reload-dir backend --app-dir backend --port 8800 &
pids+=($!)

echo "[nexus] frontend -> http://localhost:5173"
npm --prefix frontend run dev &
pids+=($!)

echo "[nexus] both services up. press Ctrl+C to stop."
wait
