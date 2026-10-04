import { useEffect, useState } from "react";

export type HeroCapability = "mobile-static" | "reduced-motion" | "desktop";

/* Reduced motion is not part of this query: a desktop with "show animations"
   turned off (common on Windows set to "best performance") still needs the
   desktop layout, not the phone page stretched across a wide screen. The
   desktop scripts read the same preference and stay still: no 3D scene, no
   pinned scroll scenes. */
export const DESKTOP_HOME_QUERY = "(min-width: 768px) and (pointer: fine)";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Picks the homepage rendering path without importing any 3D stack.
 *
 * SSR-safe and phone-stable: the initial state is the complete mobile page,
 * so SSR HTML and the first client paint already contain full content. The
 * effect only *upgrades* to the cinematic desktop page when the device has a
 * fine pointer and a wide viewport. Reduced motion never removes content: on a
 * desktop it gets the desktop page in its still mode, and elsewhere it keeps
 * the complete phone page.
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
