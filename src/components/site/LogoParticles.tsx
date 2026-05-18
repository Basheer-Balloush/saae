import { useEffect, useRef, useState } from "react";
import logoTree from "@/assets/logo-tree.png";
import logoEagle from "@/assets/logo-eagle.png";

type Props = {
  size?: number;
  colors?: [string, string];
  className?: string;
};

type Particle = {
  x: number;
  y: number;
  taX: number;
  taY: number;
  tbX: number;
  tbY: number;
  sx: number;
  sy: number;
};

type Phase = "assembleA" | "holdA" | "scatterA" | "assembleB" | "holdB" | "scatterB";

const HOLD_MS = 1600;
const ASSEMBLE_MS = 1800;
const SCATTER_MS = 1200;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function samplePoints(img: HTMLImageElement, size: number, step: number): Array<{ x: number; y: number }> {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return [];
  const scale = Math.min(size / img.width, size / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  const data = ctx.getImageData(0, 0, size, size).data;
  const pts: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const i = (y * size + x) * 4;
      if (data[i + 3] > 128) pts.push({ x, y });
    }
  }
  // shuffle for nicer mapping between shapes
  for (let i = pts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pts[i], pts[j]] = [pts[j], pts[i]];
  }
  return pts;
}

export function LogoParticles({ size = 200, colors = ["#048090", "#b8a06a"], className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    let rafId = 0;
    let cancelled = false;
    const cx = size / 2;
    const cy = size / 2;
    const [rgbA, rgbB] = [hexToRgb(colors[0]), hexToRgb(colors[1])];

    Promise.all([loadImage(logoTree), loadImage(logoEagle)]).then(([imgA, imgB]) => {
      if (cancelled) return;
      const ptsA = samplePoints(imgA, size, 4);
      const ptsB = samplePoints(imgB, size, 4);
      const count = Math.max(ptsA.length, ptsB.length);
      const particles: Particle[] = [];
      for (let i = 0; i < count; i++) {
        const a = ptsA[i % ptsA.length];
        const b = ptsB[i % ptsB.length];
        particles.push({
          x: cx + (Math.random() - 0.5) * size,
          y: cy + (Math.random() - 0.5) * size,
          taX: a.x,
          taY: a.y,
          tbX: b.x,
          tbY: b.y,
          sx: cx,
          sy: cy,
        });
      }

      const randomizeScatter = () => {
        for (const p of particles) {
          const angle = Math.random() * Math.PI * 2;
          const radius = size * (0.55 + Math.random() * 0.5);
          p.sx = cx + Math.cos(angle) * radius;
          p.sy = cy + Math.sin(angle) * radius;
        }
      };

      let phase: Phase = "assembleA";
      let phaseStart = performance.now();

      const phaseDuration = (p: Phase) => {
        if (p === "holdA" || p === "holdB") return HOLD_MS;
        if (p === "scatterA" || p === "scatterB") return SCATTER_MS;
        return ASSEMBLE_MS;
      };

      const nextPhase = (p: Phase): Phase => {
        switch (p) {
          case "assembleA": return "holdA";
          case "holdA": return "scatterA";
          case "scatterA": return "assembleB";
          case "assembleB": return "holdB";
          case "holdB": return "scatterB";
          case "scatterB": return "assembleA";
        }
      };

      const draw = (now: number) => {
        if (cancelled) return;
        const elapsed = now - phaseStart;
        const dur = phaseDuration(phase);
        if (elapsed > dur) {
          phase = nextPhase(phase);
          phaseStart = now;
          if (phase === "scatterA" || phase === "scatterB") randomizeScatter();
        }
        const t = Math.min(elapsed / dur, 1);

        // color interpolation: 0 = A (teal), 1 = B (gold)
        let cp = 0;
        switch (phase) {
          case "assembleA": cp = 1 - t; break;
          case "holdA":
          case "scatterA": cp = 0; break;
          case "assembleB": cp = t; break;
          case "holdB":
          case "scatterB": cp = 1; break;
        }
        const r = Math.round(rgbA[0] + (rgbB[0] - rgbA[0]) * cp);
        const g = Math.round(rgbA[1] + (rgbB[1] - rgbA[1]) * cp);
        const b = Math.round(rgbA[2] + (rgbB[2] - rgbA[2]) * cp);

        // target per particle by phase
        const useScatter = phase === "scatterA" || phase === "scatterB";
        const useB = phase === "assembleB" || phase === "holdB" || phase === "scatterA";
        // scatterA happens AFTER holdA → next assemble is B, so particles fly outward and the next attractor is B.
        // But while in scatterA we don't pull toward a logo target — just scatter outward. Same for scatterB.

        const ease = useScatter ? 0.06 : 0.08;
        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.globalAlpha = 0.88;

        for (const p of particles) {
          let tx: number, ty: number;
          if (useScatter) {
            tx = p.sx; ty = p.sy;
          } else if (phase === "assembleA" || phase === "holdA") {
            tx = p.taX; ty = p.taY;
          } else {
            tx = p.tbX; ty = p.tbY;
          }
          p.x += (tx - p.x) * ease;
          p.y += (ty - p.y) * ease;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.3, 0, Math.PI * 2);
          ctx.fill();
        }
        // suppress unused-var warning if linter cares
        void useB;

        rafId = requestAnimationFrame(draw);
      };
      rafId = requestAnimationFrame(draw);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [size, colors, reducedMotion]);

  if (reducedMotion) {
    return (
      <img
        src={logoTree}
        alt=""
        aria-hidden
        style={{ width: size, height: size }}
        className={className}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ width: size, height: size }}
      className={className}
    />
  );
}
