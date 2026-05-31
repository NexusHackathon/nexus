"""Threat-decision engine for the NEXUS tactical monitor.

Pure, side-effect-free functions and immutable value objects. The logic here is
ported verbatim from the original Streamlit `dashboard.py` decision engine so the
behaviour is identical, just reusable and typed.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any, Literal

ThreatLevel = Literal["SAFE", "SUSPICIOUS", "CRITICAL"]
RFLevel = Literal["CLEAR", "WARN", "CRIT"]

# ADC full-scale value used to normalise the gas reading into a percentage.
GAS_FULL_SCALE: float = 4095.0


@dataclass(frozen=True, slots=True)
class RawReading:
    """A single raw sample as produced by the ESP32 (or the simulator)."""

    gas: float
    mag: int
    sdr: float
    c_z: int
    c_n: int
    c_f: int
    yolo: int = 0  # AI camera detection flag (1 = camera detected via YOLO model)


@dataclass(frozen=True, slots=True)
class ThreatFlags:
    gas: bool
    mag: bool
    sdr: bool
    gas_extreme: bool


@dataclass(frozen=True, slots=True)
class ThreatAssessment:
    level: ThreatLevel
    score: int
    flags: ThreatFlags


@dataclass(frozen=True, slots=True)
class RFAssessment:
    level: RFLevel
    total: int
    zero: int
    near: int
    far: int


@dataclass(frozen=True, slots=True)
class Norm:
    """Reading normalised for charting (gas + SDR as 0-100%, magnet kept raw)."""

    gas_pct: float
    sdr_pct: float
    mag: int


@dataclass(frozen=True, slots=True)
class Reading:
    """A fully assessed reading, ready to ship to the frontend."""

    ts: str
    online: bool
    source: str
    raw: RawReading
    threat: ThreatAssessment
    rf: RFAssessment
    norm: Norm

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def assess_threat(r: RawReading) -> ThreatAssessment:
    """Replicates the multi-sensor decision engine from the original dashboard."""

    gas_abnormal = r.gas > 1200
    gas_extreme = r.gas >= 3500
    mag_abnormal = r.mag < 1500 or r.mag > 3000
    sdr_abnormal = r.sdr >= 0.40

    abnormal_count = sum((gas_abnormal, mag_abnormal, sdr_abnormal))
    flags = ThreatFlags(gas=gas_abnormal, mag=mag_abnormal, sdr=sdr_abnormal, gas_extreme=gas_extreme)

    if sdr_abnormal and (gas_abnormal or mag_abnormal):
        return ThreatAssessment("CRITICAL", 95, flags)
    if abnormal_count >= 2:
        return ThreatAssessment("SUSPICIOUS", 65, flags)
    if sdr_abnormal:
        return ThreatAssessment("SUSPICIOUS", 55, flags)
    if r.sdr >= 0.30:
        return ThreatAssessment("SUSPICIOUS", 35, flags)
    if gas_extreme:
        return ThreatAssessment("SUSPICIOUS", 45, flags)
    return ThreatAssessment("SAFE", 15, flags)


def assess_rf(r: RawReading) -> RFAssessment:
    """Classifies the RF / surveillance signal counts (zero / near / far)."""

    total = r.c_z + r.c_n + r.c_f
    if r.c_z > 0 or (total > 0 and r.c_n == 0 and r.c_f == 0):
        level: RFLevel = "CRIT"
    elif r.c_n > 0 or total > 0:
        level = "WARN"
    else:
        level = "CLEAR"
    return RFAssessment(level=level, total=total, zero=r.c_z, near=r.c_n, far=r.c_f)


def normalize(r: RawReading) -> Norm:
    return Norm(
        gas_pct=min(100.0, r.gas / GAS_FULL_SCALE * 100.0),
        sdr_pct=min(100.0, r.sdr * 100.0),
        mag=r.mag,
    )


def build_reading(raw: RawReading, *, online: bool, source: str) -> Reading:
    return Reading(
        ts=datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
        online=online,
        source=source,
        raw=raw,
        threat=assess_threat(raw),
        rf=assess_rf(raw),
        norm=normalize(raw),
    )
