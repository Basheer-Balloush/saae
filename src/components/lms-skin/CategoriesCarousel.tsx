import { useCallback, useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import {
  IconCategoryAI,
  IconCategoryBusiness,
  IconCategoryDesign,
  IconCategoryEducation,
  IconCategoryEngineering,
  IconCategoryGrowth,
  IconCategoryHealth,
  IconCategoryProgramming,
} from "./icons";

export type CarouselCategory = { id: string; name: string; count: number; tone: string };

/* Moaz's ring geometry: the front card exits left and the next enters right. */
const STEP_X = 148;
const STEP_Z = 175;
const STEP_RY = 17;
const AUTOPLAY_MS = 2800;
const VISIBLE_RADIUS = 3;

export function ToneIcon({ tone }: { tone: string }) {
  if (tone === "programming") return <IconCategoryProgramming />;
  if (tone === "business") return <IconCategoryBusiness />;
  if (tone === "health") return <IconCategoryHealth />;
  if (tone === "education") return <IconCategoryEducation />;
  if (tone === "engineering") return <IconCategoryEngineering />;
  if (tone === "design") return <IconCategoryDesign />;
  if (tone === "research") return <IconCategoryGrowth />;
  return <IconCategoryAI />;
}

const courseWord = (n: number, ar: boolean) =>
  ar ? (n === 1 ? "دورة" : "دورات") : n === 1 ? "course" : "courses";

/**
 * The auto-rotating 3D category carousel with its detail panel. Autoplay
 * pauses on hover, focus, touch, a hidden tab, or when the ring is off
 * screen, and never starts for reduced-motion visitors. Clicking the front
 * card (or Browse) hands its category to `onBrowse`.
 */
export function CategoriesCarousel({
  categories,
  onBrowse,
}: {
  categories: CarouselCategory[];
  onBrowse: (id: string) => void;
}) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const n = categories.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  const [bgTone, setBgTone] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const touchX = useRef(0);

  const goTo = useCallback((i: number) => setActive(((i % n) + n) % n), [n]);

  useEffect(() => {
    setBgTone(null);
    const t = window.setTimeout(() => setBgTone(categories[active]?.tone ?? null), 200);
    return () => window.clearTimeout(t);
  }, [active, categories]);

  useEffect(() => {
    if (n < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      if (paused || !onScreen || document.hidden) return;
      goTo(active + 1);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [active, paused, onScreen, goTo, n]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new IntersectionObserver((entries) => setOnScreen(entries.some((e) => e.isIntersecting)), {
      threshold: 0.05,
    });
    observer.observe(stage);
    const pause = () => setPaused(true);
    const resume = () => setPaused(false);
    const onTouchStart = (e: TouchEvent) => {
      touchX.current = e.touches[0].clientX;
      setPaused(true);
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchX.current;
      if (Math.abs(dx) > 36) goTo(active + (dx < 0 ? 1 : -1));
      setPaused(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(active - 1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(active + 1);
      }
    };
    stage.addEventListener("mouseenter", pause);
    stage.addEventListener("mouseleave", resume);
    stage.addEventListener("focusin", pause);
    stage.addEventListener("focusout", resume);
    stage.addEventListener("touchstart", onTouchStart, { passive: true });
    stage.addEventListener("touchend", onTouchEnd, { passive: true });
    stage.addEventListener("keydown", onKeyDown);
    return () => {
      observer.disconnect();
      stage.removeEventListener("mouseenter", pause);
      stage.removeEventListener("mouseleave", resume);
      stage.removeEventListener("focusin", pause);
      stage.removeEventListener("focusout", resume);
      stage.removeEventListener("touchstart", onTouchStart);
      stage.removeEventListener("touchend", onTouchEnd);
      stage.removeEventListener("keydown", onKeyDown);
    };
  }, [active, goTo]);

  if (n === 0) return null;

  const layoutFor = (i: number) => {
    const half = Math.floor(n / 2);
    let pos = ((i - active + n + half) % n) - half;
    if (n % 2 === 0 && pos === -half) pos = half;
    const abs = Math.abs(pos);
    const hidden = abs > VISIBLE_RADIUS;
    return {
      pos,
      hidden,
      style: {
        transform: `translateX(${pos * STEP_X}px) translateZ(${-abs * STEP_Z}px) rotateY(${-pos * STEP_RY}deg) scale(${Math.max(1 - abs * 0.09, 0.62)})`,
        opacity: hidden ? 0 : Math.max(1 - abs * 0.24, 0.18),
        zIndex: 100 - abs,
        filter: abs >= VISIBLE_RADIUS ? "blur(2px)" : "none",
        pointerEvents: hidden ? ("none" as const) : ("auto" as const),
      },
    };
  };

  const current = categories[active];
  const countLabel = (c: CarouselCategory) => `${c.count} ${courseWord(c.count, ar)}`;

  return (
    <section className="lms-section cats-showcase" aria-labelledby="cats-title">
      <div className="cats-bg" aria-hidden="true">
        <span className="cats-bg-glow" />
        <span className={`cats-bg-icon${bgTone ? "" : " is-swap"}`}>{bgTone ? <ToneIcon tone={bgTone} /> : null}</span>
      </div>
      <div className="page-shell cats-shell">
        <div className="lms-head">
          <h2 id="cats-title">{ar ? "استكشف الفئات" : "Explore categories"}</h2>
        </div>
        <div className="cats-layout">
          <div className="cats-info" aria-live="polite">
            <h3>{current.name}</h3>
            <p className="cats-info-desc">
              {ar
                ? `دورات ${current.name} على منصّة الجمعية — اختر ما يناسبك وابدأ اليوم.`
                : `${current.name} courses on the SAAE platform — pick the one that fits you and start today.`}
            </p>
            <p className="cats-info-meta">
              <b>{countLabel(current)}</b>
            </p>
            <div className="cats-info-actions">
              <button
                className="action action-primary"
                type="button"
                aria-label={`${current.name} — ${countLabel(current)}`}
                onClick={() => onBrowse(current.id)}
              >
                <span className="btn-content">
                  <span>{ar ? "تصفح الدورات" : "Browse courses"}</span>
                </span>
              </button>
            </div>
            <ul className="cats-dots" aria-label={ar ? "اختر الفئة" : "Choose category"}>
              {categories.map((c, i) => (
                <li key={c.id} className={i === active ? "is-active" : undefined}>
                  <button type="button" aria-label={c.name} onClick={() => goTo(i)} />
                </li>
              ))}
            </ul>
          </div>

          <div className="cats-stage" ref={stageRef}>
            <ul className="cats-grid">
              {categories.map((c, i) => {
                const { pos, hidden, style } = layoutFor(i);
                return (
                  <li key={c.id} className={`cat-card${pos === 0 ? " is-front" : ""}`} style={style} aria-hidden={hidden}>
                    <button
                      type="button"
                      tabIndex={hidden ? -1 : 0}
                      aria-label={`${c.name} — ${countLabel(c)}`}
                      onClick={() => (i === active ? onBrowse(c.id) : goTo(i))}
                    >
                      <span className="cat-face">
                        <span className={`cat-visual cat-${c.tone}`} aria-hidden="true">
                          <ToneIcon tone={c.tone} />
                        </span>
                        <span className="cat-body">
                          <b>{c.name}</b>
                          <span>
                            {countLabel(c)}
                            <span className="cat-go" aria-hidden="true">
                              →
                            </span>
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="cats-nav" role="group" aria-label={ar ? "الفئات" : "Categories"}>
              <button type="button" aria-label={ar ? "الفئة السابقة" : "Previous category"} onClick={() => goTo(active - 1)}>
                <span aria-hidden="true">←</span>
              </button>
              <button type="button" aria-label={ar ? "الفئة التالية" : "Next category"} onClick={() => goTo(active + 1)}>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
