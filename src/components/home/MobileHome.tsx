import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Partner } from "@/features/website/partners/data";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  Building2,
  CodeXml,
  Database,
  Facebook,
  FlaskConical,
  Globe,
  HeartPulse,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Megaphone,
  Menu,
  Minus,
  Network,
  Pause,
  Phone,
  Play,
  Plus,
  Presentation,
  Rocket,
  TrendingUp,
  X,
} from "lucide-react";
import { useLang } from "@/lib/i18n";
import { DESKTOP_HOME_QUERY } from "@/hooks/useHeroCapability";
import "./mobile-home.css";
import {
  ACHIEVEMENTS,
  CLOSING_COPY,
  COMMUNITIES,
  COMMUNITIES_COPY,
  CONTACT,
  FAQS,
  FAQ_COPY,
  FOOTER_CLAIM,
  FOOTER_DISCOVER,
  FOOTER_EXPLORE,
  FOOTER_OFFICIAL,
  FOOTER_RIGHTS,
  HERO_MEDIA,
  INITIATIVE_COPY,
  MENU_ASSOCIATION,
  MENU_PARTICIPATE,
  MICRO_COPY,
  MISSION_COPY,
  MISSION_STEPS,
  NEWS_COPY,
  NUMBERS_COPY,
  OPENING,
  OPENING_HEADLINE,
  PARTNERS_COPY,
  RAIL_COPY,
  SOCIAL_LINKS,
  START_COPY,
  WAYS,
  type HomeLink,
  type Locale,
  type NewsEntry,
  type WayEntry,
} from "./mobile-home-content";

function pick<T extends { ar: string; en: string }>(t: T, lang: Locale): string {
  return lang === "ar" ? t.ar : t.en;
}

function extProps(link: HomeLink) {
  return link.external
    ? ({ target: "_blank", rel: "noopener noreferrer" } as const)
    : ({} as const);
}

function words(text: string): string[] {
  return text.split(" ").filter((w) => w.length > 0);
}

const COMMUNITY_ICONS = [
  Database,
  Building2,
  HeartPulse,
  FlaskConical,
  CodeXml,
  TrendingUp,
  Presentation,
  Megaphone,
  BadgeCheck,
] as const;

const RAIL_IDS = ["initiative", "communities", "news", "mission", "partners", "faq"];

/** IntersectionObserver once-hook. SSR-safe: returns false until the effect runs. */
function useInView<T extends HTMLElement>(threshold = 0.2, once = true) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            if (once) io.disconnect();
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, once]);
  return { ref, inView } as const;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const list = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(list.matches);
    update();
    list.addEventListener?.("change", update);
    return () => list.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

function CommunityIcon({ index }: { index: number }) {
  const Icon = COMMUNITY_ICONS[index % COMMUNITY_ICONS.length];
  return <Icon size={20} aria-hidden="true" />;
}

function WayIcon({ kind }: { kind: WayEntry["icon"] }) {
  const Icon = { learning: BookOpen, communities: Network, participation: Rocket }[kind];
  return <Icon size={26} strokeWidth={1.5} aria-hidden="true" />;
}

function SocialIcon({ name }: { name: string }) {
  if (name === "Instagram") return <Instagram size={20} aria-hidden="true" />;
  if (name === "Facebook") return <Facebook size={20} aria-hidden="true" />;
  return <Linkedin size={20} aria-hidden="true" />;
}

/** True only for video-eligible phones: never desktop, reduced motion or save-data. */
function canAutoplayVideo(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia(DESKTOP_HOME_QUERY).matches) return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const conn = (window.navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return conn?.saveData !== true;
}

