import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { MotionFooter, type MotionFooterLocale } from "@/components/ui/motion-footer";
import { usePortalTarget } from "@/hooks/usePortalTarget";
import "./homepage-footer.css";

/* Every cinematic page carries a .motion-footer-root directly above its own
   static footer, so the default needs no per-page selector. The homepage and
   about page pass their original ids, which now also carry the class. */
export function DesktopMotionFooter({
  targetSelector = ".motion-footer-root",
}: {
  targetSelector?: string;
}) {
  const target = usePortalTarget(targetSelector);
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
