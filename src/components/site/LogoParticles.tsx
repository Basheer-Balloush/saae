import { useEffect, useRef, useState } from "react";
import logoTree from "@/assets/logo-tree.png";

type Props = {
  size?: number;
  color?: string;
  className?: string;
};

type Particle = {
  x: number;
  y: number;
  tx: number;
  ty: number;
  sx: number;
  sy: number;
};

export function LogoParticles({ size = 280, color = "#048090", className }: Props) {
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
    let particles: Particle[] = [];
    let mode: "assemble" | "scatter" = "assemble";
    let lastSwitch = performance.now();
    let cancelled = false;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = logoTree;
    img.onload = () => {
      if (cancelled) return;
      // Sample the logo image into particle targets
      const sample = document.createElement("canvas");
      sample.width = size;
      sample.height = size;
      const sctx = sample.getContext("2d");
      if (!sctx) return;
      // contain-fit
      const scale = Math.min(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const ox = (size - w) / 2;
      const oy = (size - h) / 2;
      sctx.drawImage(img, ox, oy, w, h);
      const data = sctx.getImageData(0, 0, size, size).data;

      const step = 5; // sampling stride
      const cx = size / 2;
      const cy = size / 2;
      const arr: Particle[] = [];
      for (let y = 0; y < size; y += step) {
        for (let x = 0; x < size; x += step) {
          const i = (y * size + x) * 4;
          const a = data[i + 3];
          // logo is dark teal on transparent — pick non-transparent + not too light
          if (a > 128) {
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const radius = size * (0.7 + Math.random() * 0.6);
            arr.push({
              x: cx + (Math.random() - 0.5) * size,
              y: cy + (Math.random() - 0.5) * size,
              tx: x,
              ty: y,
              sx: cx + (dx / dist) * radius + (Math.random() - 0.5) * size * 0.3,
              sy: cy + (dy / dist) * radius + (Math.random() - 0.5) * size * 0.3,
            });
          }
        }
      }
      particles = arr;

      const draw = (now: number) => {
        if (cancelled) return;
        // switch mode every 3500ms
        if (now - lastSwitch > 3500) {
          mode = mode === "assemble" ? "scatter" : "assemble";
          lastSwitch = now;
          // re-randomize scatter targets each cycle
          if (mode === "scatter") {
            for (const p of particles) {
              const dx = p.tx - cx;
              const dy = p.ty - cy;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              const radius = size * (0.7 + Math.random() * 0.6);
              p.sx = cx + (dx / dist) * radius + (Math.random() - 0.5) * size * 0.4;
              p.sy = cy + (dy / dist) * radius + (Math.random() - 0.5) * size * 0.4;
            }
          }
        }

        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.88;
        const ease = mode === "assemble" ? 0.07 : 0.05;
        for (const p of particles) {
          const targetX = mode === "assemble" ? p.tx : p.sx;
          const targetY = mode === "assemble" ? p.ty : p.sy;
          p.x += (targetX - p.x) * ease;
          p.y += (targetY - p.y) * ease;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.3, 0, Math.PI * 2);
          ctx.fill();
        }
        rafId = requestAnimationFrame(draw);
      };
      rafId = requestAnimationFrame(draw);
    };

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [size, color, reducedMotion]);

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
