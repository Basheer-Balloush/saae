import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  CodeXml,
  Database,
  FlaskConical,
  HeartPulse,
  Megaphone,
  Presentation,
  TrendingUp,
} from "lucide-react";
import MotionButton from "@/components/ui/motion-button";
import { ACHIEVEMENTS, COMMUNITIES, OPENING, OPENING_HEADLINE } from "./mobile-home-content";

/* The phone hero plays the desktop hero's whole journey: the pixel tree from
   public/cinematic/js/hero-instrument.js in its centred portrait layout, with
   the same six captions on the same schedule as home-inline.js. The section is
   a tall scroll runway; the stage sticks for its length. The scene takes the
   top of the screen and the captions sit under it. */

type Lang = "ar" | "en";
export type TreeMode = "loading" | "live" | "static";

type HeroInstance = {
  render: (progress: number) => void;
  setProgress?: (progress: number) => void;
  resize: () => void;
  dispose: () => void;
  startEntrance: () => void;
  setCommunity?: (index: number) => void;
  setCalm?: (y: number, w: number) => void;
};

/* The desktop schedule (home-inline.js CAPTION_CUES / heroBeatThresholds),
   which is tree-story.js's own: a caption arrives over the back of the camera
   move that brings its subject in, and leaves over the front of the next. */
const CUES: Array<{ enter: [number, number] | null; exit: [number, number] | null }> = [
  { enter: null, exit: [0.055, 0.135] },
  { enter: [0.055, 0.135], exit: [0.32, 0.372] },
  { enter: [0.32, 0.372], exit: [0.492, 0.544] },
  { enter: [0.492, 0.544], exit: [0.664, 0.716] },
  { enter: [0.664, 0.716], exit: [0.836, 0.874] },
  { enter: [0.836, 0.874], exit: null },
];
const BEATS = [0.095, 0.346, 0.518, 0.69, 0.855];
const HANDOFF = 0.46;
const COMMUNITY_FLIP_MS = 5000;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (t: number) => t * t * (3 - 2 * t);

function bandOpacity(index: number, p: number): number {
  const cue = CUES[index];
  let o = 1;
  if (cue.enter) {
    const [a, b] = cue.enter;
    const start = b - (b - a) * HANDOFF;
    o *= smooth(clamp01((p - start) / (b - start)));
  }
  if (cue.exit) {
    const [a, b] = cue.exit;
    const end = a + (b - a) * HANDOFF;
    o *= 1 - smooth(clamp01((p - a) / (end - a)));
  }
  return o;
}

const bandAt = (p: number) => {
  const next = BEATS.findIndex((t) => p < t);
  return next === -1 ? BEATS.length : next;
};

function supportsWebGl2(): boolean {
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}

let mountCount = 0;

