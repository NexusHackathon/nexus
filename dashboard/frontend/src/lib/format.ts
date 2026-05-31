export const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v));

/** Maps a value within [lo, hi] to a 0-100 percentage, clamped. */
export const pct = (v: number, lo: number, hi: number): number =>
  clamp(((v - lo) / (hi - lo)) * 100, 0, 100);

export const clockOf = (d: Date): string =>
  d.toLocaleTimeString("en-GB", { hour12: false });

export const timeOf = (iso: string): string => clockOf(new Date(iso));
