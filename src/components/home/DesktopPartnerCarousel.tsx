import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { LogoCarousel, type Logo } from "@/components/ui/logo-carousel";
import type { Partner } from "@/features/website/partners/data";
import { usePortalTarget } from "@/hooks/usePortalTarget";
import MotionButton from "@/components/ui/motion-button";
import { PARTNERS_COPY, type Locale } from "./mobile-home-content";
import "./homepage-partners.css";

/**
 * The desktop homepage is a static HTML string rendered by CinematicPage, so
 * the partners logo carousel is portalled into its #partner-carousel-root.
 * A partner's light logo (made for dark backgrounds) is used where it has one,
 * as in the directory and on the phone homepage.
 */
export function DesktopPartnerCarousel({ partners }: { partners: Partner[] }) {
  const target = usePortalTarget("#partner-carousel-root");
  const headingTarget = usePortalTarget("#partner-heading-root");
  const buttonTarget = usePortalTarget("#partner-cta-root");
  const [lang, setLang] = useState<Locale>("ar");
  useEffect(() => {
    const sync = () => setLang(document.documentElement.lang === "en" ? "en" : "ar");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, []);
  const logos = useMemo<Logo[]>(
    () =>
      partners.flatMap((p) => {
        const src = p.lightLogo ?? p.logo;
        return src ? [{ id: p.id, name: p.name, src, scale: p.height / 96 }] : [];
      }),
    [partners],
  );

  return (
    <>
      {headingTarget &&
        createPortal(
          <div data-react-i18n dir={lang === "ar" ? "rtl" : "ltr"}>
            <h2 id="partners-title" className="hn-intro-heading hp-heading">
              {lang === "ar" ? "شركاء " : "Partners in "}
              <span className="hn-headline-accent">{lang === "ar" ? "النجاح" : "Success"}</span>
            </h2>
            <p className="hp-description">{PARTNERS_COPY.body[lang]}</p>
          </div>,
          headingTarget,
        )}
      {target &&
        logos.length > 0 &&
        createPortal(<LogoCarousel columnCount={6} logos={logos} />, target)}
      {buttonTarget &&
        createPortal(
          <div data-react-i18n dir={lang === "ar" ? "rtl" : "ltr"}>
            <MotionButton
              href="/partners"
              label={PARTNERS_COPY.allPartners[lang]}
              className="hn-show-all"
            />
          </div>,
          buttonTarget,
        )}
    </>
  );
}
