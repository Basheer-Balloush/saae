import { useEffect, useRef, useState, type CSSProperties } from "react";
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
  PARTNERS,
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

export function MobileHomeView({
  lang,
  onToggleLang,
  news,
  newsFailed = false,
}: {
  lang: Locale;
  onToggleLang: () => void;
  /** The newest homepage stories from the database. */
  news: NewsEntry[];
  newsFailed?: boolean;
}) {
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
    const onLoaded = () => document.querySelector('.mobile-home')?.classList.add('mh-hero-ready');
    v.addEventListener('loadeddata', onLoaded);
    return () => v.removeEventListener('loadeddata', onLoaded);
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