function useTreeJourney(
  sectionRef: RefObject<HTMLElement | null>,
  bandRefs: RefObject<Array<HTMLElement | null>>,
  instanceRef: RefObject<HeroInstance | null>,
) {
  const [mode, setMode] = useState<TreeMode>("loading");
  const [band, setBand] = useState(0);
  const [openingReady, setOpeningReady] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !supportsWebGl2()) {
      setMode("static");
      setOpeningReady(true);
      return;
    }

    let frame = 0;
    let eased = 0;
    let lastTime = performance.now();
    let bandNow = 0;
    let disposed = false;
    let fellBack = false;

    const readProgress = () => {
      const rect = section.getBoundingClientRect();
      return clamp01(-rect.top / Math.max(1, rect.height - window.innerHeight));
    };

    const paint = (p: number) => {
      section.style.setProperty("--mh-tree-t", p.toFixed(4));
      bandRefs.current?.forEach((el, i) => {
        if (!el) return;
        const o = bandOpacity(i, p);
        el.style.opacity = o.toFixed(3);
        // Leaves upward, the way the camera pulls away; arrives from just below.
        const exit = CUES[i].exit;
        const lift = exit && p > exit[0] ? -22 * (1 - o) : 14 * (1 - o);
        el.style.transform = `translateY(${lift.toFixed(1)}px)`;
      });
      const next = bandAt(p);
      if (next !== bandNow) {
        bandNow = next;
        setBand(next);
      }
      const instance = instanceRef.current;
      if (instance) {
        instance.setCalm?.(-0.5, 0.6);
        // The scene's own frame loop draws it: one draw per frame, not two.
        if (instance.setProgress) instance.setProgress(p);
        else instance.render(p);
      }
    };

    const tick = (now: number) => {
      frame = 0;
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      // Below the hero there is nothing to draw: the rest of the page scrolls
      // without the scene or the captions doing any work.
      const rect = section.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= window.innerHeight) {
        eased = readProgress();
        return;
      }
      const target = readProgress();
      eased += (target - eased) * Math.min(1, dt * 6);
      if (Math.abs(target - eased) < 0.0003) eased = target;
      paint(eased);
      if (eased !== target) frame = requestAnimationFrame(tick);
    };

    const schedule = () => {
      if (frame || disposed) return;
      lastTime = performance.now();
      frame = requestAnimationFrame(tick);
    };

    let openingTimer = 0;
    const onReady = (event: Event) => {
      const arrived = (event as CustomEvent<HeroInstance>).detail;
      // Too late: the page already settled on the drawn tree, so don't jump it.
      if (disposed || fellBack) {
        arrived.dispose();
        return;
      }
      instanceRef.current = arrived;
      arrived.resize();
      arrived.startEntrance();
      setMode("live");
      // The tree forms first; the opening headline follows once it has.
      openingTimer = window.setTimeout(() => setOpeningReady(true), 1700);
      schedule();
    };

    const onResize = () => {
      instanceRef.current?.resize();
      schedule();
    };

    section.addEventListener("saae:hero-ready", onReady);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    paint(readProgress());

    /* A fresh URL per mount, so returning to the homepage boots a new scene on
       the new canvas; three.js and the other imports stay cached. */
    const script = document.createElement("script");
    script.type = "module";
    script.src = `/cinematic/js/hero-instrument.js?phone=${++mountCount}`;
    document.head.appendChild(script);

    // No scene in time (slow download, lost context): the drawn tree and all captions.
    const fallback = window.setTimeout(() => {
      if (!instanceRef.current && !disposed) {
        fellBack = true;
        setMode("static");
        setOpeningReady(true);
      }
    }, 9000);

    return () => {
      disposed = true;
      window.clearTimeout(fallback);
      window.clearTimeout(openingTimer);
      if (frame) cancelAnimationFrame(frame);
      section.removeEventListener("saae:hero-ready", onReady);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", onResize);
      instanceRef.current?.dispose();
      instanceRef.current = null;
      script.remove();
    };
  }, [sectionRef, bandRefs, instanceRef]);

  // Static mode lays the captions out as a column, so every one of them is up.
  useEffect(() => {
    if (mode !== "static") return;
    bandRefs.current?.forEach((el) => {
      if (!el) return;
      el.style.opacity = "";
      el.style.transform = "";
    });
  }, [mode, bandRefs]);

  return { mode, band, openingReady };
}

