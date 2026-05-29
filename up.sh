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

# Simulation mode by default so it runs without the ESP32 hardware present.
export NEXUS_SIM="${NEXUS_SIM:-sim}"

pids=()
cleanup() {
  echo ""
  echo "[nexus] shutting down..."
  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup INT TERM EXIT

echo "[nexus] backend  -> http://localhost:8800  (NEXUS_SIM=$NEXUS_SIM)"
"$PY" -m uvicorn main:app --reload --reload-dir backend --app-dir backend --port 8800 &
pids+=($!)

echo "[nexus] frontend -> http://localhost:5173"
npm --prefix frontend run dev &
pids+=($!)

echo "[nexus] both services up. press Ctrl+C to stop."
wait
