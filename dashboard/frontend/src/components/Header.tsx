import { useEffect, useState } from "react";
import { clockOf } from "../lib/format";

interface HeaderProps {
  connected: boolean;
  source: string | null;
  online: boolean;
}

const SOURCE_LABEL: Record<string, string> = {
  sim: "סימולציה",
  device: "חיישן ESP32",
};

export function Header({ connected, source, online }: HeaderProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const sourceLabel = source ? (SOURCE_LABEL[source] ?? source.toUpperCase()) : "אין אות";

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 py-5">
      <div className="flex items-center gap-3">
        <img src="/nexus.svg" alt="NEXUS" className="h-11 w-11 drop-shadow-[0_3px_8px_rgba(74,64,38,0.28)]" />
        <div className="leading-tight">
          <h1 className="wordmark font-display text-2xl font-black tracking-[0.34em]">
            NEXUS
          </h1>
          <p className="label text-[0.66rem]">מערכת בקרה טקטית</p>
        </div>
      </div>

      <div className="flex items-center gap-3 font-mono text-bright">
        <span className="hidden text-3xl font-bold tabular-nums tracking-wider sm:inline">
          {clockOf(now)}
        </span>

        <span className="chip" style={connected ? undefined : OFFLINE_STYLE}>
          <span className="chip-dot" style={connected ? undefined : { background: "#cf2440", boxShadow: "0 0 10px 1px #cf2440" }} />
          {connected ? "קישור פעיל" : "קישור אבד"}
        </span>

        <span className="chip">
          <span className="chip-dot" style={online ? undefined : { background: "#a79d80", boxShadow: "none", animation: "none" }} />
          {sourceLabel}
        </span>
      </div>
    </header>
  );
}

const OFFLINE_STYLE = {
  borderColor: "rgba(207,36,64,0.5)",
  background: "rgba(207,36,64,0.12)",
} as const;
