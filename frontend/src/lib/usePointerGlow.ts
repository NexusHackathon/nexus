import { type MouseEvent, useCallback } from "react";

/** Max card tilt in degrees at the panel edges. Kept subtle for a premium,
 *  not gimmicky, parallax. */
const MAX_TILT = 4.5;
const LIFT = "-5px";

/**
 * Pointer-reactive glass: tracks the cursor over a panel and writes CSS custom
 * properties the stylesheet consumes - `--mx/--my` drive a follow spotlight,
 * `--rx/--ry` a 3D tilt, `--lift` a hover raise, `--active` fades it all in.
 * Returns mouse handlers so any element can opt in with `{...glow}`.
 */
export function usePointerGlow() {
  const onMouseMove = useCallback((e: MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", `${(px * 100).toFixed(2)}%`);
    el.style.setProperty("--my", `${(py * 100).toFixed(2)}%`);
    el.style.setProperty("--rx", `${((px - 0.5) * MAX_TILT * 2).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(-(py - 0.5) * MAX_TILT * 2).toFixed(2)}deg`);
    el.style.setProperty("--lift", LIFT);
    el.style.setProperty("--active", "1");
  }, []);

  const onMouseLeave = useCallback((e: MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--lift", "0px");
    el.style.setProperty("--active", "0");
  }, []);

  return { onMouseMove, onMouseLeave };
}
