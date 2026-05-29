// Mirrors the JSON contract emitted by the FastAPI backend (engine.py).

export type ThreatLevel = "SAFE" | "SUSPICIOUS" | "CRITICAL";
export type RFLevel = "CLEAR" | "WARN" | "CRIT";

export interface RawReading {
  gas: number;
  mag: number;
  sdr: number;
  c_z: number;
  c_n: number;
  c_f: number;
}

export interface ThreatFlags {
  gas: boolean;
  mag: boolean;
  sdr: boolean;
  gas_extreme: boolean;
}

export interface ThreatAssessment {
  level: ThreatLevel;
  score: number;
  flags: ThreatFlags;
}

export interface RFAssessment {
  level: RFLevel;
  total: number;
  zero: number;
  near: number;
  far: number;
}

export interface Norm {
  gas_pct: number;
  sdr_pct: number;
  mag: number;
}

export interface Reading {
  ts: string;
  online: boolean;
  source: string;
  raw: RawReading;
  threat: ThreatAssessment;
  rf: RFAssessment;
  norm: Norm;
}

export type FeedFrame =
  | { type: "snapshot"; history: Reading[] }
  | { type: "reading"; data: Reading };
