import { useMemo } from "react";
import { createPortal } from "react-dom";

import { LogoCarousel, type Logo } from "@/components/ui/logo-carousel";
import type { Partner } from "@/features/website/partners/data";
import { usePortalTarget } from "@/hooks/usePortalTarget";

/**
 * The desktop homepage is a static HTML string rendered by CinematicPage, so
 * the partners logo carousel is portalled into its #partner-carousel-root.
 * A partner's light logo (made for dark backgrounds) is used where it has one,
 * as in the directory and on the phone homepage.
 */
export function DesktopPartnerCarousel({ partners }: { partners: Partner[] }) {
  const target = usePortalTarget("#partner-carousel-root");
  const logos = useMemo<Logo[]>(
    () =>
      partners.flatMap((p) => {
        const src = p.lightLogo ?? p.logo;
        return src ? [{ id: p.id, name: p.name, src, scale: p.height / 96 }] : [];
      }),
    [partners],
  );

  if (!target || logos.length === 0) return null;
  return createPortal(<LogoCarousel columnCount={6} logos={logos} />, target);
}
