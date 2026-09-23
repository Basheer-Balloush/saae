import type { CSSProperties, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";

type Item = {
  to: string;
  hash?: string;
  en: string;
  ar: string;
  angle: number;
  icon: ReactNode;
};


const items: Item[] = [
  {
    to: "/",
    hash: "hero-sec",
    en: "Home",
    ar: "الرئيسية",
    angle: 180,
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
        <path d="M9 21v-7h6v7" />
      </svg>
    ),
  },
  {
    to: "/news",
    en: "News",
    ar: "الأخبار",
    angle: 198,
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 5h16v15H4z" />
        <path d="M7 8h6M7 11h10M7 14h10M7 17h7" />
      </svg>
    ),
  },
  {
    to: "/about",
    en: "About",
    ar: "عن الجمعية",
    angle: 216,
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="m15 9-2 4-4 2 2-4Z" />
      </svg>
    ),
  },
  {
    to: "/partners",
    en: "Partners",
    ar: "الشركاء",
    angle: 234,
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m8 12 3-3a2.8 2.8 0 0 1 4 0l1 1" />
        <path d="m4 13 3-3 5 5-3 3a2 2 0 0 1-3 0l-2-2a2 2 0 0 1 0-3Z" />
        <path d="m20 11-3-3-5 5 3 3a2 2 0 0 0 3 0l2-2a2 2 0 0 0 0-3Z" />
      </svg>
    ),
  },
  {
    to: "/initiative",
    en: "Initiative",
    ar: "المبادرة",
    angle: 252,
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z" />
        <path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8Z" />
      </svg>
    ),
  },
  {
    to: "/contact",
    en: "Contact",
    ar: "تواصل معنا",
    angle: 270,
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3h3l2 5-2 1.5a15 15 0 0 0 4.5 4.5L16 12l5 2v3c0 1.1-.9 2-2 2C10.2 19 5 13.8 5 5a2 2 0 0 1 2-2Z" />
      </svg>
    ),
  },
];

export function RadialNav() {
  const { lang, toggle } = useLang();
  const isArabic = lang === "ar";

  return (
    <>
      <button
        className="language-switch radial-language"
        id="language-switch"
        type="button"
        onClick={toggle}
        aria-label={isArabic ? "Switch to English" : "التبديل إلى العربية"}
        aria-pressed={isArabic}
      >
        <svg className="language-switch-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3Z" />
        </svg>
        <span className="language-switch-label">{isArabic ? "English" : "العربية"}</span>
      </button>

      <nav className="radial-nav" data-radial-nav aria-label={isArabic ? "التنقل الرئيسي" : "Main navigation"}>
        <div className="radial-nav-items" data-radial-items aria-hidden="true" inert>
          {items.map((item, index) => (
            <Link
              key={item.en}
              to={item.to}
              hash={item.hash}
              className="radial-nav-item"
              style={
                {
                  "--angle": `${item.angle}deg`,
                  "--counter-angle": `-${item.angle}deg`,
                  "--delay": `${index * 35}ms`,
                } as CSSProperties
              }
            >
              {item.icon}
              <span className="radial-nav-label" data-nav-en={item.en} data-nav-ar={item.ar}>
                {isArabic ? item.ar : item.en}
              </span>
            </Link>
          ))}
        </div>
        <button
          className="radial-nav-toggle"
          type="button"
          data-radial-toggle
          aria-expanded="false"
          aria-label={isArabic ? "فتح التنقل" : "Open navigation"}
        >
          <img className="radial-nav-tree" src="/site/images/logo-tree-transparent.png" alt="" />
          <span className="sr-only">{isArabic ? "فتح التنقل" : "Open navigation"}</span>
        </button>
        <button
          className="radial-close"
          type="button"
          data-radial-close
          aria-label={isArabic ? "إغلاق التنقل" : "Close navigation"}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="sr-only">{isArabic ? "إغلاق التنقل" : "Close navigation"}</span>
        </button>
      </nav>
    </>
  );
}
