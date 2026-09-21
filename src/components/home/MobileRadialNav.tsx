import { useEffect, useRef, useState, type CSSProperties } from "react";

/* The desktop homepage's navigation on the phone homepage: the tree button
   that opens the radial menu, and the language pill beside it. Same markup and
   classes as src/components/cinematic/radial-nav.ts, so navigation.css (which
   the homepage route already loads) styles both identically; the behaviour of
   public/cinematic/js/navigation.js is ported here. Language comes in as props,
   like the rest of MobileHomeView, so the pill drives the app's language. */

type Item = { href: string; en: string; ar: string; icon: string };

const ITEMS: Item[] = [
  {
    href: "#hero-sec",
    en: "Home",
    ar: "الرئيسية",
    icon: `<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 21v-7h6v7"/>`,
  },
  {
    href: "/news",
    en: "News",
    ar: "الأخبار",
    icon: `<path d="M4 5h16v15H4z"/><path d="M7 8h6M7 11h10M7 14h10M7 17h7"/>`,
  },
  {
    href: "/about",
    en: "About",
    ar: "عن الجمعية",
    icon: `<circle cx="12" cy="12" r="8"/><path d="m15 9-2 4-4 2 2-4Z"/>`,
  },
  {
    href: "/partners",
    en: "Partners",
    ar: "الشركاء",
    icon: `<path d="m8 12 3-3a2.8 2.8 0 0 1 4 0l1 1"/><path d="m4 13 3-3 5 5-3 3a2 2 0 0 1-3 0l-2-2a2 2 0 0 1 0-3Z"/><path d="m20 11-3-3-5 5 3 3a2 2 0 0 0 3 0l2-2a2 2 0 0 0 0-3Z"/>`,
  },
  {
    href: "/initiative",
    en: "Initiative",
    ar: "المبادرة",
    icon: `<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z"/><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8Z"/>`,
  },
  {
    href: "/learning-management-system",
    en: "LMS",
    ar: "منصة التعلّم",
    icon: `<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>`,
  },
  {
    href: "/contact",
    en: "Contact",
    ar: "تواصل معنا",
    icon: `<path d="M7 3h3l2 5-2 1.5a15 15 0 0 0 4.5 4.5L16 12l5 2v3c0 1.1-.9 2-2 2C10.2 19 5 13.8 5 5a2 2 0 0 1 2-2Z"/>`,
  },
];

export function MobileRadialNav({
  lang,
  onToggleLang,
}: {
  lang: "ar" | "en";
  onToggleLang: () => void;
}) {
  const isArabic = lang === "ar";
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  // The page behind stops scrolling while the menu is open, as on desktop.
  useEffect(() => {
    document.documentElement.classList.toggle("radial-nav-open", open);
    return () => document.documentElement.classList.remove("radial-nav-open");
  }, [open]);

  // Outside tap and Escape close it; the first item takes focus as it opens.
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus({ preventScroll: true });
    };
    const focus = window.setTimeout(() => itemRefs.current[0]?.focus({ preventScroll: true }), 90);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focus);
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // The items orbit slowly while the menu is open, like the desktop one.
  useEffect(() => {
    if (!open) {
      itemRefs.current.forEach((item) => item && (item.style.transform = ""));
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const orbit = (time: number) => {
      const radius = window.matchMedia("(max-width: 680px), (max-height: 620px)").matches
        ? 112
        : 140;
      const offset = time * 0.00012;
      const count = itemRefs.current.length;
      itemRefs.current.forEach((item, index) => {
        if (!item) return;
        const angle = (index / count) * Math.PI * 2 + offset;
        item.style.transform = `translate(-50%, -50%) translate(${radius * Math.cos(angle)}px, ${radius * Math.sin(angle)}px)`;
      });
      frame = requestAnimationFrame(orbit);
    };
    frame = requestAnimationFrame(orbit);
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const openLabel = isArabic ? "فتح التنقل" : "Open navigation";
  const closeLabel = isArabic ? "إغلاق التنقل" : "Close navigation";

  return (
    <>
      <button
        className="language-switch radial-language"
        id="language-switch"
        type="button"
        onClick={onToggleLang}
        aria-label={isArabic ? "Switch to English" : "التبديل إلى العربية"}
        aria-pressed={isArabic}
      >
        <svg className="language-switch-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3Z" />
        </svg>
        <span className="language-switch-label">{isArabic ? "English" : "العربية"}</span>
      </button>

      <nav
        ref={navRef}
        className={open ? "radial-nav is-open" : "radial-nav"}
        aria-label={isArabic ? "التنقل الرئيسي" : "Main navigation"}
      >
        <div className="radial-nav-items" aria-hidden={!open} inert={!open}>
          {ITEMS.map((item, index) => {
            const angle = 180 + index * 18;
            return (
              <a
                key={item.en}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                className="radial-nav-item"
                href={item.href}
                aria-current={item.href === "#hero-sec" ? "page" : undefined}
                onClick={() => setOpen(false)}
                style={
                  {
                    "--angle": `${angle}deg`,
                    "--counter-angle": `-${angle}deg`,
                    "--delay": `${index * 35}ms`,
                  } as CSSProperties
                }
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  dangerouslySetInnerHTML={{ __html: item.icon }}
                />
                <span className="radial-nav-label">{isArabic ? item.ar : item.en}</span>
              </a>
            );
          })}
        </div>
        <button
          ref={toggleRef}
          className="radial-nav-toggle"
          type="button"
          aria-expanded={open}
          aria-label={open ? closeLabel : openLabel}
          onClick={() => setOpen((v) => !v)}
        >
          <img
            className="radial-nav-tree"
            src="/cinematic/images/logo-tree-transparent.png"
            alt=""
          />
          <span className="sr-only">{open ? closeLabel : openLabel}</span>
        </button>
        <button
          className="radial-close"
          type="button"
          aria-label={closeLabel}
          onClick={() => {
            setOpen(false);
            toggleRef.current?.focus({ preventScroll: true });
          }}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path
              d="M5 5l10 10M15 5L5 15"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span className="sr-only">{closeLabel}</span>
        </button>
      </nav>
    </>
  );
}
