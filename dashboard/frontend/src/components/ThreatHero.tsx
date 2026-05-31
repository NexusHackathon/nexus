import { AnimatePresence, motion } from "motion/react";
import type { ThreatFlags, ThreatLevel } from "../types";
import { THREAT_ACCENTS } from "../lib/theme";
import { ScoreRing } from "./ScoreRing";

interface ThreatHeroProps {
  level: ThreatLevel;
  score: number;
  statusLabel: string;
  color: string;
  flags: ThreatFlags;
}

interface Vector {
  key: keyof ThreatFlags;
  name: string;
  hint: string;
}

const VECTORS: Vector[] = [
  { key: "gas", name: "כימי / VOC", hint: "חיישן גז" },
  { key: "mag", name: "שדה מגנטי", hint: "אפקט הול" },
  { key: "sdr", name: "פליטת תדר", hint: "סריקת SDR" },
];

const LEVEL_HE: Record<ThreatLevel, string> = {
  SAFE: "מאובטח",
  SUSPICIOUS: "חשד",
  CRITICAL: "קריטי",
};

const HEADLINE: Record<ThreatLevel, string> = {
  SAFE: "ההיקף מאובטח",
  SUSPICIOUS: "זוהתה חריגה",
  CRITICAL: "פריצה מתבצעת",
};

// Escalation order (low -> high). RTL flex renders it right-to-left so the
// ladder reads safe-on-the-right, critical-on-the-left.
const LADDER: ThreatLevel[] = ["SAFE", "SUSPICIOUS", "CRITICAL"];
const RANK: Record<ThreatLevel, number> = { SAFE: 0, SUSPICIOUS: 1, CRITICAL: 2 };

export function ThreatHero({ level, score, statusLabel, color, flags }: ThreatHeroProps) {
  return (
    <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
      <div className="flex justify-center">
        <ScoreRing score={score} label={statusLabel} color={color} />
      </div>

      <div className="min-w-0">
        <span className="label">הערכת איום</span>

        <div className="mt-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={level}
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -18, opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <h2
                className="hero-word inline-block font-display text-4xl font-black leading-none tracking-tight glow-strong lg:text-5xl"
                style={{ color }}
              >
                {LEVEL_HE[level]}
              </h2>
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="mt-2 font-hud text-lg text-mute">{HEADLINE[level]}</p>

        <div className="divider my-4" />

        <span className="label">וקטורי גילוי</span>
        <ul className="mt-2 space-y-2">
          {VECTORS.map((v) => {
            const tripped = flags[v.key];
            const isExtreme = v.key === "gas" && flags.gas_extreme;
            return (
              <li key={v.key} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full transition"
                    style={{
                      background: tripped ? color : "#c2b896",
                      boxShadow: tripped ? `0 0 10px 1px ${color}` : "none",
                    }}
                  />
                  <span className="font-hud text-base text-text">{v.name}</span>
                  <span className="font-hud text-[0.72rem] text-faint">{v.hint}</span>
                </div>
                <span
                  className="font-hud text-xs font-bold"
                  style={{ color: tripped ? color : "#9a9176" }}
                >
                  {isExtreme ? "קיצוני" : tripped ? "הופעל" : "תקין"}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="mt-5">
          <span className="label">דרגת כוננות</span>
          <div className="mt-2 flex gap-2">
            {LADDER.map((lv) => {
              const a = THREAT_ACCENTS[lv];
              const reached = RANK[lv] <= RANK[level];
              const current = lv === level;
              return (
                <div key={lv} className="flex-1">
                  <div
                    className="h-1.5 rounded-full transition-all duration-500"
                    style={{
                      background: reached ? a.color : "#d8cfb8",
                      boxShadow: current ? `0 0 12px 1px ${a.color}` : "none",
                    }}
                  />
                  <div
                    className="mt-1.5 text-center font-hud text-[0.62rem] font-bold transition-colors duration-500"
                    style={{ color: current ? a.color : "#a79d80" }}
                  >
                    {a.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
