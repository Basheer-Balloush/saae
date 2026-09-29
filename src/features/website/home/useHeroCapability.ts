import { useEffect, useState } from "react";

export type HeroCapability = "mobile-static" | "reduced-motion" | "desktop";

export const DESKTOP_HOME_QUERY =
  "(min-width: 768px) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Picks the homepage rendering path without importing any 3D stack.
 *
 * SSR-safe and phone-stable: the initial state is the complete mobile page,
 * so SSR HTML and the first client paint already contain full content. The
 * effect only *upgrades* to the cinematic desktop enhancement when the
 * device has a fine pointer, a wide viewport, and no reduced-motion
 * preference. Reduced motion never removes content — it only keeps the
 * lightweight complete page instead of the heavy enhancement.
 */
export function useHeroCapability(): HeroCapability {
  const [capability, setCapability] = useState<HeroCapability>("mobile-static");

  useEffect(() => {
    const desktopList = window.matchMedia(DESKTOP_HOME_QUERY);
    const reducedList = window.matchMedia(REDUCED_MOTION_QUERY);
    const decide = (): HeroCapability => {
      if (desktopList.matches) return "desktop";
      if (reducedList.matches) return "reduced-motion";
      return "mobile-static";
    };

    const update = () => setCapability(decide());
    update();

    desktopList.addEventListener?.("change", update);
    reducedList.addEventListener?.("change", update);
    return () => {
      desktopList.removeEventListener?.("change", update);
      reducedList.removeEventListener?.("change", update);
    };
  }, []);

  return capability;
}
