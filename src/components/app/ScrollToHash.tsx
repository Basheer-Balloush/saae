import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";

// Any of these means the visitor is scrolling on their own.
const USER_SCROLL = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

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

    /* Glides to the target, following it if the page is still settling
       around it (images and late sections landing above it push it down),
       and lets go the moment the visitor scrolls. The glide is run here, not
       by the browser's smooth scroll: that one cannot be interrupted, so a
       scroll started during it was carried back to the target, and the old
       version then also realigned every 180ms for two seconds. After "Join
       the initiative" the page could not be scrolled for several seconds. */
    let cancelled = false;
    let rafId = 0;
    const start = performance.now();
    const from = window.scrollY;
    const GLIDE_MS = reduced ? 0 : 650;
    const DEADLINE_MS = 2000;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    const cancel = () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      for (const type of USER_SCROLL) window.removeEventListener(type, cancel);
    };
    for (const type of USER_SCROLL) window.addEventListener(type, cancel, { passive: true });

    let settledAt = 0;
    const tick = () => {
      if (cancelled) return;
      const now = performance.now();
      const el = document.getElementById(id);
      if (el) {
        const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
        const target = Math.max(0, el.getBoundingClientRect().top + window.scrollY - margin);
        const t = GLIDE_MS ? Math.min(1, (now - start) / GLIDE_MS) : 1;
        const y = from + (target - from) * ease(t);
        if (Math.abs(window.scrollY - y) > 0.5) window.scrollTo({ top: y, behavior: "instant" });
        if (t >= 1) {
          if (!settledAt) settledAt = now;
          // Held a little while the page settles, then released.
          if (now - settledAt > 400) return cancel();
        }
      }
      if (now - start > DEADLINE_MS) return cancel();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return cancel;
  }, [location.pathname, location.hash]);

  return null;
}
