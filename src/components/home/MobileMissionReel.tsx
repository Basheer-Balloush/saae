import { useEffect, useRef, type CSSProperties, type RefObject } from "react";
import { MISSION_COPY, MISSION_STEPS, type Locale } from "./mobile-home-content";

/* The desktop homepage's "how we work" reel (home.html .mission-reel, driven
   from home-inline.js) on the phone: a tall runway with a sticky stage. The
   giant word for each step rolls up through the top of the frame as the reader
   passes it, and the step's copy below hands off to the next one, with the
   rule beside it drawing how far through the step the reader is. Stacked on a
   phone: words above, copy below.

   It arrives the way the desktop's does (partner-handoff.js): the section
   before it pins at the bottom of the screen and slides out to the right while
   the reel's first frame slides in from the left, over a little more than a
   screen of scrolling. MobileHome wraps that section in .mh-handoff-out and
   follows it with the runway; the reel is pulled up over both (see
   mobile-home.css), so its stage is pinned for the whole hand-off. */

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

/* The hand-off's length, as a share of the screen height: the desktop's 1.1. */
const HANDOFF = 1.1;

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

export function MobileMissionReel({
  lang,
  outRef,
}: {
  lang: Locale;
  outRef?: RefObject<HTMLElement | null>;
}) {
  const reelRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const wordRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    const reel = reelRef.current;
    const stage = stageRef.current;
    if (!reel || !stage) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const steps = MISSION_STEPS.length;
    let frame = 0;

    /* The outgoing section pins with its bottom on the screen's bottom edge,
       the runway after it is the hand-off's length, and the reel is pulled up
       over both so its stage is pinned from the moment the section pins. All
       in pixels from the real screen height, so the three always agree. */
    const section = reel.parentElement;
    /* The screen height is the sticky stage's (100svh), not innerHeight: on
       iPhones innerHeight changes as Safari's toolbar hides and shows, and the
       runway would be resized mid-scroll each time, against a stage that
       stayed the same size. */
    const viewHeight = () => stage.offsetHeight || window.innerHeight;
    let pinned = "";
    const pinOut = () => {
      const out = outRef?.current;
      if (!out || !section || reduced) return;
      const view = viewHeight();
      const key = `${view}:${out.offsetHeight}`;
      if (key === pinned) return;
      pinned = key;
      const handoff = view * HANDOFF;
      out.style.top = `${Math.min(0, view - out.offsetHeight)}px`;
      const runway = out.nextElementSibling as HTMLElement | null;
      if (runway) runway.style.blockSize = `${handoff}px`;
      section.style.marginBlockStart = `${-(handoff + view)}px`;
      reel.style.blockSize = `${view * 3 + handoff}px`;
    };

    const paint = () => {
      frame = 0;
      const view = viewHeight();
      const rect = reel.getBoundingClientRect();
      const into = -rect.top;
      const handoff = reduced ? 0 : view * HANDOFF;

      // The hand-off: out to the right, in from the left, as on the desktop.
      const entry = handoff ? clamp(into / handoff, 0, 1) : 1;
      stage.style.transform =
        entry < 1 ? `translate3d(${((entry - 1) * 100).toFixed(2)}%, 0, 0)` : "";
      stage.style.visibility = entry > 0 ? "visible" : "hidden";
      const out = outRef?.current;
      if (out)
        out.style.transform = entry > 0 ? `translate3d(${(entry * 100).toFixed(2)}%, 0, 0)` : "";

      // The steps: the same arithmetic as the desktop reel in home-inline.js,
      // over the part of the runway that follows the hand-off.
      const progress = reduced
        ? 0
        : clamp((into - handoff) / Math.max(1, rect.height - view - handoff), 0, 1);
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
    const onResize = () => {
      pinOut();
      schedule();
    };

    pinOut();
    paint();
    // The news above changes height as its stories and images load.
    const sizes = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(onResize);
    if (outRef?.current) sizes?.observe(outRef.current);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      sizes?.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", onResize);
      const out = outRef?.current;
      if (out) {
        out.style.transform = "";
        out.style.top = "";
      }
      if (section) section.style.marginBlockStart = "";
      reel.style.blockSize = "";
    };
  }, [lang, outRef]);

  return (
    <section className="mh-mission" id="mission" aria-labelledby="mh-mission-title">
      <h2 className="mh-sr-only" id="mh-mission-title">
        {MISSION_COPY.title[lang]}
      </h2>
      <div className="mh-mission-reel" ref={reelRef}>
        {/* hn-root and the circuit traces: the desktop reel's ground (#061820). */}
        <div className="mh-mission-sticky hn-root" ref={stageRef}>
          <div className="hn-tech-details" aria-hidden="true">
            <span />
            <span />
          </div>
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
