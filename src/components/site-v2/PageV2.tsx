import type { ReactNode } from "react";

import { useLang } from "@/lib/i18n";
import { RadialNav } from "./RadialNav";
import { JourneyRibbon, type RibbonSection } from "./JourneyRibbon";
import { FooterV2 } from "./FooterV2";

/**
 * Wrapper for every migrated (v2) page. Owns the `.saae-v2` token scope, the
 * direction attribute and the shared chrome so no page has to remember them.
 */
export function PageV2({
  children,
  ribbonSections,
}: {
  children: ReactNode;
  ribbonSections?: RibbonSection[];
}) {
  const { dir, t } = useLang();

  return (
    <div className="saae-v2" dir={dir}>
      <a className="v2-skip-link" href="#main-content">
        {t.v2.skipToContent}
      </a>
      <RadialNav />
      {ribbonSections?.length ? <JourneyRibbon sections={ribbonSections} /> : null}
      <main id="main-content">{children}</main>
      <FooterV2 />
    </div>
  );
}

export type { RibbonSection };
export default PageV2;
