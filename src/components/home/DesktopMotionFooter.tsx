import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { MotionFooter, type MotionFooterLocale } from "@/components/ui/motion-footer";
import { usePortalTarget } from "@/hooks/usePortalTarget";
import "./homepage-footer.css";

export function DesktopMotionFooter() {
  const target = usePortalTarget("#home-motion-footer-root");
  const [locale, setLocale] = useState<MotionFooterLocale>("ar");

  useEffect(() => {
    const sync = () => setLocale(document.documentElement.lang === "en" ? "en" : "ar");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, []);

  return target ? createPortal(<MotionFooter locale={locale} />, target) : null;
}
