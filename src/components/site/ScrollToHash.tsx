import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";

export function ScrollToHash() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = location.hash;
    if (!raw) return;
    const id = raw.replace(/^#/, "");
    if (!id) return;

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior: ScrollBehavior = reduced ? "auto" : "smooth";

    let cancelled = false;
    let rafId = 0;
    let lastAlign = 0;
    let hasAligned = false;
    const start = performance.now();
    const DEADLINE_MS = 2000;
    const REALIGN_INTERVAL_MS = 180;

    const alignToTarget = (el: HTMLElement, mode: ScrollBehavior) => {
      el.scrollIntoView({ behavior: mode, block: "start" });
    };

    const tick = () => {
      if (cancelled) return;
      const el = document.getElementById(id);
      const now = performance.now();
      if (el) {
        if (!hasAligned) {
          alignToTarget(el, behavior);
          hasAligned = true;
          lastAlign = now;
        } else if (now - lastAlign >= REALIGN_INTERVAL_MS) {
          alignToTarget(el, "auto");
          lastAlign = now;
        }
        if (now - start > DEADLINE_MS) return;
        rafId = requestAnimationFrame(tick);
        return;
      }
      if (now - start > DEADLINE_MS) return;
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [location.pathname, location.hash]);

  return null;
}
