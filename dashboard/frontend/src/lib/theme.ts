import type { RFLevel, ThreatLevel } from "../types";

export interface Accent {
  /** Solid accent colour. */
  color: string;
  /** "r,g,b" so callers can build rgba() at any alpha. */
  rgb: string;
  /** Human-facing status word. */
  label: string;
}

// Tuned for a light surface: deep, saturated tones that stay legible on ivory.
export const THREAT_ACCENTS: Record<ThreatLevel, Accent> = {
  SAFE: { color: "#3f7d34", rgb: "63,125,52", label: "מאובטח" },
  SUSPICIOUS: { color: "#c5821c", rgb: "197,130,28", label: "חשד" },
  CRITICAL: { color: "#cf2440", rgb: "207,36,64", label: "קריטי" },
};

export const RF_ACCENTS: Record<RFLevel, Accent> = {
  CLEAR: { color: "#6f7a3a", rgb: "111,122,58", label: "נקי" },
  WARN: { color: "#c5821c", rgb: "197,130,28", label: "אזהרה" },
  CRIT: { color: "#cf2440", rgb: "207,36,64", label: "התראה" },
};

export const rgba = (rgb: string, alpha: number): string => `rgba(${rgb},${alpha})`;
