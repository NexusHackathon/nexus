import type { Reading } from "../types";
import { pct } from "../lib/format";
import { SensorCard, type SensorStatus } from "./SensorCard";

interface TelemetrySectionProps {
  reading: Reading;
}

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const GasIcon = () => (
  <svg {...iconProps}>
    <path d="M9 3h6M10 3v5l-4.5 9A2 2 0 0 0 7.3 20h9.4a2 2 0 0 0 1.8-3L14 8V3" />
    <path d="M7.5 14h9" />
  </svg>
);

const MagnetIcon = () => (
  <svg {...iconProps}>
    <path d="M6 4v7a6 6 0 0 0 12 0V4" />
    <path d="M6 4H3v7M18 4h3v7" />
  </svg>
);

const RfIcon = () => (
  <svg {...iconProps}>
    <path d="M4.5 9a10 10 0 0 1 15 0M7.5 12a6 6 0 0 1 9 0" />
    <circle cx="12" cy="16" r="1.5" />
  </svg>
);

export function TelemetrySection({ reading }: TelemetrySectionProps) {
  const { raw, norm, threat } = reading;

  const gasStatus: SensorStatus = threat.flags.gas_extreme ? "crit" : threat.flags.gas ? "warn" : "ok";
  const magAbnormal = raw.mag < 1500 || raw.mag > 3000;
  const sdrStatus: SensorStatus = raw.sdr >= 0.4 ? "crit" : raw.sdr >= 0.3 ? "warn" : "ok";

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <SensorCard
        label="כימי / VOC"
        icon={<GasIcon />}
        value={raw.gas}
        unit="ADC"
        pct={norm.gas_pct}
        status={gasStatus}
        statusText={gasStatus === "crit" ? "קיצוני" : gasStatus === "warn" ? "מוגבר" : "תקין"}
        range="0 - 4095"
      />
      <SensorCard
        label="שדה מגנטי"
        icon={<MagnetIcon />}
        value={raw.mag}
        unit="uT"
        pct={pct(raw.mag, 400, 4000)}
        status={magAbnormal ? "warn" : "ok"}
        statusText={magAbnormal ? "חריגה" : "יציב"}
        range="1.5k - 3.0k"
      />
      <SensorCard
        label="פליטת תדר"
        icon={<RfIcon />}
        value={raw.sdr}
        decimals={2}
        pct={norm.sdr_pct}
        status={sdrStatus}
        statusText={sdrStatus === "crit" ? "התראה" : sdrStatus === "warn" ? "עולה" : "נקי"}
        range="0.00 - 1.00"
      />
    </div>
  );
}
