"""Telemetry sources: the real ESP32 device and a realistic simulator.

Both conform to the `Source` protocol so the poll loop is agnostic to where the
data comes from. The simulator lets the whole stack run (and demo) without any
hardware attached, drifting through realistic scenarios so every threat state is
exercised.
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Protocol

import httpx

from engine import RawReading

# Used when the device is unreachable and we have no previous sample yet.
DEFAULT_RAW = RawReading(gas=0.0, mag=2500, sdr=0.0, c_z=0, c_n=0, c_f=0)


class Source(Protocol):
    name: str

    async def read(self) -> tuple[RawReading, bool]:
        """Returns the latest reading and whether the link is live."""
        ...


class ESP32Source:
    """Polls the ESP32 HTTP endpoint, caching the last good sample."""

    name = "device"

    def __init__(self, url: str, timeout: float = 1.0) -> None:
        self._url = url
        self._client = httpx.AsyncClient(timeout=timeout)
        self._last: RawReading = DEFAULT_RAW

    async def read(self) -> tuple[RawReading, bool]:
        try:
            resp = await self._client.get(self._url)
            resp.raise_for_status()
            j = resp.json()
            self._last = RawReading(
                gas=float(j.get("gas", 0.0)),
                mag=int(j.get("mag", 2500)),
                sdr=float(j.get("rssi", 0.0)),
                c_z=int(j.get("c_z", 0)),
                c_n=int(j.get("c_n", 0)),
                c_f=int(j.get("c_f", 0)),
            )
            return self._last, True
        except (httpx.HTTPError, ValueError, KeyError):
            return self._last, False

    async def aclose(self) -> None:
        await self._client.aclose()


@dataclass
class _SimState:
    gas: float = 620.0
    mag: float = 2500.0
    sdr: float = 0.07
    event: str = "idle"
    ttl: int = 0


class SimSource:
    """Stateful simulator: a smooth random walk punctuated by scripted events.

    Each event pulls the relevant sensors toward an anomalous target for a few
    seconds, then everything relaxes back to baseline, so the dashboard cycles
    through SAFE -> SUSPICIOUS -> CRITICAL on its own.
    """

    name = "sim"
    _EVENTS = ("gas_leak", "rf_intrusion", "magnetic_anomaly", "combined_breach", "rf_sweep")

    def __init__(self, seed: int | None = None) -> None:
        self._r = random.Random(seed)
        self._s = _SimState()

    async def read(self) -> tuple[RawReading, bool]:
        s = self._s

        if s.ttl <= 0:
            if self._r.random() < 0.05:
                s.event = self._r.choice(self._EVENTS)
                s.ttl = self._r.randint(10, 24)
            else:
                s.event = "idle"
                s.ttl = self._r.randint(6, 14)
        else:
            s.ttl -= 1

        gas_target, mag_target, sdr_target = 620.0, 2500.0, 0.07
        c_z = c_n = c_f = 0

        match s.event:
            case "gas_leak":
                gas_target = 3700.0
            case "rf_intrusion":
                sdr_target = 0.50
                c_n = self._r.randint(1, 3)
                c_f = self._r.randint(0, 4)
            case "magnetic_anomaly":
                mag_target = self._r.choice([1100.0, 3500.0])
            case "combined_breach":
                gas_target = 2000.0
                sdr_target = 0.55
                c_z = self._r.randint(0, 2)
                c_n = self._r.randint(0, 3)
            case "rf_sweep":
                sdr_target = 0.33
                c_f = self._r.randint(2, 7)
                c_n = self._r.randint(0, 2)
            case _:
                if self._r.random() < 0.25:
                    c_f = self._r.randint(0, 2)

        s.gas += (gas_target - s.gas) * 0.18 + self._r.gauss(0, 18)
        s.mag += (mag_target - s.mag) * 0.18 + self._r.gauss(0, 22)
        s.sdr += (sdr_target - s.sdr) * 0.20 + self._r.gauss(0, 0.008)

        s.gas = max(120.0, min(4095.0, s.gas))
        s.mag = max(400.0, min(4000.0, s.mag))
        s.sdr = max(0.0, min(0.95, s.sdr))

        raw = RawReading(
            gas=round(s.gas, 1),
            mag=int(s.mag),
            sdr=round(s.sdr, 3),
            c_z=c_z,
            c_n=c_n,
            c_f=c_f,
        )
        return raw, True
