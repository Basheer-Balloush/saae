import { useEffect, type ReactNode } from "react";
import { useLang } from "@/lib/i18n";
import { RadialNav } from "./RadialNav";
import { PublicFooter } from "./PublicFooter";
import { initRadialNav } from "@/lib/public-site/navigation";
import { initTextEffect } from "@/lib/public-site/text-effect";
import { initSections } from "@/lib/public-site/sections";
import { initMotion } from "@/lib/public-site/motion";
import { applyPublicLanguage, initPublicScrollDock } from "@/lib/public-site/language";
import "@/styles/public-site.css";

type Props = {
  children: ReactNode;
  /** Extra initialisers (e.g. the cinematic hero) run after the shared ones. */
  enhancers?: Array<() => () => void>;
};

export function PublicSiteLayout({ children, enhancers = [] }: Props) {
  const { lang, dir } = useLang();

  useEffect(() => {
    const inits = [initRadialNav, initTextEffect, initSections, initPublicScrollDock, ...enhancers];
    const cleanups: Array<() => void> = [];
    for (const init of inits) {
      try {
        cleanups.push(init());
      } catch (error) {
        console.error("[public-site] init failed", error);
      }
    }
    // Motion enhancement is optional; it upgrades reveals when GSAP is present.
    try {
      cleanups.push(initMotion());
    } catch (error) {
      console.error("[public-site] motion init failed", error);
    }
    return () => {
      for (const cleanup of cleanups) {
        try {
          cleanup();
        } catch {
          /* ignore teardown errors */
        }
      }
    };
    // Re-run when the language flips so measured layouts rebuild in the new direction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, dir]);

  // Swap the ported public-site copy whenever the app language changes.
  useEffect(() => {
    try {
      applyPublicLanguage(lang);
    } catch (error) {
      console.error("[public-site] language apply failed", error);
    }
  });


  return (
    <div className="public-site" data-lang={lang} dir={dir}>
      <RadialNav />
      {children}
      <PublicFooter />
    </div>
  );
}
