import { useEffect, useRef, useState } from "react";
import type { Partner } from "@/features/website/partners/data";
import { useLang } from "@/lib/i18n";
import MotionButton from "@/components/ui/motion-button";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { MotionFooter } from "@/components/ui/motion-footer";
import "./homepage-footer.css";
import { HomepageNews } from "./HomepageNews";
import "./homepage-partners.css";
import { DESKTOP_HOME_QUERY } from "@/hooks/useHeroCapability";
import "./mobile-home.css";
import { MobileTreeHero } from "./MobileTreeHero";
import { MobileRadialNav } from "./MobileRadialNav";
import { MobileMissionReel } from "./MobileMissionReel";
import { MobileSectionGuide } from "./MobileSectionGuide";
import { FaqSequence } from "./DesktopFaqScroll";
import { IPhoneMockup } from "@/components/ui/iphone-mockup";
import { ScaledDevice } from "./ScaledDevice";
import { LogoCarousel, type Logo } from "@/components/ui/logo-carousel";
import {
  FAQ_COPY,
  MICRO_COPY,
  PARTNERS_COPY,
  type Locale,
  type NewsEntry,
} from "./mobile-home-content";

function pick<T extends { ar: string; en: string }>(t: T, lang: Locale): string {
  return lang === "ar" ? t.ar : t.en;
}

