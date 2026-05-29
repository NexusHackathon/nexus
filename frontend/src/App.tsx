import { useEffect } from "react";
import { MotionConfig, motion, type Variants } from "motion/react";
import { useNexusFeed } from "./lib/useNexusFeed";
import { RF_ACCENTS, THREAT_ACCENTS } from "./lib/theme";
import { timeOf } from "./lib/format";
import { BackgroundFX } from "./components/BackgroundFX";
import { Header } from "./components/Header";
import { Panel } from "./components/Panel";
import { ThreatHero } from "./components/ThreatHero";
import { RadarPanel } from "./components/RadarPanel";
import { TelemetrySection } from "./components/TelemetrySection";
import { TelemetryChart } from "./components/TelemetryChart";

const STANDBY = { color: "#6f7a3a", rgb: "111,122,58", label: "המתנה" };

const LEGEND = [
  { label: "איום", color: "var(--accent)" },
  { label: "תדר", color: "#46658a" },
  { label: "גז", color: "#937235" },
];

// Staggered console boot-up: panels rise, sharpen and settle in sequence.
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.06 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.985, filter: "blur(10px)" },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function App() {
  const { latest, history, connected } = useNexusFeed();
  const accent = latest ? THREAT_ACCENTS[latest.threat.level] : STANDBY;

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent", accent.color);
    root.style.setProperty("--accent-rgb", accent.rgb);
  }, [accent.color, accent.rgb]);

  const critical = latest?.threat.level === "CRITICAL";

  return (
    <MotionConfig reducedMotion="user">
      <BackgroundFX accentRgb={accent.rgb} alert={critical} />

      <div className="mx-auto w-full max-w-[1320px] px-4 pb-12 sm:px-6">
        <Header connected={connected} source={latest?.source ?? null} online={latest?.online ?? false} />

        {latest ? (
          <motion.main className="space-y-4" variants={container} initial="hidden" animate="show">
            <motion.div variants={item} className="grid gap-4 lg:grid-cols-3">
              <Panel
                title="איום ראשי"
                live
                className="lg:col-span-2"
                aside={
                  <span className="font-hud text-[0.66rem] text-faint">
                    עודכן <span className="font-mono">{timeOf(latest.ts)}</span>
                  </span>
                }
              >
                <ThreatHero
                  level={latest.threat.level}
                  score={latest.threat.score}
                  statusLabel={accent.label}
                  color={accent.color}
                  flags={latest.threat.flags}
                />
              </Panel>

              <Panel
                title="ניטור תדרים"
                aside={
                  <span
                    className="font-hud text-[0.7rem] font-bold"
                    style={{ color: RF_ACCENTS[latest.rf.level].color }}
                  >
                    {RF_ACCENTS[latest.rf.level].label} / <span className="font-mono">{latest.rf.total}</span> מגעים
                  </span>
                }
              >
                <RadarPanel rf={latest.rf} />
              </Panel>
            </motion.div>

            <motion.div variants={item}>
              <TelemetrySection reading={latest} />
            </motion.div>

            <motion.div variants={item}>
              <Panel
                title="טלמטריה חיה"
              aside={
                <div className="flex items-center gap-3">
                  {LEGEND.map((l) => (
                    <span
                      key={l.label}
                      className="flex items-center gap-1.5 font-hud text-[0.64rem] font-medium text-mute"
                    >
                      <span className="inline-block h-2 w-2 rounded-full" style={{ background: l.color }} />
                      {l.label}
                    </span>
                  ))}
                </div>
              }
            >
              <TelemetryChart history={history} color={accent.color} />
              </Panel>
            </motion.div>
          </motion.main>
        ) : (
          <BootScreen connected={connected} />
        )}
      </div>
    </MotionConfig>
  );
}

function BootScreen({ connected }: { connected: boolean }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <img
        src="/nexus.svg"
        alt=""
        className="h-20 w-20 animate-pulse drop-shadow-[0_8px_18px_rgba(74,64,38,0.32)]"
      />
      <div>
        <h2 className="font-display text-2xl font-black glow-text">
          {connected ? "ממתין לטלמטריה" : "מבסס קישור"}
        </h2>
        <p className="label mt-2">
          {connected ? "קישור פעיל // מסנכרן רשת חיישנים" : "מאבטח ערוץ תקשורת"}
        </p>
      </div>
      <span className="chip">
        <span className="chip-dot" />
        {connected ? "מחובר" : "מתחבר"}
      </span>
    </div>
  );
}
