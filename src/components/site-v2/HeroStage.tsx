import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { COMMUNITY_KEYS, type CommunityKey } from "@/lib/communityCategories";
import { V2Link } from "./V2Link";

/* ── helpers ──────────────────────────────────────────────────────────────── */

/** True once the visitor is on a wide, fine-pointer screen without reduced motion. */
function useCinematic() {
  const [cinematic, setCinematic] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia(
      "(min-width: 1024px) and (pointer: fine) and (orientation: landscape) and (prefers-reduced-motion: no-preference)",
    );
    const apply = () => setCinematic(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  return cinematic;
}

function useReducedMotionFlag() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(q.matches);
    apply();
    q.addEventListener("change", apply);
    return () => q.removeEventListener("change", apply);
  }, []);
  return reduced;
}

/** Splits "5,000+" into its numeric part and whatever wraps it. */
function splitFigure(value: string) {
  const match = value.match(/[\d.,]+/);
  if (!match) return null;
  const digits = match[0];
  const numeric = Number(digits.replace(/,/g, ""));
  if (!Number.isFinite(numeric)) return null;
  return {
    numeric,
    before: value.slice(0, match.index ?? 0),
    after: value.slice((match.index ?? 0) + digits.length),
    grouped: digits.includes(","),
  };
}

function CountUp({ value, active }: { value: string; active: boolean }) {
  const reduced = useReducedMotionFlag();
  const parts = splitFigure(value);
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    if (!parts || reduced || !active) return;
    let frame = 0;
    const start = performance.now();
    const duration = 1400;
    const target = parts.numeric;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setShown(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduced, active]);

  if (!parts || reduced || shown === null) return <>{value}</>;

  const text = parts.grouped ? shown.toLocaleString("en-US") : String(shown);
  return (
    <>
      {parts.before}
      {text}
      {parts.after}
    </>
  );
}

/* ── band bodies ──────────────────────────────────────────────────────────── */

type Copy = ReturnType<typeof useLang>["t"];

function LearnBand({ t }: { t: Copy }) {
  const h = t.v2.home;
  return (
    <div className="v2-band-copy">
      <p className="v2-eyebrow">{h.learnEyebrow}</p>
      <h2 className="v2-band-title">{h.learnTitle}</h2>
      <p className="v2-band-lede">{h.learnCopy}</p>
      <V2Link to="/learning-management-system" className="v2-band-cta">
        {h.learnCta}
        <ArrowRight className="v2-band-cta-icon" aria-hidden="true" />
      </V2Link>
    </div>
  );
}

function InitiativeBand({ t }: { t: Copy }) {
  const h = t.v2.home;
  return (
    <div className="v2-band-copy">
      <p className="v2-eyebrow">{h.initiativeEyebrow}</p>
      <h2 className="v2-band-title">{h.initiativeTitle}</h2>
      <p className="v2-band-lede">{h.initiativeCopy}</p>
      <V2Link to="/one-million-initiative-home" className="v2-band-cta">
        {h.initiativeCta}
        <ArrowRight className="v2-band-cta-icon" aria-hidden="true" />
      </V2Link>
    </div>
  );
}

