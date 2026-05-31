"""NEXUS Tactical API - FastAPI backend.

Polls a telemetry source at a fixed rate, runs the threat engine, keeps a rolling
history buffer, and fan-outs every reading to connected clients over a WebSocket.
A REST snapshot endpoint is provided as a fallback.

Environment variables
----------------------
NEXUS_SIM        sim | device | auto   (default: auto)
                 sim    -> always use the simulator (no hardware needed)
                 device -> always poll the real ESP32 (shows OFFLINE when down)
                 auto   -> poll the device, fall back to the simulator after 3 fails
NEXUS_ESP32_IP   ESP32 LAN IP            (default: 192.168.0.146)
NEXUS_ESP32_PORT ESP32 HTTP server port  (default: 80)
NEXUS_POLL_HZ    polls per second        (default: 2)
NEXUS_HISTORY    history buffer length   (default: 90)
"""

from __future__ import annotations

import asyncio
import contextlib
import os
from collections import deque
from pathlib import Path
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from engine import Reading, build_reading
from sources import ESP32Source, SimSource

ESP32_IP = os.getenv("NEXUS_ESP32_IP", "192.168.0.146")
ESP32_PORT = int(os.getenv("NEXUS_ESP32_PORT", "80"))
POLL_HZ = float(os.getenv("NEXUS_POLL_HZ", "2"))
HISTORY = int(os.getenv("NEXUS_HISTORY", "90"))

_RAW_MODE = os.getenv("NEXUS_SIM", "auto").strip().lower()
if _RAW_MODE in ("1", "true", "yes", "sim"):
    MODE = "sim"
elif _RAW_MODE in ("0", "false", "no", "device"):
    MODE = "device"
else:
    MODE = "auto"
MODE = "device"

class Hub:
    """Tracks connected WebSocket clients, the rolling history, and broadcasts."""

    def __init__(self, history: int) -> None:
        self._clients: set[WebSocket] = set()
        self._history: deque[Reading] = deque(maxlen=history)
        self._latest: Reading | None = None

    @property
    def client_count(self) -> int:
        return len(self._clients)

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._clients.add(ws)
        await ws.send_json({"type": "snapshot", "history": [r.to_dict() for r in self._history]})

    def disconnect(self, ws: WebSocket) -> None:
        self._clients.discard(ws)

    async def publish(self, reading: Reading) -> None:
        self._latest = reading
        self._history.append(reading)
        payload = {"type": "reading", "data": reading.to_dict()}
        for ws in list(self._clients):
            try:
                await ws.send_json(payload)
            except Exception:
                self._clients.discard(ws)

    def snapshot(self) -> dict[str, Any]:
        return {
            "latest": self._latest.to_dict() if self._latest else None,
            "history": [r.to_dict() for r in self._history],
        }


async def poll_loop(hub: Hub) -> None:
    interval = 1.0 / max(0.2, POLL_HZ)
    device = ESP32Source(f"http://{ESP32_IP}:{ESP32_PORT}/data")
    sim = SimSource()
    use_sim = MODE == "sim"
    fails = 0

    try:
        while True:
            if use_sim:
                raw, _ = await sim.read()
                reading = build_reading(raw, online=True, source="sim")
            else:
                raw, online = await device.read()
                if online:
                    fails = 0
                else:
                    fails += 1
                    if MODE == "auto" and fails >= 3:
                        use_sim = True
                        continue
                reading = build_reading(raw, online=online, source="device")

            await hub.publish(reading)
            await asyncio.sleep(interval)
    finally:
        await device.aclose()


hub = Hub(history=HISTORY)


@contextlib.asynccontextmanager
async def lifespan(_: FastAPI):
    task = asyncio.create_task(poll_loop(hub))
    try:
        yield
    finally:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task


app = FastAPI(title="NEXUS Tactical API", version="2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health() -> dict[str, Any]:
    return {"status": "ok", "mode": MODE, "poll_hz": POLL_HZ, "clients": hub.client_count}


@app.get("/api/data")
async def data() -> dict[str, Any]:
    return hub.snapshot()


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket) -> None:
    await hub.connect(ws)
    try:
        while True:
            # We never expect inbound messages; this parks the task and lets us
            # observe disconnects. Broadcasts happen from the poll loop.
            await ws.receive_text()
    except WebSocketDisconnect:
        hub.disconnect(ws)
    except Exception:
        hub.disconnect(ws)


# In production, `cd frontend && npm run build` then serve the SPA from FastAPI.
_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if _DIST.is_dir():
    app.mount("/", StaticFiles(directory=str(_DIST), html=True), name="spa")
