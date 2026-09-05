import { useEffect, useRef, useState } from "react";

import { useLang } from "@/lib/i18n";
import { V2Link } from "./V2Link";

export type RibbonSection = {
  /** DOM id of the section on the page. */
  id: string;
  /** Already-localised label. */
  label: string;
};

const PAGES: { to: string; en: string; ar: string }[] = [
  { to: "/about", en: "About", ar: "عن الجمعية" },
  { to: "/partners", en: "Partners", ar: "الشركاء" },
  { to: "/one-million-initiative-home", en: "Initiative", ar: "المبادرة" },
  { to: "/contact", en: "Contact", ar: "تواصل معنا" },
];

export function JourneyRibbon({ sections }: { sections: RibbonSection[] }) {
  const { lang, t } = useLang();
  const v2 = t.v2;
  const [open, setOpen] = useState(false);
  const [minimised, setMinimised] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLElement | null>(null);

  // Track which chapter is on screen.
  useEffect(() => {
    if (typeof window === "undefined" || sections.length === 0) return;
    const elements = sections
      .map((section, index) => {
        const el = document.getElementById(section.id);
        return el ? { el, index } : null;
      })
      .filter((entry): entry is { el: HTMLElement; index: number } => entry !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const match = elements.find((entry) => entry.el === visible.target);
        if (match) setActiveIndex(match.index);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] },
    );

    elements.forEach((entry) => observer.observe(entry.el));
    return () => observer.disconnect();
  }, [sections]);

  // Minimise while the visitor keeps scrolling.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      setMinimised(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setMinimised(false), 700);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Escape closes the panel.
  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (sections.length === 0) return null;

  const total = String(sections.length).padStart(2, "0");
  const current = String(activeIndex + 1).padStart(2, "0");

  return (
    <aside
      ref={rootRef}
      className={`v2-ribbon${open ? " is-open" : ""}${minimised && !open ? " is-minimised" : ""}`}
      aria-label={v2.ribbon.ariaLabel}
    >
      <div className="v2-ribbon-panel" id="v2-ribbon-panel" aria-hidden={!open} inert={!open}>
        <nav className="v2-ribbon-nav" aria-label={v2.ribbon.sectionsLabel}>
          {sections.map((section, index) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              tabIndex={open ? 0 : -1}
              onClick={() => setOpen(false)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {section.label}
            </a>
          ))}
        </nav>

        <nav className="v2-ribbon-pages" aria-label={v2.ribbon.pagesLabel}>
          {PAGES.map((page) => (
            <V2Link key={page.to} to={page.to} tabIndex={open ? 0 : -1}>
              {lang === "ar" ? page.ar : page.en}
            </V2Link>
          ))}
        </nav>
      </div>

      <button
        type="button"
        className="v2-ribbon-toggle"
        aria-controls="v2-ribbon-panel"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="v2-ribbon-rosette" aria-hidden="true">
          <svg viewBox="0 0 100 100">
            <path
              d="M50 5 61 31 85 15 69 39 95 50 69 61 85 85 61 69 50 95 39 69 15 85 31 61 5 50 31 39 15 15 39 31Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
            <circle cx="50" cy="50" r="10" fill="none" stroke="currentColor" strokeWidth="3" />
          </svg>
        </span>
        <span className="v2-ribbon-position">
          <span>{sections[activeIndex]?.label ?? v2.ribbon.opening}</span>
          <small>
            {current} / {total}
          </small>
        </span>
        <span className="v2-ribbon-action" aria-hidden="true">
          {v2.ribbon.explore}
        </span>
      </button>
    </aside>
  );
}

export default JourneyRibbon;