function StatsBand({ t, active }: { t: Copy; active: boolean }) {
  const h = t.v2.home;
  return (
    <div className="v2-band-copy v2-band-copy-wide">
      <p className="v2-eyebrow">{h.statsEyebrow}</p>
      <h2 className="v2-band-title v2-band-title-sm">{h.statsTitle}</h2>
      <dl className="v2-stat-strip">
        {t.achievements.stats.slice(0, 4).map((stat) => (
          <div key={stat.label} className="v2-stat">
            <dd className="v2-stat-figure">
              <CountUp value={stat.value} active={active} />
            </dd>
            <dt className="v2-stat-label">{stat.label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}

function CommunitiesBand({ t, carousel }: { t: Copy; carousel: boolean }) {
  const h = t.v2.home;
  const cards = t.communities.cards;
  const [index, setIndex] = useState(0);
  const total = COMMUNITY_KEYS.length;
  const key: CommunityKey = COMMUNITY_KEYS[index];
  const card = cards[key];

  if (!carousel) {
    return (
      <div className="v2-band-copy v2-band-copy-wide">
        <p className="v2-eyebrow">{h.communitiesEyebrow}</p>
        <h2 className="v2-band-title v2-band-title-sm">{h.communitiesTitle}</h2>
        <p className="v2-band-lede">{h.communitiesCopy}</p>
        <ul className="v2-community-grid">
          {COMMUNITY_KEYS.map((k) => (
            <li key={k}>
              <V2Link to="/communities/$key" params={{ key: k }} className="v2-community-card">
                <span className="v2-community-name">{cards[k].title}</span>
                <span className="v2-community-copy">{cards[k].desc}</span>
              </V2Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="v2-band-copy v2-band-copy-wide">
      <p className="v2-eyebrow">{h.communitiesEyebrow}</p>
      <h2 className="v2-band-title v2-band-title-sm">{h.communitiesTitle}</h2>
      <div className="v2-community-flip">
        <V2Link to="/communities/$key" params={{ key }} className="v2-community-card is-feature">
          <span className="v2-community-name">{card.title}</span>
          <span className="v2-community-copy">{card.desc}</span>
        </V2Link>
        <div className="v2-community-nav">
          <button
            type="button"
            className="v2-community-btn"
            aria-label={h.communityPrev}
            onClick={() => setIndex((i) => (i - 1 + total) % total)}
          >
            ‹
          </button>
          <span className="v2-community-count">
            {index + 1} / {total}
          </span>
          <button
            type="button"
            className="v2-community-btn"
            aria-label={h.communityNext}
            onClick={() => setIndex((i) => (i + 1) % total)}
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── the stage ────────────────────────────────────────────────────────────── */

export function HeroStage() {
  const { t } = useLang();
  const h = t.v2.home;
  const cinematic = useCinematic();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [band, setBand] = useState(0);

  // Scroll-driven band advance — desktop only, cleaned up on unmount.
  useEffect(() => {
    if (!cinematic) return;
    if (typeof window === "undefined") return;
    const node = stageRef.current;
    if (!node) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      const travel = node.offsetHeight - window.innerHeight;
      if (travel <= 0) return;
      const progress = Math.min(Math.max(-rect.top / travel, 0), 0.999);
      setBand(Math.floor(progress * 4));
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [cinematic]);

  const opening = (
    <section id="hero" className="v2-hero" aria-labelledby="v2-hero-title">
      <div className="v2-hero-media" aria-hidden="true">
        <img src="/saae/hero-static.jpg" alt="" className="v2-hero-frame" />
        <span className="v2-hero-wash" />
      </div>
      <div className="v2-shell v2-hero-inner">
        <p className="v2-eyebrow">{h.heroEyebrow}</p>
        <h1 id="v2-hero-title" className="v2-hero-title">
          {h.heroTitle}
        </h1>
        <p className="v2-hero-lede">{h.heroLede}</p>
        <div className="v2-hero-actions">
          <V2Link to="/learning-management-system" className="v2-band-cta">
            {h.learnCta}
            <ArrowRight className="v2-band-cta-icon" aria-hidden="true" />
          </V2Link>
          <V2Link to="/one-million-initiative-home" className="v2-band-cta is-ghost">
            {h.initiativeCta}
          </V2Link>
        </div>
        <p className="v2-hero-scroll">{h.scroll}</p>
      </div>
      <p className="v2-sr-only">{h.summary}</p>
    </section>
  );

  if (!cinematic) {
    return (
      <>
        {opening}
        <section className="v2-band-stack" aria-label={h.heroEyebrow}>
          <div className="v2-shell v2-band-stack-item">
            <LearnBand t={t} />
          </div>
          <div className="v2-shell v2-band-stack-item">
            <InitiativeBand t={t} />
          </div>
          <div className="v2-shell v2-band-stack-item">
            <StatsBand t={t} active />
          </div>
          <div className="v2-shell v2-band-stack-item">
            <CommunitiesBand t={t} carousel={false} />
          </div>
        </section>
      </>
    );
  }

  const bands = [
    <LearnBand key="learn" t={t} />,
    <InitiativeBand key="initiative" t={t} />,
    <StatsBand key="stats" t={t} active={band === 2} />,
    <CommunitiesBand key="communities" t={t} carousel />,
  ];

  return (
    <>
      {opening}
      <div ref={stageRef} className="v2-cine" aria-label={h.heroEyebrow}>
        <div className="v2-cine-stage">
          <div className="v2-cine-media" aria-hidden="true">
            <img src="/saae/hero-static.jpg" alt="" className="v2-hero-frame" />
            <span className="v2-hero-wash" />
          </div>
          <div className="v2-shell v2-cine-panels">
            {bands.map((node, i) => (
              <div key={i} className={`v2-cine-panel${band === i ? " is-active" : ""}`}>
                {node}
              </div>
            ))}
          </div>
          <div className="v2-cine-dots" aria-hidden="true">
            {bands.map((_, i) => (
              <span key={i} className={band === i ? "is-active" : ""} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default HeroStage;
