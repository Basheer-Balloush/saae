/* The language switch and radial menu shared by every cinematic page. A page
   marks where they go with <!-- cinematic:language --> and
   <!-- cinematic:nav -->, and CinematicPage fills both, so the menu is
   written once. language.js finds the switch by #language-switch and
   navigation.js finds the menu by its data-radial-* hooks: keep those. */

const LANGUAGE_BUTTON = `<button class="language-switch radial-language" id="language-switch" type="button" aria-label="التبديل إلى العربية" aria-pressed="false">
  <svg class="language-switch-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3Z"></path></svg>
  <span class="language-switch-label">العربية</span>
</button>`;

type NavItem = { href: string; en: string; ar: string; icon: string };

const ITEMS: NavItem[] = [
  { href: "/", en: "Home", ar: "الرئيسية", icon: `<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 21v-7h6v7"/>` },
  { href: "/news", en: "News", ar: "الأخبار", icon: `<path d="M4 5h16v15H4z"/><path d="M7 8h6M7 11h10M7 14h10M7 17h7"/>` },
  { href: "/about", en: "About", ar: "عن الجمعية", icon: `<circle cx="12" cy="12" r="8"/><path d="m15 9-2 4-4 2 2-4Z"/>` },
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
    href: "/contact",
    en: "Contact",
    ar: "تواصل معنا",
    icon: `<path d="M7 3h3l2 5-2 1.5a15 15 0 0 0 4.5 4.5L16 12l5 2v3c0 1.1-.9 2-2 2C10.2 19 5 13.8 5 5a2 2 0 0 1 2-2Z"/>`,
  },
];

const isCurrent = (href: string, pathname: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

export function radialNavHtml(pathname: string): string {
  const items = ITEMS.map((item, i) => {
    const current = isCurrent(item.href, pathname);
    /* Home opens on the hero; on the homepage itself that is an in-page jump. */
    const href = item.href === "/" ? (current ? "#hero-sec" : "/#hero-sec") : item.href;
    const angle = 180 + i * 18;
    return `<a class="radial-nav-item" href="${href}"${current ? ' aria-current="page"' : ""} style="--angle:${angle}deg;--counter-angle:-${angle}deg;--delay:${i * 35}ms"><svg viewBox="0 0 24 24" aria-hidden="true">${item.icon}</svg><span class="radial-nav-label" data-nav-en="${item.en}" data-nav-ar="${item.ar}">${item.en}</span></a>`;
  }).join("\n    ");
  return `<nav class="radial-nav" data-radial-nav aria-label="Main navigation">
  <div class="radial-nav-items" data-radial-items aria-hidden="true" inert>
    ${items}
  </div><button class="radial-nav-toggle" type="button" data-radial-toggle aria-expanded="false" aria-label="Open navigation"><img class="radial-nav-tree" src="/cinematic/images/logo-tree-transparent.png" alt=""><span class="sr-only">Open navigation</span></button><button class="radial-close" type="button" data-radial-close aria-label="Close navigation"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span class="sr-only">Close navigation</span></button>
</nav>`;
}

/** Fills a page's language-switch and menu placeholders. */
export function withSiteChrome(html: string, pathname: string): string {
  return html
    .replace("<!-- cinematic:language -->", LANGUAGE_BUTTON)
    .replace("<!-- cinematic:nav -->", radialNavHtml(pathname));
}
