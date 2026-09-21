import { useEffect, useRef, type CSSProperties } from "react";
import { MISSION_COPY, MISSION_STEPS, type Locale } from "./mobile-home-content";

/* The desktop homepage's "how we work" reel (home.html .mission-reel, driven
   from home-inline.js) on the phone: a tall runway with a sticky stage. The
   giant word for each step rolls up through the top of the frame as the reader
   passes it, and the step's copy below hands off to the next one, with the
   rule beside it drawing how far through the step the reader is. Stacked on a
   phone: words above, copy below. */

const WORDS = {
  en: ["TRAIN", "APPLY", "BUILD"],
  ar: ["درّب", "طبّق", "ابنِ"],
} as const;

const CAPTIONS = {
  en: [
    "Learn it. Teach it. Pass it on.",
    "Test it. Measure it. Make it useful.",
    "Launch it. Grow it. Make it last.",
  ],
  ar: [
    "تعلّمه. علّمه. وانقل أثره.",
    "اختبره. قِس أثره. واجعله نافعاً.",
    "أطلقه. نمّه. واجعله يدوم.",
  ],
} as const;

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

export function MobileMissionReel({ lang }: { lang: Locale }) {
  const reelRef = useRef<HTMLDivElement | null>(null);
  const wordRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    const reel = reelRef.current;
    if (!reel) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const steps = MISSION_STEPS.length;
    let frame = 0;

    // The same arithmetic as the desktop reel in home-inline.js.
    const paint = () => {
      frame = 0;
      const rect = reel.getBoundingClientRect();
      const progress = reduced
        ? 0
        : clamp(-rect.top / Math.max(1, rect.height - window.innerHeight), 0, 1);
      const scaled = clamp(progress, 0, 0.9999) * steps;
      const index = Math.min(steps - 1, Math.floor(scaled));
      const wordPos = clamp(scaled, 0.5, steps - 0.5);
      wordRefs.current.forEach((word, i) => {
        if (!word) return;
        const offset = i + 0.5 - wordPos;
        const strength = reduced
          ? i === 0
            ? 1
            : 0
          : clamp((0.78 - Math.abs(offset)) / 0.56, 0, 1);
        word.style.setProperty("--word-t", strength.toFixed(3));
        word.style.setProperty("--word-y", (clamp(offset, -1, 1) * 150).toFixed(1));
      });
      itemRefs.current.forEach((item, i) => {
        if (!item) return;
        item.classList.toggle("is-current", reduced || i === index);
        item.classList.toggle("is-past", !reduced && i < index);
        if (i === index) item.style.setProperty("--mission-local", (scaled - index).toFixed(4));
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    paint();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [lang]);

  return (
    <section className="mh-mission" id="mission" aria-labelledby="mh-mission-title">
      <h2 className="mh-sr-only" id="mh-mission-title">
        {MISSION_COPY.title[lang]}
      </h2>
      <div className="mh-mission-reel" ref={reelRef}>
        <div className="mh-mission-sticky">
          <div className="mh-mission-words" aria-hidden="true">
            {WORDS[lang].map((word, i) => (
              <span
                key={word}
                ref={(el) => {
                  wordRefs.current[i] = el;
                }}
                data-step={String(i + 1).padStart(2, "0")}
                data-caption={CAPTIONS[lang][i]}
                style={{ "--word-t": i === 0 ? 1 : 0 } as CSSProperties}
              >
                {word}
              </span>
            ))}
          </div>
          <div className="mh-mission-grid">
            {MISSION_STEPS.map((step, i) => (
              <article
                key={step.index.en}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                className={i === 0 ? "mh-mission-item is-current" : "mh-mission-item"}
              >
                <span className="mh-mission-index">{step.index[lang]}</span>
                <h3>{step.title[lang]}</h3>
                <p>{step.body[lang]}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
