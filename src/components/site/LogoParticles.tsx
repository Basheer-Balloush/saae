import { memo, useEffect, useRef, useState } from "react";
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

type Phase =
  | "assembleA"
  | "revealA"
  | "hideA"
  | "scatterA"
  | "assembleB"
  | "revealB"
  | "hideB"
  | "scatterB";

const DUR: Record<Phase, number> = {
  assembleA: 2200,
  revealA: 1400,
  hideA: 400,
  scatterA: 300,
  assembleB: 2200,
  revealB: 1400,
  hideB: 400,
  scatterB: 300,
};

const NEXT: Record<Phase, Phase> = {
  assembleA: "revealA",
  revealA: "hideA",
  hideA: "scatterA",
  scatterA: "assembleB",
  assembleB: "revealB",
  revealB: "hideB",
  hideB: "scatterB",
  scatterB: "assembleA",
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function smoothstep(x: number) {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
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

type FitBox = { ox: number; oy: number; w: number; h: number };

function fitContain(img: HTMLImageElement, size: number): FitBox {
  const scale = Math.min(size / img.width, size / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  return { ox: (size - w) / 2, oy: (size - h) / 2, w, h };
}

function samplePoints(img: HTMLImageElement, size: number, step: number, fit: FitBox): Array<{ x: number; y: number }> {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return [];
  ctx.drawImage(img, fit.ox, fit.oy, fit.w, fit.h);
  const data = ctx.getImageData(0, 0, size, size).data;
  const pts: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const i = (y * size + x) * 4;
      if (data[i + 3] > 128) pts.push({ x, y });
    }
  }
  for (let i = pts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pts[i], pts[j]] = [pts[j], pts[i]];
  }
  return pts;
}

const DEFAULT_COLORS: [string, string] = ["#048090", "#b8a06a"];

function LogoParticlesImpl({ size = 200, colors = DEFAULT_COLORS, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const colorsRef = useRef(colors);
  colorsRef.current = colors;

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
      const fitA = fitContain(imgA, size);
      const fitB = fitContain(imgB, size);
      const ptsA = samplePoints(imgA, size, 4, fitA);
      const ptsB = samplePoints(imgB, size, 4, fitB);
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

      const draw = (now: number) => {
        if (cancelled) return;
        const dur = DUR[phase];
        let elapsed = now - phaseStart;
        if (elapsed > dur) {
          const prev = phase;
          phase = NEXT[phase];
          phaseStart = now;
          elapsed = 0;
          // when entering a new assemble phase, reset particles to random start positions
          if (phase === "assembleA" || phase === "assembleB") {
            for (const p of particles) {
              p.x = cx + (Math.random() - 0.5) * size * 1.4;
              p.y = cy + (Math.random() - 0.5) * size * 1.4;
            }
          }
          void prev;
        }
        const t = Math.min(elapsed / DUR[phase], 1);
        const st = smoothstep(t);

        // color interpolation: 0 = A (teal), 1 = B (gold)
        let cp = 0;
        switch (phase) {
          case "assembleA":
          case "revealA":
          case "hideA":
            cp = 0; break;
          case "scatterA": cp = st; break;
          case "assembleB":
          case "revealB":
          case "hideB":
            cp = 1; break;
          case "scatterB": cp = 1 - st; break;
        }
        const r = Math.round(rgbA[0] + (rgbB[0] - rgbA[0]) * cp);
        const g = Math.round(rgbA[1] + (rgbB[1] - rgbA[1]) * cp);
        const b = Math.round(rgbA[2] + (rgbB[2] - rgbA[2]) * cp);

        // alphas + motion behaviour by phase
        let particleAlpha = 0;
        let imageAlpha = 0;
        let usingShapeB = false;
        switch (phase) {
          case "assembleA":
            particleAlpha = 0.88 * smoothstep(Math.min(t * 3, 1));
            usingShapeB = false;
            break;
          case "revealA":
            particleAlpha = 0.88 * (1 - st);
            imageAlpha = st;
            usingShapeB = false;
            break;
          case "hideA":
            imageAlpha = 1 - st;
            usingShapeB = false;
            break;
          case "scatterA":
            // brief pause between shapes — everything hidden
            break;
          case "assembleB":
            particleAlpha = 0.88 * smoothstep(Math.min(t * 3, 1));
            usingShapeB = true;
            break;
          case "revealB":
            particleAlpha = 0.88 * (1 - st);
            imageAlpha = st;
            usingShapeB = true;
            break;
          case "hideB":
            imageAlpha = 1 - st;
            usingShapeB = true;
            break;
          case "scatterB":
            break;
        }

        ctx.clearRect(0, 0, size, size);

        if (imageAlpha > 0.01) {
          const useA = phase === "revealA" || phase === "hideA";
          const img = useA ? imgA : imgB;
          const fit = useA ? fitA : fitB;
          ctx.globalAlpha = imageAlpha;
          ctx.drawImage(img, fit.ox, fit.oy, fit.w, fit.h);
        }

        // update + draw particles
        const isAssembling = phase === "assembleA" || phase === "assembleB";
        if (isAssembling) {
          const ease = 0.025;
          for (const p of particles) {
            const tx = usingShapeB ? p.tbX : p.taX;
            const ty = usingShapeB ? p.tbY : p.taY;
            p.x += (tx - p.x) * ease;
            p.y += (ty - p.y) * ease;
          }
        }
        if (particleAlpha > 0.01) {
          ctx.globalAlpha = particleAlpha;
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          for (const p of particles) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.3, 0, Math.PI * 2);
            ctx.fill();
          }
        }

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