/** Number tile: SSR shows the final value; clients count up once. */
function MhCount({ count, value }: { count: number; value: string }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.4);
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    if (!inView || typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const start = performance.now();
    const dur = 900;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(eased * count);
      const suffix = value.endsWith("+") ? "+" : "";
      setDisplay(`${current.toLocaleString("en-US")}${suffix}`);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplay(value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, count, value]);
  return (
    <span ref={ref} className="mh-num" data-testid="mh-num">
      {display}
    </span>
  );
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
  const reducedMotion = usePrefersReducedMotion();
  const scrollBehavior = reducedMotion ? "auto" : "smooth";
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [motionReady, setMotionReady] = useState(false);
  const [headerSolid, setHeaderSolid] = useState(false);
  const [activeRail, setActiveRail] = useState<string | null>("initiative");
  const [logosPaused, setLogosPaused] = useState(false);
  const [heroVideoActive, setHeroVideoActive] = useState(false);
  const [heroVideoPaused, setHeroVideoPaused] = useState(false);
  const [rootsVideoActive, setRootsVideoActive] = useState(false);
  const [rootsVideoPaused, setRootsVideoPaused] = useState(false);
  const rootsVideoPausedRef = useRef(false);
  const [newsIndex, setNewsIndex] = useState(0);

  const wordmark =
    lang === "ar"
      ? "/cinematic/mobile/saae-wordmark-ar-light.webp"
      : "/cinematic/mobile/saae-wordmark-en-light.webp";
  const wordmarkSize = lang === "ar" ? { width: 480, height: 162 } : { width: 480, height: 165 };
  const heroLine1 = lang === "ar" ? "ذكاء وريادة" : null;
  const heroLine2 = lang === "ar" ? pick(OPENING_HEADLINE, lang).replace("ذكاء وريادة ", "") : null;

  const heroVideoRef = useRef<HTMLVideoElement | null>(null);
  const heroSectionRef = useRef<HTMLElement | null>(null);
  const heroSentinelRef = useRef<HTMLDivElement | null>(null);
  const rootsVideoRef = useRef<HTMLVideoElement | null>(null);
  const rootsBandRef = useRef<HTMLElement | null>(null);
  const railRef = useRef<HTMLElement | null>(null);
  const railListRef = useRef<HTMLUListElement | null>(null);
  const firstRailRun = useRef(true);
  const newsTrackRef = useRef<HTMLDivElement | null>(null);
  const closingTitle = useInView<HTMLHeadingElement>(0.5);
  const newsRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    setMotionReady(true);
  }, []);

  /* Header glass once the hero top sentinel leaves. */
  useEffect(() => {
    const el = heroSentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setHeaderSolid(!entry.isIntersecting), {
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const heroVideoPausedRef = useRef(false);
  useEffect(() => {
    heroVideoPausedRef.current = heroVideoPaused;
  }, [heroVideoPaused]);

  // Add loadeddata handler to toggle a class when video is ready
  useEffect(() => {
    const v = heroVideoRef.current;
    if (!v) return;
    const onLoaded = () => document.querySelector(".mobile-home")?.classList.add("mh-hero-ready");
    v.addEventListener("loadeddata", onLoaded);
    return () => v.removeEventListener("loadeddata", onLoaded);
  }, []);

  /* Hero video: src assigned only on eligible phones, pauses off-screen. */
  useEffect(() => {
    const video = heroVideoRef.current;
    if (!video) return;
    if (!canAutoplayVideo()) {
      video.pause();
      setHeroVideoActive(false);
      return;
    }
    let heroVisible = true;
    if (canAutoplayVideo()) {
      if (!video.src) video.src = HERO_MEDIA.videoSrc;
      setHeroVideoActive(true);
      if (!heroVideoPausedRef.current) video.play().catch(() => undefined);
    }
    if (typeof IntersectionObserver === "undefined") return;
    const hero = heroSectionRef.current;
    if (!hero) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        heroVisible = entry.isIntersecting;
        if (!video.src) return;
        if (heroVisible && canAutoplayVideo() && !heroVideoPausedRef.current)
          video.play().catch(() => undefined);
        else video.pause();
      },
      { threshold: 0.15 },
    );
    io.observe(hero);
    return () => {
      io.disconnect();
      video.pause();
    };
  }, [reducedMotion]);

  const toggleHeroVideo = () => {
    const video = heroVideoRef.current;
    if (!video || !video.src) return;
    if (video.paused) {
      video.play().catch(() => undefined);
      setHeroVideoPaused(false);
    } else {
      video.pause();
      setHeroVideoPaused(true);
    }
  };

  /* Roots video: src assigned lazily near the band, plays while visible. */
  useEffect(() => {
    const video = rootsVideoRef.current;
    const band = rootsBandRef.current;
    if (!video || !band || typeof IntersectionObserver === "undefined") return;
    if (!canAutoplayVideo()) {
      video.pause();
      setRootsVideoActive(false);
      return;
    }
    const arm = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        if (canAutoplayVideo() && !video.src) {
          video.src = CLOSING_COPY.videoSrc;
        }
        setRootsVideoActive(Boolean(video.src));
        if (canAutoplayVideo() && !rootsVideoPausedRef.current) video.play().catch(() => undefined);
        arm.disconnect();
      },
      { rootMargin: "100% 0px" },
    );
    const watcher = new IntersectionObserver(
      ([entry]) => {
        if (!video.src) return;
        if (entry.isIntersecting && canAutoplayVideo() && !rootsVideoPausedRef.current)
          video.play().catch(() => undefined);
        else video.pause();
      },
      { threshold: 0.15 },
    );
    arm.observe(band);
    watcher.observe(band);
    return () => {
      arm.disconnect();
      watcher.disconnect();
      video.pause();
    };
  }, [reducedMotion]);

  const toggleRootsVideo = () => {
    const video = rootsVideoRef.current;
    if (!video || !video.src) return;
    const pause = !video.paused;
    rootsVideoPausedRef.current = pause;
    setRootsVideoPaused(pause);
    if (pause) video.pause();
    else video.play().catch(() => undefined);
  };

  /* Rail active section tracking; null while above #initiative. */
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActiveRail(e.target.id);
          else if (e.target.id === "initiative" && e.boundingClientRect.top > 0) {
            setActiveRail(null);
          }
        }
      },
      { rootMargin: "-38% 0px -55% 0px", threshold: 0 },
    );
    for (const id of RAIL_IDS) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [motionReady]);

  /* Keep the active pill centred inside the rail (rail scroll only). */
  useEffect(() => {
    const rail = railRef.current;
    const list = railListRef.current;
    if (!rail || !list) return;
    if (firstRailRun.current) {
      firstRailRun.current = false;
      return;
    }
    if (!activeRail) return;
    const pill = list.querySelector<HTMLElement>(`[data-rail="${activeRail}"]`);
    if (!pill) return;
    const railRect = rail.getBoundingClientRect();
    const pillRect = pill.getBoundingClientRect();
    const delta = pillRect.left + pillRect.width / 2 - (railRect.left + railRect.width / 2);
    list.scrollBy({ left: delta, behavior: scrollBehavior });
  }, [activeRail, scrollBehavior]);

  /* News visible-card tracking (no scroll listeners). */
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const track = newsTrackRef.current;
    const cards = track?.querySelectorAll<HTMLElement>("[data-news-card]");
    if (!track || !cards?.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const i = Number((e.target as HTMLElement).dataset.newsCard);
            if (!Number.isNaN(i)) setNewsIndex(i);
          }
        }
      },
      { root: track, threshold: 0.6 },
    );
    cards.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [motionReady]);

  /* News paging: scroll the track only, aligning the card's inline-start edge. */
  const scrollNewsTo = (index: number) => {
    const track = newsTrackRef.current;
    const card = track?.querySelector<HTMLElement>(`[data-index="${index}"]`);
    if (!track || !card) return;
    const rtl = getComputedStyle(track).direction === "rtl";
    const trackRect = track.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const pad = parseFloat(getComputedStyle(track).paddingInlineStart) || 0;
    const delta = rtl
      ? cardRect.right - trackRect.right + pad
      : cardRect.left - trackRect.left - pad;
    track.scrollBy({ left: delta, behavior: scrollBehavior });
  };

  const stepNews = (delta: number) => {
    const next = Math.min(news.length - 1, Math.max(0, newsIndex + delta));
    scrollNewsTo(next);
  };

  const heroTitleWords = words(pick(OPENING_HEADLINE, lang));
  const closingWords = words(pick(CLOSING_COPY.title, lang));

  return (
    <div
      className={motionReady ? "mobile-home mh-gate mh-motion-ready" : "mobile-home mh-gate"}
      dir={dir}
      lang={lang}
    >
      <style>{`@media ${DESKTOP_HOME_QUERY}{.mobile-home.mh-gate{visibility:hidden}}`}</style>
      <noscript>
        <style>{".mobile-home.mh-gate{visibility:visible!important}"}</style>
      </noscript>
      <a className="mh-skip" href="#main-content">
        {pick(MICRO_COPY.skip, lang)}
      </a>

      <header className={headerSolid ? "mh-header mh-is-solid" : "mh-header"}>
        <div className="mh-header-row">
          <a className="mh-brand" href="/" aria-label={pick(MICRO_COPY.brandName, lang)}>
            <img
              src={wordmark}
              alt=""
              width={wordmarkSize.width}
              height={wordmarkSize.height}
              decoding="async"
            />
          </a>
          <span className="mh-header-spacer" aria-hidden="true" />
          <button
            type="button"
            className="mh-lang"
            onClick={onToggleLang}
            aria-label={pick(MICRO_COPY.switchLabel, lang)}
          >
            <Globe size={18} aria-hidden="true" />
            {pick(MICRO_COPY.switchTo, lang)}
          </button>
          <DialogPrimitive.Root open={menuOpen} onOpenChange={setMenuOpen}>
            <DialogPrimitive.Trigger asChild>
              <button
                type="button"
                className="mh-menu-btn"
                aria-label={pick(MICRO_COPY.menu, lang)}
              >
                <Menu size={20} aria-hidden="true" />
                <span className="mh-menu-btn-label">{pick(MICRO_COPY.menu, lang)}</span>
              </button>
            </DialogPrimitive.Trigger>
            <DialogPrimitive.Portal>
              <div className="mobile-home mh-portal-scope" dir={dir} lang={lang}>
                <DialogPrimitive.Overlay className="mh-menu-overlay" />
                <DialogPrimitive.Content
                  className="mh-menu-panel"
                  aria-label={pick(MICRO_COPY.menu, lang)}
                >
                  <DialogPrimitive.Description className="mh-sr-only">
                    {pick(MICRO_COPY.menuDesc, lang)}
                  </DialogPrimitive.Description>
                  <img
                    className="mh-menu-logo"
                    src={wordmark}
                    alt={pick(OPENING.eyebrow, lang)}
                    width={wordmarkSize.width}
                    height={wordmarkSize.height}
                    decoding="async"
                  />
                  <div className="mh-menu-head">
                    <DialogPrimitive.Title className="mh-menu-title">
                      {pick(MICRO_COPY.menu, lang)}
                    </DialogPrimitive.Title>
                    <DialogPrimitive.Close asChild>
                      <button
                        type="button"
                        className="mh-menu-close"
                        aria-label={pick(MICRO_COPY.closeMenu, lang)}
                      >
                        <X size={20} aria-hidden="true" />
                      </button>
                    </DialogPrimitive.Close>
                  </div>
                  <h2 className="mh-menu-group-title">{pick(MICRO_COPY.association, lang)}</h2>
                  <ul className="mh-menu-list">
                    {MENU_ASSOCIATION.map((l, i) => (
                      <li key={l.href} style={{ "--i": i } as CSSProperties}>
                        <a href={l.href} {...extProps(l)} onClick={() => setMenuOpen(false)}>
                          <span className="mh-menu-num" aria-hidden="true">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          {pick(l.label, lang)}
                          <ArrowUpRight size={18} aria-hidden="true" className="mh-flip" />
                          {l.external ? (
                            <span className="mh-sr-only">{pick(MICRO_COPY.newTab, lang)}</span>
                          ) : null}
                        </a>
                      </li>
                    ))}
                  </ul>
                  <h2 className="mh-menu-group-title">{pick(MICRO_COPY.participate, lang)}</h2>
                  <ul className="mh-menu-list">
                    {MENU_PARTICIPATE.map((l, i) => (
                      <li
                        key={l.href}
                        style={{ "--i": i + MENU_ASSOCIATION.length } as CSSProperties}
                      >
                        <a href={l.href} {...extProps(l)} onClick={() => setMenuOpen(false)}>
                          <span className="mh-menu-num" aria-hidden="true">
                            {String(i + 1 + MENU_ASSOCIATION.length).padStart(2, "0")}
                          </span>
                          {pick(l.label, lang)}
                          <ArrowUpRight size={18} aria-hidden="true" className="mh-flip" />
                          {l.external ? (
                            <span className="mh-sr-only">{pick(MICRO_COPY.newTab, lang)}</span>
                          ) : null}
                        </a>
                      </li>
                    ))}
                  </ul>
                  <a
                    className="mh-menu-cta"
                    href={OPENING.primary.href}
                    onClick={() => setMenuOpen(false)}
                  >
                    {pick(OPENING.primary.label, lang)}
                  </a>
                  <div className="mh-menu-contact">
                    <a href={CONTACT.email}>
                      <Mail size={18} aria-hidden="true" />
                      <span dir="ltr">info@aisyria.org</span>
                    </a>
                    <a href={CONTACT.phone}>
                      <Phone size={18} aria-hidden="true" />
                      <span dir="ltr">{CONTACT.phoneDisplay}</span>
                    </a>
                  </div>
                  <ul className="mh-menu-social" aria-label={pick(MICRO_COPY.followUs, lang)}>
                    {SOCIAL_LINKS.map((s) => (
                      <li key={s.href}>
                        <a
                          href={s.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={pick(s.label, lang)}
                        >
                          <SocialIcon name={s.labelEn} />
                          <span className="mh-sr-only">{pick(MICRO_COPY.newTab, lang)}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </DialogPrimitive.Content>
              </div>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        </div>
      </header>

      <main id="main-content">
        <section
          className="mh-hero"
          id="hero-sec"
          aria-labelledby="mh-hero-title"
          ref={heroSectionRef}
        >
          <div ref={heroSentinelRef} className="mh-hero-sentinel" aria-hidden="true" />
          <video
            ref={heroVideoRef}
            className="mh-hero-video"
            muted
            playsInline
            loop
            preload="metadata"
            poster={HERO_MEDIA.videoPoster}
            aria-hidden="true"
            disablePictureInPicture
            tabIndex={-1}
          />
          <div className="mh-hero-scrim" aria-hidden="true" />
          <div className="mh-wrap mh-hero-copy">
            <p className="mh-eyebrow mh-kinetic mh-k-0">{pick(OPENING.eyebrow, lang)}</p>
            <h1 className="mh-title" id="mh-hero-title">
              <span className="mh-sr-only">{pick(OPENING_HEADLINE, lang)}</span>
              <span aria-hidden="true" className="mh-h1-visual">
                {heroLine1 ? (
                  <>
                    <span className="mh-h1-line">
                      {words(heroLine1).map((w, i) => (
                        <span key={i} className="mh-mask">
                          <span className="mh-word mh-k-1" style={{ "--i": i } as CSSProperties}>
                            {w}
                          </span>
                        </span>
                      ))}
                    </span>
                    <br />
                    <span className="mh-h1-line">
                      {words(heroLine2 ?? "").map((w, i) => (
                        <span key={i} className="mh-mask">
                          <span
                            className={w === "ينهض" ? "mh-word mh-k-2 mh-grad" : "mh-word mh-k-2"}
                            style={{ "--i": i + 2 } as CSSProperties}
                          >
                            {w}
                          </span>
                        </span>
                      ))}
                    </span>
                  </>
                ) : (
                  heroTitleWords.map((w, i) => (
                    <span key={i} className="mh-mask">
                      <span
                        className={
                          w.toLowerCase().startsWith("rise") ? "mh-word mh-grad" : "mh-word"
                        }
                        style={{ "--i": i } as CSSProperties}
                      >
                        {w}
                      </span>
                    </span>
                  ))
                )}
              </span>
            </h1>
            <p className="mh-support mh-kinetic mh-k-3">{pick(OPENING.support, lang)}</p>
            <div className="mh-actions mh-kinetic mh-k-4">
              <a className="mh-btn-primary" href={OPENING.primary.href}>
                {pick(OPENING.primary.label, lang)}
              </a>
              <a className="mh-btn-secondary" href={OPENING.secondary.href}>
                {pick(OPENING.secondary.label, lang)}
              </a>
            </div>
          </div>
          {heroVideoActive ? (
            <button
              type="button"
              className="mh-video-toggle"
              aria-pressed={!heroVideoPaused}
              aria-label={
                heroVideoPaused
                  ? pick(MICRO_COPY.playVideo, lang)
                  : pick(MICRO_COPY.pauseVideo, lang)
              }
              onClick={toggleHeroVideo}
            >
              {heroVideoPaused ? (
                <Play size={20} aria-hidden="true" />
              ) : (
                <Pause size={20} aria-hidden="true" />
              )}
            </button>
          ) : null}
        </section>

        <div className="mh-chapters">
          <nav
            className="mh-rail"
            id="mh-rail"
            ref={railRef}
            aria-label={pick(RAIL_COPY.label, lang)}
          >
            <ul className="mh-rail-list" ref={railListRef}>
              {RAIL_COPY.items.map((item) => {
                const id = item.href.slice(1);
                const active = activeRail === id;
                return (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      data-rail={id}
                      aria-current={active ? "true" : undefined}
                      className={active ? "mh-pill mh-is-active" : "mh-pill"}
                    >
                      <span className="mh-roulette">
                        <span className="mh-roulette-line">{pick(item.label, lang)}</span>
                        <span className="mh-roulette-line" aria-hidden="true">
                          {pick(item.label, lang)}
                        </span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          <section className="mh-section" id="achievements" aria-labelledby="mh-numbers-title">
            <div className="mh-wrap">
              <p className="mh-eyebrow">{pick(NUMBERS_COPY.eyebrow, lang)}</p>
              <h2 className="mh-section-h" id="mh-numbers-title">
                {pick(NUMBERS_COPY.title, lang)}
              </h2>
              <div className="mh-numbers">
                {ACHIEVEMENTS.map((a) => (
                  <div className="mh-number-tile" key={a.value}>
                    <MhCount count={a.count} value={a.value} />
                    <span className="mh-num-label">{pick(a.label, lang)}</span>
                    <span className="mh-num-bar" aria-hidden="true" />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mh-section" id="start" aria-labelledby="mh-start-title">
            <div className="mh-wrap">
              <p className="mh-eyebrow">{pick(START_COPY.eyebrow, lang)}</p>
              <h2 className="mh-section-h" id="mh-start-title">
                {pick(START_COPY.title, lang)}
              </h2>
            </div>
            <nav className="mh-wrap mh-ways" aria-label={pick(START_COPY.linksLabel, lang)}>
              {WAYS.map((w) => (
                <a key={pick(w.title, lang)} href={w.href} className="mh-way-card">
                  <span className="mh-way-icon">
                    <WayIcon kind={w.icon} />
                  </span>
                  <span className="mh-way-body">
                    <span className="mh-way-title">{pick(w.title, lang)}</span>
                    <span className="mh-way-text">{pick(w.body, lang)}</span>
                    <span className="mh-way-cta">
                      {pick(w.cta, lang)}
                      <ArrowUpRight size={18} aria-hidden="true" className="mh-flip" />
                    </span>
                  </span>
                </a>
              ))}
            </nav>
          </section>

          <section className="mh-initiative" id="initiative" aria-labelledby="mh-initiative-title">
            <div className="mh-wrap mh-initiative-target">
              <p className="mh-eyebrow">{pick(INITIATIVE_COPY.target, lang)}</p>
              <p className="mh-giant-num" dir="ltr">
                1,000,000
              </p>
              <p className="mh-initiative-reach">{pick(INITIATIVE_COPY.reach, lang)}</p>
            </div>
            <div className="mh-initiative-media" aria-hidden="true">
              <img
                src={INITIATIVE_COPY.image}
                alt=""
                width={600}
                height={460}
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="mh-wrap mh-initiative-copy">
              <p className="mh-eyebrow">{pick(INITIATIVE_COPY.eyebrow, lang)}</p>
              <h2 className="mh-section-h" id="mh-initiative-title">
                {pick(INITIATIVE_COPY.title, lang)}
              </h2>
              <p className="mh-section-p">{pick(INITIATIVE_COPY.body, lang)}</p>
              <div className="mh-feature-actions">
                <a className="mh-btn-primary" href="/initiative">
                  {pick(INITIATIVE_COPY.primary, lang)}
                </a>
                <a className="mh-btn-secondary" href="/one-million-initiative-home">
                  {pick(INITIATIVE_COPY.official, lang)}
                </a>
              </div>
            </div>
          </section>

          <section className="mh-section" id="communities" aria-labelledby="mh-comm-title">
            <div className="mh-wrap">
              <p className="mh-eyebrow">{pick(COMMUNITIES_COPY.eyebrow, lang)}</p>
              <h2 className="mh-section-h" id="mh-comm-title">
                {pick(COMMUNITIES_COPY.title, lang)}
              </h2>
              <p className="mh-section-p">{pick(COMMUNITIES_COPY.body, lang)}</p>
              <ol className="mh-trunk">
                {COMMUNITIES.map((c, i) => (
                  <MhTrunkRow key={c.key} index={i} href={c.href} lang={lang} />
                ))}
              </ol>
            </div>
          </section>

          <section className="mh-section" id="news" aria-labelledby="mh-news-title">
            <div className="mh-wrap">
              <p className="mh-eyebrow">{pick(NEWS_COPY.eyebrow, lang)}</p>
              <h2 className="mh-section-h" id="mh-news-title">
                {pick(NEWS_COPY.title, lang)}
              </h2>
              <p className="mh-section-p">{pick(NEWS_COPY.body, lang)}</p>
            </div>
            {news.length === 0 ? (
              <div className="mh-wrap">
                <p className="mh-section-p" role="status">
                  {pick(newsFailed ? NEWS_COPY.failed : NEWS_COPY.empty, lang)}
                </p>
              </div>
            ) : (
              <>
                <div
                  className="mh-snap mh-news-snap"
                  ref={newsTrackRef}
                  role="region"
                  aria-roledescription="carousel"
                  aria-label={pick(NEWS_COPY.carouselLabel, lang)}
                  tabIndex={0}
                >
                  {news.map((n, i) => (
                    <article
                      key={n.id}
                      className="mh-news-card"
                      data-news-card={i}
                      data-index={i}
                      ref={(el) => {
                        newsRefs.current[i] = el;
                      }}
                    >
                      <a href={n.href} className="mh-news-link" aria-label={pick(n.headline, lang)}>
                        <img
                          src={n.image}
                          alt={pick(n.imageAlt, lang)}
                          width={800}
                          height={600}
                          loading="lazy"
                          decoding="async"
                        />
                        <span className="mh-news-body">
                          <span className="mh-news-meta">
                            <span className="mh-news-tag">{pick(n.tag, lang)}</span>
                            <time dateTime={n.dateTime}>{pick(n.date, lang)}</time>
                          </span>
                          <span className="mh-news-head">{pick(n.headline, lang)}</span>
                          <span className="mh-news-ex">{pick(n.excerpt, lang)}</span>
                          <span className="mh-news-cta">
                            {pick(NEWS_COPY.readStory, lang)}
                            <ArrowUpRight size={16} aria-hidden="true" className="mh-flip" />
                          </span>
                        </span>
                      </a>
                    </article>
                  ))}
                </div>
                <div className="mh-wrap mh-news-controls">
                  <div className="mh-carousel-btns">
                    <button
                      type="button"
                      className="mh-round-btn"
                      aria-label={pick(MICRO_COPY.prev, lang)}
                      disabled={newsIndex === 0}
                      onClick={() => stepNews(-1)}
                    >
                      <ArrowLeft size={20} aria-hidden="true" className="mh-flip" />
                    </button>
                    <button
                      type="button"
                      className="mh-round-btn"
                      aria-label={pick(MICRO_COPY.next, lang)}
                      disabled={newsIndex === news.length - 1}
                      onClick={() => stepNews(1)}
                    >
                      <ArrowRight size={20} aria-hidden="true" className="mh-flip" />
                    </button>
                  </div>
                  <p className="mh-counter" aria-live="polite">
                    <span dir="ltr">
                      {newsIndex + 1} / {news.length}
                    </span>
                  </p>
                </div>
              </>
            )}
            <div className="mh-wrap">
              <a className="mh-inline-link" href="/news">
                {pick(NEWS_COPY.allNews, lang)}
                <ArrowUpRight size={16} aria-hidden="true" className="mh-flip" />
              </a>
            </div>
          </section>

          <section className="mh-section" id="mission" aria-labelledby="mh-mission-title">
            <div className="mh-wrap">
              <p className="mh-eyebrow">{pick(MISSION_COPY.eyebrow, lang)}</p>
              <h2 className="mh-section-h" id="mh-mission-title">
                {pick(MISSION_COPY.title, lang)}
              </h2>
              <ol className="mh-stack">
                {MISSION_STEPS.map((s, i) => (
                  <li
                    key={pick(s.index, lang)}
                    className={`mh-stack-card mh-accent-${i}`}
                    style={{ "--i": i } as CSSProperties}
                  >
                    <span className="mh-stack-num" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="mh-step-index">{pick(s.index, lang)}</p>
                    <h3 className="mh-stack-title">{pick(s.title, lang)}</h3>
                    <p className="mh-stack-body">{pick(s.body, lang)}</p>
                  </li>
                ))}
              </ol>
              <p className="mh-below-stack">
                <a className="mh-inline-link" href="/about">
                  {pick(MISSION_COPY.aboutLink, lang)}
                  <ArrowUpRight size={16} aria-hidden="true" className="mh-flip" />
                </a>
              </p>
            </div>
          </section>

          <section
            className={logosPaused ? "mh-section mh-is-paused" : "mh-section"}
            id="partners"
            aria-labelledby="mh-partners-title"
          >
            <div className="mh-wrap mh-partners-head">
              <div>
                <p className="mh-eyebrow">{pick(PARTNERS_COPY.eyebrow, lang)}</p>
                <h2 className="mh-section-h" id="mh-partners-title">
                  {pick(PARTNERS_COPY.title, lang)}
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
              <a className="mh-inline-link" href="/partners">
                {pick(PARTNERS_COPY.allPartners, lang)}
                <ArrowUpRight size={16} aria-hidden="true" className="mh-flip" />
              </a>
            </div>
          </section>

          <section className="mh-section" id="faq" aria-labelledby="mh-faq-title">
            <div className="mh-wrap">
              <p className="mh-eyebrow">{pick(FAQ_COPY.eyebrow, lang)}</p>
              <h2 className="mh-section-h" id="mh-faq-title">
                {pick(FAQ_COPY.title, lang)}
              </h2>
              <p className="mh-section-p">{pick(FAQ_COPY.body, lang)}</p>
              <ul className="mh-faq-list">
                {FAQS.map((f, i) => {
                  const open = openFaq === i;
                  return (
                    <li key={pick(f.question, lang)} className="mh-faq-item">
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
                    </li>
                  );
                })}
              </ul>
              <a className="mh-btn-secondary mh-write-btn" href="/contact#write">
                {pick(FAQ_COPY.writeToUs, lang)}
              </a>
            </div>
          </section>
        </div>

        <section className="mh-join" id="join" aria-labelledby="mh-join-title" ref={rootsBandRef}>
          <video
            ref={rootsVideoRef}
            className="mh-join-video"
            muted
            playsInline
            loop
            preload="none"
            poster={CLOSING_COPY.videoPoster}
            aria-hidden="true"
            disablePictureInPicture
            tabIndex={-1}
          />
          <div className="mh-join-scrim" aria-hidden="true" />
          {rootsVideoActive ? (
            <button
              type="button"
              className="mh-video-toggle"
              aria-pressed={!rootsVideoPaused}
              aria-label={pick(
                rootsVideoPaused ? MICRO_COPY.playVideo : MICRO_COPY.pauseVideo,
                lang,
              )}
              onClick={toggleRootsVideo}
            >
              {rootsVideoPaused ? (
                <Play size={20} aria-hidden="true" />
              ) : (
                <Pause size={20} aria-hidden="true" />
              )}
            </button>
          ) : null}
          <div className="mh-wrap mh-join-copy">
            <p className="mh-eyebrow">{pick(CLOSING_COPY.eyebrow, lang)}</p>
            <h2
              className={closingTitle.inView ? "mh-join-title mh-is-lit" : "mh-join-title"}
              id="mh-join-title"
              ref={closingTitle.ref}
            >
              <span className="mh-sr-only">{pick(CLOSING_COPY.title, lang)}</span>
              <span aria-hidden="true">
                {closingWords.map((w, i) => (
                  <span key={i} className="mh-lit-word" style={{ "--i": i } as CSSProperties}>
                    {w}
                  </span>
                ))}
              </span>
            </h2>
            <p className="mh-join-body">{pick(CLOSING_COPY.body, lang)}</p>
            <div className="mh-actions">
              <a className="mh-btn-primary" href="/learning-management-system">
                {pick(CLOSING_COPY.primary, lang)}
              </a>
              <a className="mh-btn-secondary" href="/registration">
                {pick(CLOSING_COPY.secondary, lang)}
              </a>
            </div>
          </div>
        </section>
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

function MhTrunkRow({ index, href, lang }: { index: number; href: string; lang: Locale }) {
  const { ref, inView } = useInView<HTMLLIElement>(0.4);
  const c = COMMUNITIES[index];
  if (!c) return null;
  return (
    <li ref={ref} className={inView ? "mh-trunk-row mh-is-in" : "mh-trunk-row"}>
      <a href={href}>
        <span className="mh-node" aria-hidden="true" />
        <span className="mh-trunk-index" aria-hidden="true">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="mh-trunk-icon" aria-hidden="true">
          <CommunityIcon index={index} />
        </span>
        <span className="mh-trunk-text">
          <span className="mh-comm-name">{pick(c.name, lang)}</span>
          <span className="mh-comm-tag">{pick(c.tagline, lang)}</span>
        </span>
        <ArrowUpRight size={18} aria-hidden="true" className="mh-flip mh-trunk-arrow" />
      </a>
    </li>
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
