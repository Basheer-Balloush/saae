import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/* Small effects for the Texpo game: a confetti burst and the countdown ring. */

const CONFETTI_COLORS = ["#57e4ee", "#f2c14e", "#ffffff", "#8ea8ff", "#3ddc97", "#e8574f"];

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  spin: number;
  w: number;
  h: number;
  c: string;
};

/** Fires a burst every time `fire` changes (and is above 0). */
export function Confetti({ fire, big = false }: { fire: number; big?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!fire || reduce) return;
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;
    el.width = W * dpr;
    el.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = big ? 160 : 60;
    const pieces: Piece[] = Array.from({ length: count }, () => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * (big ? 2.2 : 1.4);
      const speed = (big ? 9 : 7) + Math.random() * (big ? 9 : 6);
      return {
        x: W / 2 + (Math.random() - 0.5) * W * (big ? 0.6 : 0.25),
        y: H * (big ? 0.75 : 0.6),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.3,
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 8,
        c: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0],
      };
    });

    let frame = 0;
    let raf = 0;
    const frames = big ? 150 : 95;
    const tick = () => {
      frame++;
      ctx.clearRect(0, 0, W, H);
      for (const p of pieces) {
        p.vy += 0.32;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.spin;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - frame / frames);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (frame < frames) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fire, big, reduce]);

  return <canvas ref={canvas} className="tx-confetti" aria-hidden="true" />;
}

/** A ring that empties until `deadline` (a performance.now() time). */
export function TimerRing({
  deadline,
  limitMs,
  paused,
  onExpire,
  label,
}: {
  deadline: number;
  limitMs: number;
  paused: boolean;
  onExpire: () => void;
  label: string;
}) {
  const ring = useRef<SVGCircleElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const fired = useRef(false);
  const expire = useRef(onExpire);
  expire.current = onExpire;

  useEffect(() => {
    fired.current = false;
  }, [deadline]);

  useEffect(() => {
    const C = 2 * Math.PI * 26;
    let raf = 0;
    const draw = () => {
      const left = Math.max(0, deadline - performance.now());
      const frac = Math.min(1, left / Math.max(limitMs, 1));
      if (ring.current) ring.current.style.strokeDashoffset = String(C * (1 - frac));
      if (text.current) text.current.textContent = String(Math.ceil(left / 1000));
      if (box.current) {
        box.current.dataset.state = left <= 3000 ? "danger" : left <= 6000 ? "warn" : "ok";
      }
      if (left <= 0) {
        if (!fired.current && !paused) {
          fired.current = true;
          expire.current();
        }
        return;
      }
      if (!paused) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [deadline, limitMs, paused]);

  return (
    <div className="tx-timer" ref={box} data-state="ok" role="timer" aria-label={label}>
      <svg viewBox="0 0 60 60" aria-hidden="true">
        <circle className="tx-timer-track" cx="30" cy="30" r="26" />
        <circle
          ref={ring}
          className="tx-timer-fill"
          cx="30"
          cy="30"
          r="26"
          strokeDasharray={2 * Math.PI * 26}
          strokeDashoffset={0}
        />
      </svg>
      <span ref={text} className="tx-timer-num" />
    </div>
  );
}
