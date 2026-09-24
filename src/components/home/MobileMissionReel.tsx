import { useEffect, useRef, type RefObject } from "react";
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

/* The hand-off's runway, as a share of the screen height. The slide itself
   is not scrubbed by the scroll as on the desktop: on an iPhone the page
   scrolls on its own thread and a transform written from scroll events lands
   a frame or more behind it, so a scrubbed slide stutters and jumps under a
   flick. Instead the slide plays as a timed CSS transition once the reader is
   ARRIVE of the way down the runway, and reverses if they scroll back. */
const HANDOFF = 0.7;
const ARRIVE = 0.25;

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
    let isArrived: boolean | null = null;
    let index = -1;
    let shown = -1;
    let placed = "";
    let shownLocal = -1;

    /* The outgoing section pins with its bottom on the screen's bottom edge,
       the runway after it is the hand-off's length, and the reel is pulled up
       over both so its stage is pinned from the moment the section pins. All
       in pixels from the real screen height, so the three always agree. */
    const section = reel.parentElement;
    /* The screen height, held steady. On a phone the browser's toolbar shows
       and hides as the reader scrolls and stops, and every change re-laid
       out this section under a finger that had stopped: the stage, the
       runway and so the step the scroll lands on all moved, and near a step
       change the copy flipped back and forth. So the stage is given a fixed
       height in pixels, measured once for the screen's width, and it only
       ever grows (to the toolbar-hidden height), never shrinks back. A new
       width (rotation) measures again. */
    let lockedWidth = 0;
    let lockedHeight = 0;
    const viewHeight = () => {
      const width = window.innerWidth;
      if (width !== lockedWidth) {
        lockedWidth = width;
        lockedHeight = 0;
        stage.style.blockSize = "";
      }
      // The stage's own 100svh before it is held, the visible height after.
      const natural = lockedHeight
        ? Math.max(560, window.innerHeight)
        : stage.offsetHeight || window.innerHeight;
      if (natural > lockedHeight + 1) {
        lockedHeight = natural;
        stage.style.blockSize = `${natural}px`;
      }
      return lockedHeight;
    };
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
      // A screen and a third per step: a flick should not skip one.
      reel.style.blockSize = `${view * 4 + handoff}px`;
    };

    const paint = () => {
      frame = 0;
      const view = viewHeight();
      const rect = reel.getBoundingClientRect();
      const into = -rect.top;
      // Before the reel, through it, after it (see .mh-is-pinned in the CSS).
      const place = rect.top > 0 ? "before" : rect.bottom < view ? "after" : "pinned";
      if (!reduced && place !== placed) {
        placed = place;
        stage.classList.toggle("mh-is-pinned", place === "pinned");
        stage.classList.toggle("mh-is-after", place === "after");
      }
      const handoff = reduced ? 0 : view * HANDOFF;

      // The hand-off: out to the right, in from the left, as on the desktop.
      // Only a class changes here; mobile-home.css runs the slide.
      const entry = handoff ? clamp(into / handoff, 0, 1) : 1;
      const arrived = entry >= ARRIVE;
      if (arrived !== isArrived) {
        isArrived = arrived;
        stage.classList.toggle("mh-is-arrived", arrived);
        outRef?.current?.classList.toggle("mh-is-left", arrived);
      }

      // The steps: the same arithmetic as the desktop reel in home-inline.js,
      // over the part of the runway that follows the hand-off.
      const progress = reduced
        ? 0
        : clamp((into - handoff) / Math.max(1, rect.height - view - handoff), 0, 1);
      const scaled = clamp(progress, 0, 0.9999) * steps;
      /* A step only changes once the scroll is clearly past its boundary, so
         a finger resting on the boundary cannot flip the copy back and forth. */
      const raw = Math.min(steps - 1, Math.floor(scaled));
      const margin = 0.04;
      if (index < 0 || Math.abs(raw - index) > 1) index = raw;
      else if (raw > index && scaled - raw > margin) index = raw;
      else if (raw < index && index - scaled > margin) index = raw;
      /* Nothing here moves with the scroll frame by frame. On an iPhone the
         page scrolls on its own thread and anything written from scroll
         events lands a frame or more behind it, so the giant word (resized
         and moved every frame, and redrawn from scratch each time because
         it is gradient-filled type) lagged and jittered against the pinned
         stage. Each step now switches as a whole and CSS transitions carry
         the word and the copy, which the phone runs by itself. */
      if (index !== shown) {
        shown = index;
        wordRefs.current.forEach((word, i) => {
          if (!word) return;
          word.classList.toggle("is-current", reduced ? i === 0 : i === index);
          word.classList.toggle("is-past", !reduced && i < index);
        });
        itemRefs.current.forEach((item, i) => {
          if (!item) return;
          item.classList.toggle("is-current", reduced || i === index);
          item.classList.toggle("is-past", !reduced && i < index);
        });
      }
      // The rule beside the copy: how far through the step. A stretch, not a
      // height, so it costs no layout; and only written when it has moved.
      const local = Math.round(clamp(scaled - index, 0, 1) * 200) / 200;
      if (local !== shownLocal) {
        shownLocal = local;
        itemRefs.current[index]?.style.setProperty("--mission-local", String(local));
      }
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
        out.classList.remove("mh-is-left");
        out.style.top = "";
      }
      stage.classList.remove("mh-is-arrived", "mh-is-pinned", "mh-is-after");
      stage.style.blockSize = "";
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
                data-caption={CAPTIONS[lang][i]}
                className={i === 0 ? "is-current" : undefined}
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