export function MobileHomeView({
  lang,
  onToggleLang,
  news,
  newsFailed = false,
  partners,
  partnersFailed = false,
}: {
  lang: Locale;
  onToggleLang: () => void;
  /** The newest homepage stories from the database. */
  news: NewsEntry[];
  newsFailed?: boolean;
  partners: Partner[];
  partnersFailed?: boolean;
}) {
  const visiblePartners = partnersFailed ? [] : partners;
  // A partner's light logo (made for dark backgrounds) where it has one, as on the desktop.
  const partnerLogos: Logo[] = visiblePartners.flatMap((p) => {
    const src = p.lightLogo ?? p.logo;
    return src ? [{ id: p.id, name: p.name, src, scale: p.height / 96 }] : [];
  });
  const dir = lang === "ar" ? "rtl" : "ltr";
  const [motionReady, setMotionReady] = useState(false);

  const heroSentinelRef = useRef<HTMLDivElement | null>(null);
  const handoffOutRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMotionReady(true);
  }, []);

  return (
    <div
      className={motionReady ? "mobile-home mh-gate mh-motion-ready" : "mobile-home mh-gate"}
      dir={dir}
      lang={lang}
    >
      <style>{`@media ${DESKTOP_HOME_QUERY}{.mobile-home.mh-gate{visibility:hidden}}`}</style>
      <noscript>
        <style>
          {
            ".mobile-home.mh-gate{visibility:visible!important}.mh-tree-hero{block-size:auto!important}.mh-tree-stage{position:relative!important;block-size:auto!important;padding-block:96px 120px}.mh-bands{position:static!important;display:flex!important;flex-direction:column;gap:40px}.mh-band,.mh-band-opening,.mh-tree-hero .mh-word{opacity:1!important;transform:none!important}.mh-tree-cue{display:none}"
          }
        </style>
      </noscript>
      <a className="mh-skip" href="#main-content">
        {pick(MICRO_COPY.skip, lang)}
      </a>

      <MobileRadialNav lang={lang === "ar" ? "ar" : "en"} onToggleLang={onToggleLang} />

      <main id="main-content">
        <MobileTreeHero lang={lang === "ar" ? "ar" : "en"} sentinelRef={heroSentinelRef} />

        <div className="mh-chapters">
          <HomepageNews news={news} newsFailed={newsFailed} lang={lang} />

          {/* As on the desktop, partners pin and slide out as "how we work" slides in (MobileMissionReel). */}
          <div className="mh-handoff">
            <div className="mh-handoff-out" ref={handoffOutRef}>
            <section
              className="mh-section hn-root hp-partners mh-partners"
              id="partners"
              aria-labelledby="mh-partners-title"
            >
              <div className="hn-tech-details" aria-hidden="true"><span /><span /></div>
              <div className="mh-wrap mh-partners-head">
                <h2 className="hn-intro-heading hp-heading" id="mh-partners-title">
                  {lang === "ar" ? "شركاء " : "Partners in "}<span className="hn-headline-accent">{lang === "ar" ? "النجاح" : "Success"}</span>
                </h2>
                <p className="mh-section-p">{pick(PARTNERS_COPY.body, lang)}</p>
              </div>
              {visiblePartners.length ? (
                <>
                  {/* The desktop's logo carousel: each column swaps its logo in place. */}
                  <LogoCarousel columnCount={3} logos={partnerLogos} className="mh-partner-carousel" />
                  {/* The carousel's logos are pictures; their names are here for readers. */}
                  <ul className="mh-sr-only" aria-label={pick(PARTNERS_COPY.title, lang)}>
                    {partnerLogos.map((logo) => (
                      <li key={logo.id}>{logo.name}</li>
                    ))}
                  </ul>
                  {/* A partner without a logo keeps its name on screen. */}
                  {visiblePartners.some((p) => !(p.lightLogo ?? p.logo)) && (
                    <ul className="mh-partner-names">
                      {visiblePartners
                        .filter((p) => !(p.lightLogo ?? p.logo))
                        .map((p) => (
                          <li key={p.id}>
                            <span>{p.name}</span>
                          </li>
                        ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="mh-wrap" role="status">
                  {partnersFailed
                    ? lang === "ar"
                      ? "تعذّر تحميل الشركاء. يرجى المحاولة مرة أخرى."
                      : "Partners could not be loaded. Please try again."
                    : lang === "ar"
                      ? "لا يوجد شركاء لعرضهم حالياً."
                      : "No partners to display yet."}
                </p>
              )}
              <div className="mh-wrap">
                <div className="hp-actions"><MotionButton href="/partners" label={pick(PARTNERS_COPY.allPartners, lang)} className="hn-show-all" /></div>
              </div>
            </section>
            </div>
            <div className="mh-handoff-runway" aria-hidden="true" />
          </div>

          <MobileMissionReel lang={lang} outRef={handoffOutRef} />


          <section className="mh-section hn-root hp-faq mh-faq" id="faq" aria-labelledby="mh-faq-title">
            <div className="hn-tech-details" aria-hidden="true"><span /><span /></div>
            {/* The desktop's FAQ: the title, a phone rising in under it, then one
                question at a time on its screen as the reader scrolls. */}
            <ContainerScroll
              className="hp-faq-scroll mh-faq-scroll"
              cardClassName="hp-faq-scroll-card"
              layout="column"
              introHeight={900}
              titleComponent={
                <div className="faq-intro">
                  <h2 className="photo-head" id="mh-faq-title">
                    {pick(FAQ_COPY.title, lang)}
                  </h2>
                </div>
              }
            >
              {/* Laid out at the size it reads well at (an iPhone 12's), then
                  scaled to the room each phone's screen leaves. */}
              <ScaledDevice width={265} height={454}>
                <IPhoneMockup
                  model="15-pro"
                  islandTop={20}
                  color="#163a43"
                  screenBg="#061820"
                  className="hp-faq-device"
                  style={{ width: "100%" }}
                  frameStyle={{
                    width: "100%",
                    height: "auto",
                    aspectRatio: "420 / 720",
                    border: "1px solid rgba(114, 214, 223, .55)",
                  }}
                  screenStyle={{ position: "absolute", inset: 12, width: "auto", height: "auto" }}
                  safeAreaOverrides={{ left: 16, right: 16 }}
                  shadow="0 18px 42px rgba(0, 0, 0, .35), 0 0 30px rgba(0, 139, 157, .16)"
                >
                  <FaqSequence lang={lang} />
                </IPhoneMockup>
              </ScaledDevice>
            </ContainerScroll>
          </section>
        </div>
      </main>

      <MobileSectionGuide lang={lang === "ar" ? "ar" : "en"} />

      {/* The desktop homepage's footer (DesktopMotionFooter), stacked for the
          phone in mobile-home.css. */}
      <MotionFooter locale={lang === "ar" ? "ar" : "en"} />
    </div>
  );
}

export function MobileHome({
  news,
  newsFailed,
  partners,
  partnersFailed,
}: {
  news: NewsEntry[];
  newsFailed?: boolean;
  partners: Partner[];
  partnersFailed?: boolean;
}) {
  const { lang, toggle } = useLang();
  return (
    <MobileHomeView
      lang={lang}
      onToggleLang={toggle}
      news={news}
      newsFailed={newsFailed}
      partners={partners}
      partnersFailed={partnersFailed}
    />
  );
}

export default MobileHome;
