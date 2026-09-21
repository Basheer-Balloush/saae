import { useEffect, useRef, useState } from "react";
import type { Partner } from "@/features/website/partners/data";
import {
  ArrowUp,
  ArrowUpLeft,
  BookOpen,
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Minus,
  Network,
  Pause,
  Phone,
  Play,
  Plus,
  Rocket,
} from "lucide-react";
import { useLang } from "@/lib/i18n";
import MotionButton from "@/components/ui/motion-button";
import { ContainerScrollItem } from "@/components/ui/container-scroll-animation";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { HomepageNews } from "./HomepageNews";
import "./homepage-partners.css";
import { DESKTOP_HOME_QUERY } from "@/hooks/useHeroCapability";
import "./mobile-home.css";
import { MobileTreeHero } from "./MobileTreeHero";
import { MobileRadialNav } from "./MobileRadialNav";
import { MobileMissionReel } from "./MobileMissionReel";
import {
  CONTACT,
  FAQS,
  FAQ_COPY,
  FOOTER_CLAIM,
  FOOTER_DISCOVER,
  FOOTER_EXPLORE,
  FOOTER_OFFICIAL,
  FOOTER_RIGHTS,
  MICRO_COPY,
  OPENING,
  PARTNERS_COPY,
  SOCIAL_LINKS,
  type HomeLink,
  type Locale,
  type NewsEntry,
} from "./mobile-home-content";

function pick<T extends { ar: string; en: string }>(t: T, lang: Locale): string {
  return lang === "ar" ? t.ar : t.en;
}

function extProps(link: HomeLink) {
  return link.external
    ? ({ target: "_blank", rel: "noopener noreferrer" } as const)
    : ({} as const);
}

function SocialIcon({ name }: { name: string }) {
  if (name === "Instagram") return <Instagram size={20} aria-hidden="true" />;
  if (name === "Facebook") return <Facebook size={20} aria-hidden="true" />;
  return <Linkedin size={20} aria-hidden="true" />;
}