const COPY = {
  communities: {
    eyebrow: { ar: "مجتمعات الجمعية", en: "SAAE communities" },
    title: {
      ar: "مجتمعات متخصصة، وجذور تجمعنا",
      en: "Specialized communities, one shared foundation",
    },
    action: { ar: "استكشف المجتمعات", en: "Explore communities" },
    previous: { ar: "المجتمع السابق", en: "Previous community" },
    next: { ar: "المجتمع التالي", en: "Next community" },
    choose: { ar: "اختر مجتمعاً", en: "Choose a community" },
  },
  learning: {
    eyebrow: { ar: "المنصة التعليمية التدريبية", en: "The learning platform" },
    title: { ar: "تعلّم ينمو من مجتمعاتنا", en: "Learning, grown from our communities" },
    body: {
      ar: "مسارات تدريب معتمدة تبني مهارات مهنية وتقنية، ومتاحة للجميع في سورية.",
      en: "Certified training tracks that build professional and technical skill, open to anyone in Syria.",
    },
    action: { ar: "استفسر عن التعلّم", en: "Ask about learning" },
  },
  achievements: {
    eyebrow: { ar: "انجازات الجمعية", en: "SAAE achievements" },
    title: { ar: "مجتمع يتجاوز 5,000 متعلم", en: "A community of 5,000+ learners" },
  },
  million: {
    eyebrow: {
      ar: "مبادرة مليون مستخدم سوري للذكاء الاصطناعي",
      en: "The Million Syrian AI Users initiative",
    },
    title: {
      ar: "مليون شخص خطوة وطنية إلى الأمام",
      en: "One million people One national step forward",
    },
    body: {
      ar: "مبادرة وطنية تمكّن مليون سوري من استخدام الذكاء الاصطناعي بثقة في العمل والدراسة والحياة اليومية.",
      en: "A national initiative enabling one million Syrians to use AI confidently at work, in study, and in everyday life.",
    },
    action: { ar: "استكشف المبادرة", en: "Explore the initiative" },
  },
  syria: {
    eyebrow: { ar: "إلى كل سورية", en: "Across Syria" },
    title: { ar: "ننمو معاً في كل سورية", en: "Growing together across Syria" },
    body: {
      ar: "من مجتمعاتنا تنمو المعرفة، ومع مبادرة المليون نحملها من دمشق إلى كل سورية.",
      en: "From our communities knowledge grows, and with the Million initiative we carry it from Damascus to all of Syria.",
    },
    action: { ar: "استكشف المبادرة", en: "Explore the initiative" },
  },
  cue: { ar: "مرّر للبدء", en: "Scroll to begin" },
} as const;

/* Abu Al-Joud's line for each beat, the same as the desktop guide's. */
const GUIDE = [
  {
    image: "/cinematic/images/abu-al-joud-comic-welcome.webp",
    ar: "أهلاً، أنا أبو الجود. سأرافقك في هذه الرحلة.",
    en: "Hello, I am Abu Al-Joud. I will guide you through this journey.",
    prefill: { ar: "عرّفني على الجمعية ورؤيتها", en: "Introduce me to SAAE and its vision" },
  },
  {
    image: "/cinematic/images/abu-al-joud-comic-curious.webp",
    ar: "هنا تبدأ جذور المعرفة والتخصص.",
    en: "The roots of knowledge and expertise begin here.",
    prefill: { ar: "ما هي مجتمعات الجمعية التسعة؟", en: "What are SAAE's nine communities?" },
  },
  {
    image: "/cinematic/images/abu-al-joud-comic-curious.webp",
    ar: "ومن هذه الجذور ينمو التعلّم.",
    en: "Learning grows from those roots.",
    prefill: {
      ar: "أخبرني عن منصة التعلّم ودورات الجمعية",
      en: "Tell me about SAAE's learning platform and courses",
    },
  },
  {
    image: "/cinematic/images/abu-al-joud-comic-celebrate.webp",
    ar: "الأثر يظهر في الأرقام والناس.",
    en: "Impact becomes visible through people and results.",
    prefill: { ar: "أخبرني أكثر عن إنجازات الجمعية", en: "Tell me more about SAAE's achievements" },
  },
  {
    image: "/cinematic/images/abu-al-joud-comic-vision.webp",
    ar: "وهنا تتحول الرؤية إلى خطوة وطنية.",
    en: "Here, the vision becomes a national step.",
    prefill: {
      ar: "اشرح لي مبادرة مليون مستخدم سوري للذكاء الاصطناعي",
      en: "Explain the Million Syrian AI Users initiative",
    },
  },
  {
    image: "/cinematic/images/abu-al-joud-comic-vision.webp",
    ar: "وتصل الرحلة من دمشق إلى كل سورية.",
    en: "The journey reaches from Damascus across Syria.",
    prefill: {
      ar: "كيف تصل برامج الجمعية إلى مختلف المحافظات السورية؟",
      en: "How do SAAE's programmes reach communities across Syria?",
    },
  },
] as const;

const GUIDE_LABEL = { ar: "تحدّث مع أبو الجود", en: "Talk to Abu Al-Joud" } as const;

const COMMUNITY_ICONS = [
  CodeXml,
  Database,
  Building2,
  HeartPulse,
  FlaskConical,
  TrendingUp,
  Presentation,
  Megaphone,
] as const;

