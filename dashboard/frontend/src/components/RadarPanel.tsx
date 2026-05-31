import { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle } from "lucide-react";
import type { RFAssessment } from "../types";
import { RF_ACCENTS } from "../lib/theme";

interface RadarPanelProps {
  rf: RFAssessment;
  cameraDetected?: boolean;
}

interface Blip {
  left: number;
  top: number;
  delay: number;
  color: string;
}

const RINGS = [
  { key: "zero", frac: 0.26, color: "#cf2440", label: "צמוד" },
  { key: "near", frac: 0.58, color: "#c5821c", label: "קרוב" },
  { key: "far", frac: 0.88, color: "#6f7a3a", label: "רחוק" },
] as const;

const MAX_PER_RING = 5;

// Compass bearings around the scope (north up). Physical positioning, so the
// RTL document direction never flips them.
const BEARINGS = [
  { deg: "000", cls: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2" },
  { deg: "090", cls: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2" },
  { deg: "180", cls: "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2" },
  { deg: "270", cls: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2" },
] as const;

function placeBlips(count: number, frac: number, color: string, seed: number): Blip[] {
  const n = Math.min(count, MAX_PER_RING);
  return Array.from({ length: n }, (_, i) => {
    const angle = (seed * 57 + (i * 360) / Math.max(1, n) + i * 41) * (Math.PI / 180);
    return {
      left: 50 + frac * 50 * Math.cos(angle),
      top: 50 + frac * 50 * Math.sin(angle),
      delay: i * 0.32,
      color,
    };
  });
}

export function RadarPanel({ rf, cameraDetected = false }: RadarPanelProps) {
  const accent = RF_ACCENTS[rf.level];
  const counts = { zero: rf.zero, near: rf.near, far: rf.far };

  const blips = useMemo(
    () =>
      RINGS.flatMap((ring, idx) =>
        placeBlips(counts[ring.key], ring.frac, ring.color, idx + rf.total),
      ),
    [counts.zero, counts.near, counts.far, rf.total],
  );

  return (
    <div className="flex h-full flex-col">
      <AnimatePresence>
        {cameraDetected && (
          <motion.div
            key="cam-alert"
            role="alert"
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="cam-alert mb-4 flex w-full items-center gap-3 overflow-hidden rounded-xl border px-4 py-3"
          >
            <span className="cam-alert-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
              <AlertTriangle size={20} strokeWidth={2.4} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-display text-[0.95rem] font-black leading-tight text-[#cf2440]">
                זוהתה מצלמה
              </div>
              <div className="font-hud text-[0.66rem] font-medium text-[#9a2030]">
                זיהוי באמצעות מודל AI
              </div>
            </div>
            <span className="cam-alert-dot h-2.5 w-2.5 shrink-0 rounded-full" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative mx-auto aspect-square w-full max-w-[300px]">
        <div className="absolute inset-0 rounded-full border border-edge bg-[radial-gradient(circle,rgba(111,122,58,0.08),transparent_70%)]" />
        {RINGS.map((ring) => (
          <div
            key={ring.key}
            className="absolute rounded-full border border-edge/70"
            style={{
              left: `${50 - ring.frac * 50}%`,
              top: `${50 - ring.frac * 50}%`,
              width: `${ring.frac * 100}%`,
              height: `${ring.frac * 100}%`,
            }}
          />
        ))}

        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-edge/60" />
        <div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-edge/60" />

        <div className="absolute inset-0 overflow-hidden rounded-full">
          <div className="radar-sweep" />
          <span className="radar-ping" />
          <span className="radar-ping" style={{ animationDelay: "1.2s" }} />
          <span className="radar-ping" style={{ animationDelay: "2.4s" }} />
        </div>

        <span
          className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border"
          style={{ borderColor: `${accent.color}55` }}
        />
        <span
          className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: accent.color, boxShadow: `0 0 12px 2px ${accent.color}` }}
        />

        {BEARINGS.map((b) => (
          <span
            key={b.deg}
            className={`absolute ${b.cls} rounded bg-deep/90 px-1 font-mono text-[0.5rem] leading-none text-faint`}
          >
            {b.deg}
          </span>
        ))}

        {blips.map((b, i) => (
          <span
            key={i}
            className="blip"
            style={{
              left: `${b.left}%`,
              top: `${b.top}%`,
              marginLeft: -4,
              marginTop: -4,
              background: b.color,
              boxShadow: `0 0 12px 2px ${b.color}`,
              animationDelay: `${b.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        {RINGS.map((ring) => (
          <div key={ring.key} className="rounded-lg border border-edge bg-deep/60 py-2">
            <div className="font-display text-2xl font-bold" style={{ color: ring.color }}>
              {counts[ring.key]}
            </div>
            <div className="label text-[0.56rem]">{ring.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
