import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";

interface CountUpProps {
  value: number;
  decimals?: number;
  className?: string;
}

/** Smoothly tweens between numeric values whenever `value` changes. */
export function CountUp({ value, decimals = 0, className }: CountUpProps) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => v.toFixed(decimals));

  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.6, ease: "easeOut" });
    return controls.stop;
  }, [mv, value]);

  return <motion.span className={className}>{text}</motion.span>;
}
