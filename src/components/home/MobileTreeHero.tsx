import { useEffect, useRef, useState, type RefObject } from "react";

/* The phone hero runs the desktop's pixel tree (public/cinematic/js/hero-instrument.js)
   in its centred, portrait layout. The section is a tall scroll runway with a
   sticky stage: the tree forms, the camera travels down the trunk to the roots,
   and only when the roots arrive does the headline come in. */

export type TreeMode = "loading" | "live" | "static";

type HeroInstance = {
  render: (progress: number) => void;
  resize: () => void;
  dispose: () => void;
  startEntrance: () => void;
  setCalm?: (y: number, w: number) => void;
};

/* Scene progress that the phone plays: the opening tree through to the roots.
   The desktop journey continues from here into the communities; the phone stops. */
const SCENE_END = 0.14;
/* Share of the runway that drives the camera; the rest holds the roots and headline. */
const TRAVEL_END = 0.58;
/* Where the headline arrives: as the roots settle into frame. */
const REVEAL_AT = 0.42;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

let mountCount = 0;

function supportsWebGl2(): boolean {
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}

export function useMobileTreeHero(sectionRef: RefObject<HTMLElement | null>) {
  const [mode, setMode] = useState<TreeMode>("loading");
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !supportsWebGl2()) {
      setMode("static");
      setRevealed(true);
      return;
    }

    let instance: HeroInstance | null = null;
    let frame = 0;
    let eased = 0;
    let target = 0;
    let lastTime = performance.now();
    let revealedNow = false;
    let disposed = false;

    const readProgress = () => {
      const rect = section.getBoundingClientRect();
      return clamp01(-rect.top / Math.max(1, rect.height - window.innerHeight));
    };

    const applyReveal = (next: boolean) => {
      if (next === revealedNow) return;
      revealedNow = next;
      setRevealed(next);
    };

    const tick = (now: number) => {
      frame = 0;
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      target = readProgress();
      eased += (target - eased) * Math.min(1, dt * 7);
      if (Math.abs(target - eased) < 0.0005) eased = target;
      section.style.setProperty("--mh-tree-t", eased.toFixed(4));
      applyReveal(target >= REVEAL_AT);
      if (instance) {
        instance.render(clamp01(eased / TRAVEL_END) * SCENE_END);
        instance.setCalm?.(0.5, clamp01((eased - REVEAL_AT + 0.08) / 0.12) * 0.55);
      }
      if (eased !== target) frame = requestAnimationFrame(tick);
    };

    const schedule = () => {
      if (frame || disposed) return;
      lastTime = performance.now();
      frame = requestAnimationFrame(tick);
    };

    let fellBack = false;
    const onReady = (event: Event) => {
      const arrived = (event as CustomEvent<HeroInstance>).detail;
      // Too late: the page already settled on the drawn tree, so don't jump it.
      if (disposed || fellBack) {
        arrived.dispose();
        return;
      }
      instance = arrived;
      instance.resize();
      instance.startEntrance();
      setMode("live");
      schedule();
    };

    const onResize = () => {
      instance?.resize();
      schedule();
    };

    section.addEventListener("saae:hero-ready", onReady);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    schedule();

    /* A fresh URL per mount, so returning to the homepage boots a new scene on
       the new canvas; three.js and the other imports stay cached. */
    const script = document.createElement("script");
    script.type = "module";
    script.src = `/cinematic/js/hero-instrument.js?phone=${++mountCount}`;
    script.dataset.mobileTree = "";
    document.head.appendChild(script);

    /* No scene within a few seconds (failed download, lost context): fall back
       to the drawn tree with the headline shown. */
    const fallback = window.setTimeout(() => {
      if (!instance && !disposed) {
        fellBack = true;
        setMode("static");
        applyReveal(true);
      }
    }, 9000);

    return () => {
      disposed = true;
      window.clearTimeout(fallback);
      if (frame) cancelAnimationFrame(frame);
      section.removeEventListener("saae:hero-ready", onReady);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", onResize);
      instance?.dispose();
      script.remove();
    };
  }, [sectionRef]);

  // Static mode keeps the headline up whatever the scroll position.
  return { mode, revealed: revealed || mode === "static" };
}

type Lang = "ar" | "en";

const GUIDE = {
  intro: {
    image: "/cinematic/images/abu-al-joud-comic-welcome.webp",
    ar: "أهلاً، أنا أبو الجود 👋 مرّر للأسفل لنبدأ الرحلة من الجذور.",
    en: "Hi, I'm Abu Al-Joud 👋 Scroll down and let's start from the roots.",
  },
  headline: {
    image: "/cinematic/images/abu-al-joud-comic-vision.webp",
    ar: "من هذه الجذور تنمو رؤيتنا. اضغط عليّ لأخبرك المزيد.",
    en: "Our vision grows from these roots. Tap me to hear more.",
  },
} as const;

const GUIDE_LABEL = { ar: "تحدّث مع أبو الجود", en: "Talk to Abu Al-Joud" } as const;
const GUIDE_PREFILL = {
  ar: "عرّفني على الجمعية ورؤيتها",
  en: "Introduce me to SAAE and its vision",
} as const;

/** Abu Al-Joud on the phone hero: greets while the tree forms, then points at the headline. */
export function MobileHeroGuide({ lang, revealed }: { lang: Lang; revealed: boolean }) {
  const [shown, setShown] = useState(false);
  const shownOnce = useRef(false);

  // He greets straight away, whether or not the scene has finished loading.
  useEffect(() => {
    if (shownOnce.current) return;
    const timer = window.setTimeout(() => {
      shownOnce.current = true;
      setShown(true);
    }, 900);
    return () => window.clearTimeout(timer);
  }, []);

  const stage = revealed ? GUIDE.headline : GUIDE.intro;

  const open = () => {
    window.dispatchEvent(
      new CustomEvent("assistant:open", { detail: { prefill: GUIDE_PREFILL[lang] } }),
    );
  };

  return (
    <button
      type="button"
      className={shown ? "mh-hero-guide mh-is-shown" : "mh-hero-guide"}
      onClick={open}
      aria-label={GUIDE_LABEL[lang]}
      data-stage={revealed ? "headline" : "intro"}
    >
      <span className="mh-hero-guide-bubble" key={`${lang}-${revealed}`} aria-live="polite">
        {stage[lang]}
      </span>
      <img
        className="mh-hero-guide-figure"
        src={stage.image}
        alt=""
        width={512}
        height={768}
        decoding="async"
      />
    </button>
  );
}