const OPENING_LINES = {
  ar: ["ذكاء", "وريادة", "لوطن", "ينهض"],
  en: ["Intelligence", "and entrepreneurship", "for a nation", "on the rise."],
} as const;

/** Abu Al-Joud: a line for each beat, shown for a few seconds as the beat arrives. */
function HeroGuide({ lang, band }: { lang: Lang; band: number }) {
  const [shown, setShown] = useState(false);
  const [talking, setTalking] = useState(true);
  const beat = GUIDE[band] ?? GUIDE[0];

  useEffect(() => {
    const timer = window.setTimeout(() => setShown(true), 900);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    setTalking(true);
    const timer = window.setTimeout(() => setTalking(false), 5200);
    return () => window.clearTimeout(timer);
  }, [band, lang]);

  const open = () => {
    window.dispatchEvent(
      new CustomEvent("assistant:open", { detail: { prefill: beat.prefill[lang] } }),
    );
  };

  return (
    <button
      type="button"
      className={`mh-hero-guide${shown ? " mh-is-shown" : ""}${talking ? " mh-is-talking" : ""}`}
      onClick={open}
      aria-label={GUIDE_LABEL[lang]}
    >
      <span className="mh-hero-guide-bubble" key={`${lang}-${band}`} aria-live="polite">
        {beat[lang]}
      </span>
      <img
        className="mh-hero-guide-figure"
        src={beat.image}
        alt=""
        width={512}
        height={768}
        decoding="async"
      />
    </button>
  );
}

