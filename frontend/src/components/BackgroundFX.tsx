import { useEffect, useRef } from "react";

interface BackgroundFXProps {
  accentRgb: string;
  alert: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const LINK_DIST = 130;

/**
 * Fixed full-viewport backdrop: a drifting particle/constellation field on a
 * canvas, layered under an animated grid, scanlines, accent glow and vignette.
 * The particle colour tracks the live threat accent via a ref so the field
 * recolours without restarting the animation.
 */
const MOUSE_LINK = 190;
const MOUSE_PULL = 0.00018;

export function BackgroundFX({ accentRgb, alert }: BackgroundFXProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const rgbRef = useRef(accentRgb);
  const mouse = useRef({ x: -9999, y: -9999, active: false });

  useEffect(() => {
    rgbRef.current = accentRgb;
  }, [accentRgb]);

  // Track the pointer across the viewport: drives the ambient cursor pool and
  // the layered parallax, and feeds the constellation field below.
  useEffect(() => {
    const stage = stageRef.current;
    const onMove = (e: PointerEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
      mouse.current.active = true;
      if (!stage) return;
      const px = (e.clientX / window.innerWidth - 0.5) * 2;
      const py = (e.clientY / window.innerHeight - 0.5) * 2;
      stage.style.setProperty("--cx", `${e.clientX}px`);
      stage.style.setProperty("--cy", `${e.clientY}px`);
      stage.style.setProperty("--px", px.toFixed(3));
      stage.style.setProperty("--py", py.toFixed(3));
      stage.style.setProperty("--cursor-on", "1");
    };
    const onLeave = () => {
      mouse.current.active = false;
      stage?.style.setProperty("--cursor-on", "0");
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerout", onLeave);
    window.addEventListener("blur", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerout", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0;
    let h = 0;
    let particles: Particle[] = [];
    let raf = 0;

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(28, Math.min(120, Math.round((w * h) / 26000)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
      }));
    };

    const tick = () => {
      const rgb = rgbRef.current;
      const m = mouse.current;
      ctx.clearRect(0, 0, w, h);

      for (const p of particles) {
        // Gentle gravitation toward the cursor brings the field to life.
        if (m.active) {
          const dx = m.x - p.x;
          const dy = m.y - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 90000) {
            p.vx += dx * MOUSE_PULL;
            p.vy += dy * MOUSE_PULL;
          }
        }
        p.vx = Math.max(-0.6, Math.min(0.6, p.vx * 0.99));
        p.vy = Math.max(-0.6, Math.min(0.6, p.vy * 0.99));
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x += w;
        else if (p.x > w) p.x -= w;
        if (p.y < 0) p.y += h;
        else if (p.y > h) p.y -= h;
      }

      ctx.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < LINK_DIST) {
            ctx.strokeStyle = `rgba(${rgb},${(1 - dist / LINK_DIST) * 0.16})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        // Brighter links lashing the cursor to nearby nodes.
        if (m.active) {
          const mdist = Math.hypot(a.x - m.x, a.y - m.y);
          if (mdist < MOUSE_LINK) {
            ctx.strokeStyle = `rgba(${rgb},${(1 - mdist / MOUSE_LINK) * 0.32})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(m.x, m.y);
            ctx.stroke();
          }
        }
      }

      ctx.fillStyle = `rgba(${rgb},0.7)`;
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="bg-stage" ref={stageRef}>
      <div className="bg-glow" />
      <div className="bg-cursor" />
      <canvas ref={canvasRef} className="bg-canvas" />
      <div className="bg-grid" />
      <div className="bg-scan" />
      {alert && <div className="alert-wash" />}
      <div className="bg-vignette" />
      <div className="boot-sweep" />
    </div>
  );
}
