import { useEffect, useState } from "react";

export type HeroCapability = "mobile-static" | "reduced-motion" | "desktop";

/**
 * Picks the mobile hero rendering path without importing any 3D stack.
 * SSR-safe: defaults to "desktop" and decides client-side in an effect.
 */
export function useHeroCapability(): HeroCapability {
  const [capability, setCapability] = useState<HeroCapability>("desktop");

  useEffect(() => {
    const decide = (): HeroCapability => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return "reduced-motion";
      }
      if (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768) {
        return "mobile-static";
      }
      return "desktop";
    };

    const update = () => setCapability(decide());
    update();

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    reducedMotion.addEventListener?.("change", update);
    coarsePointer.addEventListener?.("change", update);
    window.addEventListener("resize", update);
    return () => {
      reducedMotion.removeEventListener?.("change", update);
      coarsePointer.removeEventListener?.("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return capability;
}
