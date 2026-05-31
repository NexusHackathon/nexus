import { motion } from "motion/react";
import { CountUp } from "./CountUp";

interface ScoreRingProps {
  score: number;
  label: string;
  color: string;
  size?: number;
}

const TICKS = 48;

/** Animated circular threat-index gauge with an instrument tick ring. */
export function ScoreRing({ score, label, color, size = 248 }: ScoreRingProps) {
  const stroke = 12;
  const c = size / 2;
  const r = c - stroke - 14;
  const circ = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, score));
  const offset = circ * (1 - clamped / 100);

  // Live endpoint of the progress arc (top = -90deg, sweeping clockwise).
  const endRad = (-90 + (clamped / 100) * 360) * (Math.PI / 180);
  const ex = c + r * Math.cos(endRad);
  const ey = c + r * Math.sin(endRad);

  const ticks = Array.from({ length: TICKS }, (_, i) => {
    const major = i % 4 === 0;
    const rad = ((i / TICKS) * 360 - 90) * (Math.PI / 180);
    const r1 = r + stroke / 2 + 6;
    const r2 = r1 + (major ? 9 : 5);
    return {
      x1: c + r1 * Math.cos(rad),
      y1: c + r1 * Math.sin(rad),
      x2: c + r2 * Math.cos(rad),
      y2: c + r2 * Math.sin(rad),
      major,
    };
  });

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="#b08d57" />
          </linearGradient>
          <filter id="ring-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Slow-rotating outer bezel of dots - a gyroscopic instrument detail. */}
        <motion.circle
          cx={c}
          cy={c}
          r={c - 3}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeDasharray="1.5 7"
          opacity={0.3}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 64, ease: "linear", repeat: Infinity }}
        />

        <g stroke={color}>
          {ticks.map((t, i) => (
            <line
              key={i}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              strokeWidth={t.major ? 2 : 1}
              opacity={t.major ? 0.5 : 0.2}
            />
          ))}
        </g>

        <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(120,110,70,0.22)" strokeWidth={stroke} />

        <motion.circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          transform={`rotate(-90 ${c} ${c})`}
          filter="url(#ring-glow)"
          initial={false}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />

        {/* Glowing hot-point riding the head of the progress arc. */}
        <motion.circle
          r={6.5}
          fill={color}
          filter="url(#ring-glow)"
          initial={{ cx: ex, cy: ey }}
          animate={{ cx: ex, cy: ey }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        <motion.circle
          r={2.6}
          fill="#fff"
          opacity={0.95}
          initial={{ cx: ex, cy: ey }}
          animate={{ cx: ex, cy: ey }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <CountUp value={clamped} className="font-display text-6xl font-black leading-none tabular-nums glow-strong" />
        <span className="label mt-2" style={{ color }}>
          {label}
        </span>
        <span className="label mt-1 text-[0.62rem] opacity-50">מדד איום</span>
      </div>
    </div>
  );
}
