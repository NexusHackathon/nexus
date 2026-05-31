import { motion } from "motion/react";
import type { ReactNode } from "react";
import { CountUp } from "./CountUp";
import { usePointerGlow } from "../lib/usePointerGlow";

export type SensorStatus = "ok" | "warn" | "crit";

interface SensorCardProps {
  label: string;
  icon: ReactNode;
  value: number;
  decimals?: number;
  unit?: string;
  pct: number;
  status: SensorStatus;
  statusText: string;
  range: string;
}

const STATUS_COLOR: Record<SensorStatus, string> = {
  ok: "#3f7d34",
  warn: "#c5821c",
  crit: "#cf2440",
};

export function SensorCard({
  label,
  icon,
  value,
  decimals = 0,
  unit,
  pct,
  status,
  statusText,
  range,
}: SensorCardProps) {
  const color = STATUS_COLOR[status];
  const fill = Math.min(100, Math.max(0, pct));
  const glow = usePointerGlow();

  return (
    <div className="panel px-5 py-4" {...glow}>
      <span className="panel-spot" />
      <span className="corner tl" />
      <span className="corner tr" />
      <span className="corner bl" />
      <span className="corner br" />

      <div className="relative z-[1]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-mute" style={{ color }}>
              {icon}
            </span>
            <span className="label">{label}</span>
          </div>
          <span className="font-hud text-[0.72rem] font-bold" style={{ color }}>
            {statusText}
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-1.5">
          <CountUp
            value={value}
            decimals={decimals}
            className="font-display text-4xl font-black tabular-nums text-bright"
          />
          {unit && <span className="font-mono text-sm text-faint">{unit}</span>}
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-deep">
          <motion.div
            className="relative h-full overflow-hidden rounded-full"
            style={{
              background: `linear-gradient(90deg, ${color}, ${color}cc)`,
              boxShadow: `0 0 10px ${color}55`,
            }}
            initial={false}
            animate={{ width: `${fill}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <span className="bar-flow" />
          </motion.div>
        </div>

        <div className="mt-2 flex justify-between text-[0.66rem] text-faint">
          <span className="font-hud">טווח</span>
          <span className="font-mono tabular-nums">{range}</span>
        </div>
      </div>
    </div>
  );
}
