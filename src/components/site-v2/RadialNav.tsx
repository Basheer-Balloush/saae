import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";

import { useLang } from "@/lib/i18n";
import { V2Link } from "./V2Link";

type NavItem = {
  to: string;
  labelEn: string;
  labelAr: string;
  icon: ReactNode;
};

/** Arc geometry from the prototype: six items on a half-orbit. */
const OFFSETS: { x: number; y: number }[] = [
  { x: 1, y: 0 },
  { x: 0.5, y: 1 },
  { x: -0.5, y: 1 },
  { x: -1, y: 0 },
  { x: -0.5, y: -1 },
  { x: 0.5, y: -1 },
];

const ITEMS: NavItem[] = [
  {
    to: "/",
    labelEn: "Home",
    labelAr: "الرئيسية",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
        <path d="M9 21v-7h6v7" />
      </svg>
    ),
  },
  {
    to: "/news",
    labelEn: "News",
    labelAr: "الأخبار",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 5h16v15H4z" />
        <path d="M7 8h6M7 11h10M7 14h10M7 17h7" />
      </svg>
    ),
  },
  {
    to: "/about",
    labelEn: "About",
    labelAr: "عن الجمعية",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="m15 9-2 4-4 2 2-4Z" />
      </svg>
    ),
  },
  {
    to: "/partners",
    labelEn: "Partners",
    labelAr: "الشركاء",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m8 12 3-3a2.8 2.8 0 0 1 4 0l1 1" />
        <path d="m4 13 3-3 5 5-3 3a2 2 0 0 1-3 0l-2-2a2 2 0 0 1 0-3Z" />
        <path d="m20 11-3-3-5 5 3 3a2 2 0 0 0 3 0l2-2a2 2 0 0 0 0-3Z" />
      </svg>
    ),
  },
  {
    to: "/one-million-initiative-home",
    labelEn: "Initiative",
    labelAr: "المبادرة",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z" />
        <path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8Z" />
      </svg>
    ),
  },
  {
    to: "/contact",
    labelEn: "Contact",
    labelAr: "تواصل معنا",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3h3l2 5-2 1.5a15 15 0 0 0 4.5 4.5L16 12l5 2v3c0 1.1-.9 2-2 2C10.2 19 5 13.8 5 5a2 2 0 0 1 2-2Z" />
      </svg>
    ),
  },
];

export function RadialNav() {
  const { lang, dir, t, toggle } = useLang();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  const isRtl = dir === "rtl";
  const v2 = t.v2;

  // Close the orbit whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Escape to close, focus trap while open, and body scroll lock.
  useEffect(() => {
    if (!open) return;
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const container = navRef.current;
      if (!container) return;
      const focusables = container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      root.style.overflow = previousOverflow;
    };
  }, [open]);

  const radiusX = isRtl ? -1 : 1;

  return (
    <>
      <button
        type="button"
        className="v2-radial-language"
        onClick={toggle}
        aria-label={lang === "en" ? "التبديل إلى العربية" : "Switch to English"}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3Z" />
        </svg>
        <span className="v2-language-label">{lang === "en" ? "العربية" : "English"}</span>
      </button>

      <nav
        ref={navRef}
        className={`v2-radial-nav${open ? " is-open" : ""}`}
        aria-label={v2.nav.ariaLabel}
      >
        <div className="v2-radial-items" aria-hidden={!open} inert={!open}>
          {ITEMS.map((item, index) => {
            const offset = OFFSETS[index]!;
            const current =
              item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
            return (
              <V2Link
                key={item.to}
                to={item.to}
                className="v2-radial-item"
                aria-current={current ? "page" : undefined}
                tabIndex={open ? 0 : -1}
                onClick={() => setOpen(false)}
                style={
                  {
                    "--v2-x": `calc(var(--v2-orbit-radius) * ${offset.x * radiusX})`,
                    "--v2-y": `calc(var(--v2-orbit-radius-y) * ${offset.y})`,
                    "--v2-delay": `${index * 35}ms`,
                  } as React.CSSProperties
                }
              >
                {item.icon}
                <span className="v2-radial-label">
                  {lang === "ar" ? item.labelAr : item.labelEn}
                </span>
              </V2Link>
            );
          })}
        </div>

        <button
          ref={toggleRef}
          type="button"
          className="v2-radial-toggle"
          aria-expanded={open}
          aria-label={open ? v2.nav.close : v2.nav.open}
          onClick={() => setOpen((value) => !value)}
        >
          <img className="v2-radial-tree" src="/saae/logo-tree-transparent.png" alt="" />
          <span className="v2-sr-only">{open ? v2.nav.close : v2.nav.open}</span>
        </button>
      </nav>
    </>
  );
}

export default RadialNav;
