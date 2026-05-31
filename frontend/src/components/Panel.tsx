import type { ReactNode } from "react";
import { usePointerGlow } from "../lib/usePointerGlow";

interface PanelProps {
  title?: string;
  aside?: ReactNode;
  live?: boolean;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

/** Glass command panel with HUD corner brackets, a cursor-follow spotlight,
 *  3D tilt and an optional header row. */
export function Panel({
  title,
  aside,
  live = false,
  className = "",
  bodyClassName = "px-5 pb-5",
  children,
}: PanelProps) {
  const glow = usePointerGlow();
  return (
    <section className={`panel ${live ? "panel--live" : ""} ${className}`} {...glow}>
      <span className="panel-spot" />
      <span className="corner tl" />
      <span className="corner tr" />
      <span className="corner bl" />
      <span className="corner br" />
      {(title || aside) && (
        <header className="relative z-[1] flex items-center justify-between gap-3 px-5 pt-4 pb-3">
          {title ? <span className="label">{title}</span> : <span />}
          {aside}
        </header>
      )}
      <div className={`relative z-[1] ${bodyClassName}`}>{children}</div>
    </section>
  );
}