function PartnerLogo({ partner, decorative = false }: { partner: Partner; decorative?: boolean }) {
  const logo = partner.lightLogo ?? partner.logo;
  return logo ? (
    <img
      src={logo}
      alt={decorative ? "" : partner.name}
      width={320}
      height={160}
      style={{ maxHeight: partner.height }}
      loading="lazy"
      decoding="async"
    />
  ) : (
    <span>{partner.name}</span>
  );
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
  const partnerRows = [
    visiblePartners.slice(0, Math.ceil(visiblePartners.length / 2)),
    visiblePartners.slice(Math.ceil(visiblePartners.length / 2)),
  ].filter((row) => row.length);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [motionReady, setMotionReady] = useState(false);
  const [logosPaused, setLogosPaused] = useState(false);

  const wordmark =
    lang === "ar"
      ? "/cinematic/mobile/saae-wordmark-ar-light.webp"
      : "/cinematic/mobile/saae-wordmark-en-light.webp";
  const wordmarkSize = lang === "ar" ? { width: 480, height: 162 } : { width: 480, height: 165 };

  const heroSentinelRef = useRef<HTMLDivElement | null>(null);

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

          <MobileMissionReel lang={lang} />

          <section
            className={`mh-section hn-root hp-partners${logosPaused ? " mh-is-paused" : ""}`}
            id="partners"
            aria-labelledby="mh-partners-title"
          >
            <div className="hn-tech-details" aria-hidden="true"><span /><span /></div>
            <div className="mh-wrap mh-partners-head">
              <div>
                <h2 className="hn-intro-heading hp-heading" id="mh-partners-title">
                  {lang === "ar" ? "شركاء " : "Partners in "}<span className="hn-headline-accent">{lang === "ar" ? "النجاح" : "Success"}</span>
                </h2>
                <p className="mh-section-p">{pick(PARTNERS_COPY.body, lang)}</p>
              </div>
              {visiblePartners.length > 0 && (
                <button
                  type="button"
                  className="mh-round-btn mh-marquee-toggle"
                  aria-pressed={logosPaused}
                  aria-label={
                    logosPaused
                      ? pick(MICRO_COPY.playLogos, lang)
                      : pick(MICRO_COPY.pauseLogos, lang)
                  }
                  onClick={() => setLogosPaused((v) => !v)}
                >
                  {logosPaused ? (
                    <Play size={20} aria-hidden="true" />
                  ) : (
                    <Pause size={20} aria-hidden="true" />
                  )}
                </button>
              )}
            </div>
            {visiblePartners.length ? (
              <>
                <div className="mh-marquee" aria-label={pick(PARTNERS_COPY.title, lang)}>
                  {partnerRows.map((row, rowIndex) => (
                    <div
                      key={rowIndex}
                      className={`mh-marquee-row${rowIndex ? " mh-row-reverse" : ""}`}
                    >
                      <div className="mh-marquee-track">
                        {[0, 1].map((copy) => (
                          <ul
                            key={copy}
                            className="mh-logo-list"
                            aria-hidden={copy === 1 ? "true" : undefined}
                          >
                            {row.map((p) => (
                              <li key={p.id} className="mh-logo-chip">
                                <PartnerLogo partner={p} decorative={copy === 1} />
                              </li>
                            ))}
                          </ul>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <ul className="mh-partner-static" aria-label={pick(PARTNERS_COPY.title, lang)}>
                  {visiblePartners.map((p) => (
                    <li key={p.id} className="mh-logo-chip">
                      <PartnerLogo partner={p} />
                    </li>
                  ))}
                </ul>
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

          <section className="mh-section hn-root hp-faq" id="faq" aria-labelledby="mh-faq-title">
            <div className="hn-tech-details" aria-hidden="true"><span /><span /></div>
            <ContainerScroll
              className="mh-faq-scroll"
              cardClassName="mh-faq-scroll-card"
              titleComponent={
                <div className="mh-faq-scroll-heading">
                  <h2 className="mh-section-h" id="mh-faq-title">
                    {pick(FAQ_COPY.title, lang)}
                  </h2>
                </div>
              }
            >
              <div className="mh-wrap mh-faq-scroll-content">
                <ul className="mh-faq-list">
                  {FAQS.map((f, i) => {
                    const open = openFaq === i;
                    return (
                      <ContainerScrollItem
                        key={pick(f.question, lang)}
                        index={i}
                        total={FAQS.length}
                        className="mh-faq-item"
                      >
                        <h3 className="mh-faq-h">
                          <button
                            type="button"
                            className="mh-faq-q"
                            aria-expanded={open}
                            aria-controls={`mh-faq-a-${i}`}
                            id={`mh-faq-q-${i}`}
                            onClick={() => setOpenFaq(open ? null : i)}
                          >
                            <span>{pick(f.question, lang)}</span>
                            <span className="mh-faq-icon" aria-hidden="true">
                              {open ? <Minus size={20} /> : <Plus size={20} />}
                            </span>
                          </button>
                        </h3>
                        <div
                          className={open ? "mh-faq-panel mh-is-open" : "mh-faq-panel"}
                          id={`mh-faq-a-${i}`}
                          role="region"
                          aria-labelledby={`mh-faq-q-${i}`}
                          inert={!open}
                        >
                          <p className="mh-faq-a">
                            {pick(f.answer, lang)}
                            {f.answerLink ? (
                              <>
                                {" "}
                                <a href={f.answerLink.href}>{pick(f.answerLink.text, lang)}</a>.
                              </>
                            ) : null}
                          </p>
                        </div>
                      </ContainerScrollItem>
                    );
                  })}
                </ul>
                <MotionButton
                  variant="secondary"
                  label={pick(FAQ_COPY.writeToUs, lang)}
                  href="/contact#write"
                  classes="w-full justify-center"
                />
              </div>
            </ContainerScroll>
          </section>
        </div>
      </main>

      <footer className="mh-footer">
        <div className="mh-wrap">
          <div className="mh-footer-top">
            <img
              src={wordmark}
              alt={pick(OPENING.eyebrow, lang)}
              width={wordmarkSize.width}
              height={wordmarkSize.height}
              loading="lazy"
              decoding="async"
              className="mh-footer-logo"
            />
            <p className="mh-footer-claim">{pick(FOOTER_CLAIM, lang)}</p>
          </div>
          <div className="mh-footer-cols">
            <nav aria-labelledby="mh-foot-assoc">
              <h2 id="mh-foot-assoc">{pick(MICRO_COPY.footerAssociation, lang)}</h2>
              <ul>
                {FOOTER_EXPLORE.map((l) => (
                  <li key={l.href}>
                    <a href={l.href}>{pick(l.label, lang)}</a>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-labelledby="mh-foot-part">
              <h2 id="mh-foot-part">{pick(MICRO_COPY.footerTakePart, lang)}</h2>
              <ul>
                {FOOTER_OFFICIAL.map((l) => (
                  <li key={l.href + pick(l.label, lang)}>
                    <a href={l.href} {...extProps(l)}>
                      {pick(l.label, lang)}
                      {l.external ? (
                        <span className="mh-sr-only">{pick(MICRO_COPY.newTab, lang)}</span>
                      ) : null}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-labelledby="mh-foot-explore" className="mh-footer-discover">
              <h2 id="mh-foot-explore">{pick(MICRO_COPY.footerExplore, lang)}</h2>
              <ul>
                {FOOTER_DISCOVER.map((l) => (
                  <li key={l.href + pick(l.label, lang)}>
                    <a href={l.href}>{pick(l.label, lang)}</a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div className="mh-contact-card">
            <h2 className="mh-sr-only">{pick(MICRO_COPY.contactTitle, lang)}</h2>
            <a
              href={CONTACT.mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={pick(MICRO_COPY.openMaps, lang)}
              className="mh-map-link"
            >
              <img
                src={CONTACT.mapImage}
                alt={pick(CONTACT.mapAlt, lang)}
                width={696}
                height={339}
                loading="lazy"
                decoding="async"
              />
            </a>
            <ul className="mh-contact-list">
              <li>
                <a href={CONTACT.mapsHref} target="_blank" rel="noopener noreferrer">
                  <MapPin size={18} aria-hidden="true" />
                  {pick(CONTACT.address, lang)}
                  <span className="mh-sr-only">{pick(MICRO_COPY.newTab, lang)}</span>
                </a>
              </li>
              <li>
                <a href={CONTACT.email}>
                  <Mail size={18} aria-hidden="true" />
                  <span dir="ltr">info@aisyria.org</span>
                </a>
              </li>
              <li>
                <a href={CONTACT.phone}>
                  <Phone size={18} aria-hidden="true" />
                  <span dir="ltr">{CONTACT.phoneDisplay}</span>
                </a>
              </li>
              <li>
                <a href={CONTACT.mapsHref} target="_blank" rel="noopener noreferrer">
                  {pick(MICRO_COPY.visitUs, lang)}
                  <ArrowUpLeft size={16} aria-hidden="true" className="mh-flip" />
                  <span className="mh-sr-only">{pick(MICRO_COPY.newTab, lang)}</span>
                </a>
              </li>
            </ul>
            <ul className="mh-social-list" aria-label={pick(MICRO_COPY.followUs, lang)}>
              {SOCIAL_LINKS.map((s) => (
                <li key={s.href}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={pick(s.label, lang)}
                    className="mh-social-btn"
                  >
                    <SocialIcon name={s.labelEn} />
                    <span className="mh-sr-only">{pick(MICRO_COPY.newTab, lang)}</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="mh-attr">
              ©{" "}
              <a href={CONTACT.attributionHref} target="_blank" rel="noopener noreferrer">
                OpenStreetMap
                <span className="mh-sr-only">{pick(MICRO_COPY.newTab, lang)}</span>
              </a>
            </p>
          </div>
          <div className="mh-rights-row">
            <p className="mh-rights">{pick(FOOTER_RIGHTS, lang)}</p>
            <a className="mh-to-top" href="#hero-sec" aria-label={pick(MICRO_COPY.backToTop, lang)}>
              <ArrowUp size={20} aria-hidden="true" />
            </a>
          </div>
        </div>
      </footer>
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