function CommunityCard({
  lang,
  index,
  onSelect,
}: {
  lang: Lang;
  index: number;
  onSelect: (index: number) => void;
}) {
  const community = COMMUNITIES[index];
  const Icon = COMMUNITY_ICONS[index % COMMUNITY_ICONS.length];
  const count = COMMUNITIES.length;
  const copy = COPY.communities;
  const rtl = lang === "ar";
  return (
    <>
      <div className="mh-tree-card" key={community.key}>
        <span className="mh-tree-card-icon">
          <Icon size={20} aria-hidden="true" />
        </span>
        <div className="mh-tree-card-text">
          <a className="mh-tree-card-name" href={community.href}>
            {community.name[lang]}
          </a>
          <p>{community.tagline[lang]}</p>
        </div>
        <div className="mh-tree-card-nav">
          <button
            type="button"
            aria-label={copy.previous[lang]}
            onClick={() => onSelect((index - 1 + count) % count)}
          >
            {rtl ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <span aria-live="polite">
            {index + 1} / {count}
          </span>
          <button
            type="button"
            aria-label={copy.next[lang]}
            onClick={() => onSelect((index + 1) % count)}
          >
            {rtl ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
      </div>
      <div className="mh-tree-pips" role="group" aria-label={copy.choose[lang]}>
        {COMMUNITIES.map((c, i) => (
          <button
            key={c.key}
            type="button"
            className={i === index ? "mh-is-current" : undefined}
            aria-label={c.name[lang]}
            aria-pressed={i === index}
            onClick={() => onSelect(i)}
          />
        ))}
      </div>
    </>
  );
}

export function MobileTreeHero({
  lang,
  sentinelRef,
}: {
  lang: Lang;
  sentinelRef: RefObject<HTMLDivElement | null>;
}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const bandRefs = useRef<Array<HTMLElement | null>>([]);
  const instanceRef = useRef<HeroInstance | null>(null);
  const { mode, band, openingReady } = useTreeJourney(sectionRef, bandRefs, instanceRef);

  const [community, setCommunity] = useState(0);
  const [browsed, setBrowsed] = useState(false);

  const selectCommunity = useCallback((index: number) => {
    setBrowsed(true);
    setCommunity(index);
  }, []);

  // The field draws the community the card shows.
  useEffect(() => {
    instanceRef.current?.setCommunity?.(community);
  }, [community, mode]);

  // Like the desktop card, it turns by itself until the reader takes over.
  useEffect(() => {
    if (band !== 1 || browsed || mode === "static") return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setCommunity((i) => (i + 1) % COMMUNITIES.length);
    }, COMMUNITY_FLIP_MS);
    return () => window.clearInterval(timer);
  }, [band, browsed, mode]);

  const pick = <T,>(text: Record<Lang, T>) => text[lang];
  const live = mode !== "static";
  const bandProps = (i: number) => ({
    ref: (el: HTMLElement | null) => {
      bandRefs.current[i] = el;
    },
    className: "mh-band",
    "data-band": i,
    "aria-hidden": live && band !== i ? true : undefined,
    inert: live && band !== i ? true : undefined,
  });

  const headline = pick(OPENING_HEADLINE);

  return (
    <section
      className={`mh-hero mh-tree-hero${openingReady ? " mh-opening-ready" : ""}`}
      id="hero-sec"
      aria-labelledby="mh-hero-title"
      data-hero-layout="centred"
      data-tree={mode}
      ref={sectionRef}
    >
      <div ref={sentinelRef} className="mh-hero-sentinel" aria-hidden="true" />
      <div className="mh-tree-stage">
        <canvas className="mh-tree-canvas" id="hero-canvas" aria-hidden="true" />
        <img
          className="mh-tree-still"
          src="/cinematic/images/initiative-tree.svg"
          alt=""
          aria-hidden="true"
          decoding="async"
        />
        <div className="mh-hero-scrim" aria-hidden="true" />

        <div className="mh-bands mh-wrap">
          <article {...bandProps(0)}>
            <div className="mh-band-opening">
              <p className="mh-eyebrow">{pick(OPENING.eyebrow)}</p>
              <h1 className="mh-title" id="mh-hero-title">
                <span className="mh-sr-only">{headline}</span>
                {/* The desktop opening's four lines (home.css .hero-opening-line):
                    ink ramp, photo fill, white, photo fill. */}
                <span aria-hidden="true" className="mh-open-title">
                  {OPENING_LINES[lang].map((line) => (
                    <span key={line} className="mh-open-line">
                      {line}
                    </span>
                  ))}
                </span>
              </h1>
            </div>
          </article>

          <article {...bandProps(1)}>
            <p className="mh-eyebrow">{pick(COPY.communities.eyebrow)}</p>
            <h2 className="mh-band-title">{pick(COPY.communities.title)}</h2>
            <CommunityCard lang={lang} index={community} onSelect={selectCommunity} />
            <MotionButton label={pick(COPY.communities.action)} href="/about#communities-h" />
          </article>

          <article {...bandProps(2)}>
            <p className="mh-eyebrow">{pick(COPY.learning.eyebrow)}</p>
            <h2 className="mh-band-title">{pick(COPY.learning.title)}</h2>
            <p className="mh-band-body">{pick(COPY.learning.body)}</p>
            <MotionButton label={pick(COPY.learning.action)} href={OPENING.primary.href} />
          </article>

          <article {...bandProps(3)}>
            <p className="mh-eyebrow">{pick(COPY.achievements.eyebrow)}</p>
            <h2 className="mh-band-title">{pick(COPY.achievements.title)}</h2>
            <dl className="mh-tree-stats">
              {ACHIEVEMENTS.map((s) => (
                <div key={s.value}>
                  <dt>{pick(s.label)}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
          </article>

          <article {...bandProps(4)}>
            <p className="mh-eyebrow">{pick(COPY.million.eyebrow)}</p>
            <h2 className="mh-band-title">{pick(COPY.million.title)}</h2>
            <p className="mh-band-body">{pick(COPY.million.body)}</p>
            <MotionButton label={pick(COPY.million.action)} href={OPENING.secondary.href} />
          </article>

          <article {...bandProps(5)}>
            <p className="mh-eyebrow">{pick(COPY.syria.eyebrow)}</p>
            <h2 className="mh-band-title">{pick(COPY.syria.title)}</h2>
            <p className="mh-band-body">{pick(COPY.syria.body)}</p>
            <MotionButton label={pick(COPY.syria.action)} href={OPENING.secondary.href} />
          </article>
        </div>

        <p className="mh-tree-cue" aria-hidden="true">
          <span>{pick(COPY.cue)}</span>
        </p>
        <HeroGuide lang={lang} band={band} />
      </div>
    </section>
  );
}
