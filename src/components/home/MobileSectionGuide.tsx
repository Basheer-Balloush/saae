import { useEffect, useState } from "react";
import { SECTION_COMIC_IMAGES, SECTION_COPY, type Locale } from "./section-guide-copy";

/* Abu Al-Joud below the hero on the phone, as the desktop's floating guide
   (DesktopSectionGuide) does: the same pose and words for news, partners, how
   we work and the FAQ. He stands in the bottom corner while one of those
   sections is on screen; as each section arrives his card says its piece for a
   few seconds, then folds away so it does not sit on the content. Tapping him
   opens the chat on that section's question. The hero has its own guide. */

type Section = keyof typeof SECTION_COPY;
const ORDER: Section[] = ["news", "partners", "mission", "faq"];
const TALK_MS = 6000;

function useActiveSection(): Section | null {
  const [active, setActive] = useState<Section | null>(null);

  useEffect(() => {
    let frame = 0;
    const sync = () => {
      frame = 0;
      const line = window.innerHeight * 0.52;
      let next: Section | null = null;
      for (const id of ORDER) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top > line || rect.bottom < line) continue;
        // The reel slides in over the pinned partners; it takes over as it
        // arrives (MobileMissionReel's ARRIVE of its HANDOFF, about 0.18).
        if (id === "mission" && -rect.top < window.innerHeight * 0.2) continue;
        next = id;
      }
      // Nothing to say over the footer or the hero.
      setActive((current) => (current === next ? current : next));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(sync);
    };
    sync();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return active;
}

export function MobileSectionGuide({ lang }: { lang: Locale }) {
  const active = useActiveSection();
  const [shown, setShown] = useState<Section | null>(null);
  const [talking, setTalking] = useState(false);

  // Keep the last section's words while he steps away, so the card does not
  // blank out mid-exit.
  useEffect(() => {
    if (active) setShown(active);
  }, [active]);

  useEffect(() => {
    if (!active) {
      setTalking(false);
      return;
    }
    setTalking(true);
    const timer = window.setTimeout(() => setTalking(false), TALK_MS);
    return () => window.clearTimeout(timer);
  }, [active, lang]);

  const section = shown ?? "news";
  const copy = SECTION_COPY[section][lang];

  const open = () => {
    window.dispatchEvent(new CustomEvent("assistant:open", { detail: { prefill: copy.prefill } }));
  };

  return (
    <aside
      className={`mh-section-guide${active ? " mh-is-shown" : ""}${talking ? " mh-is-talking" : ""}`}
      dir={lang === "ar" ? "rtl" : "ltr"}
      aria-label={lang === "ar" ? "دليل أبو الجود للصفحة" : "Abu Al-Joud's page guide"}
      aria-hidden={active ? undefined : true}
    >
      <div className="mh-section-guide-card" key={`${section}-${lang}`} aria-live="polite">
        <p className="mh-section-guide-greeting">{copy.greeting}</p>
        <p className="mh-section-guide-title">{copy.title}</p>
        <p className="mh-section-guide-body">{copy.body}</p>
      </div>
      <button
        type="button"
        className="mh-section-guide-figure"
        onClick={open}
        aria-label={copy.label}
        title={copy.label}
        tabIndex={active ? undefined : -1}
      >
        <img src={SECTION_COMIC_IMAGES[section]} alt="" width={512} height={768} decoding="async" />
      </button>
    </aside>
  );
}
