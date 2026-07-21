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
    const start = performance.now();
    const DEADLINE_MS = 2000;

    const tick = () => {
      if (cancelled) return;
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior, block: "start" });
        return;
      }
      if (performance.now() - start > DEADLINE_MS) return;
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
