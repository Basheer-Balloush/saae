import { useEffect, useState } from "react";
import { Menu, X, Moon, Sun, Globe } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import logo from "@/assets/saae-logo-horizontal.png";
import logoEnLight from "@/assets/saae-logo-en-light.png";
import logoEnDark from "@/assets/saae-logo-en-dark.png";
import logoArDark from "@/assets/saae-logo-ar-dark.png";
import logoArLight from "@/assets/saae-logo-ar-light.png";

const sections = ["home", "about", "news", "contact"] as const;

export function Navbar({ minimal = false }: { minimal?: boolean }) {
  const { t, lang, toggle: toggleLang } = useLang();
  const { theme, toggle: toggleTheme } = useTheme();
  const location = useLocation();
  const isAbout = location.pathname.startsWith("/about");
  const isNewsRoute = location.pathname.startsWith("/news");
  const isHome = location.pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>(isAbout ? "about" : "home");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (isAbout) {
      setActive("about");
      return;
    }
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.set(e.target.id, e.intersectionRatio);
          else visible.delete(e.target.id);
        }
        if (visible.size > 0) {
          const top = [...visible.entries()].sort((a, b) => b[1] - a[1])[0][0];
          setActive(top);
        }
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    sections.forEach((id) => {
      if (id === "news" || id === "about") return;
      const targetId = id === "contact" ? "assistant" : id;
      const el = document.getElementById(targetId);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [isAbout]);

  const hashHref = (id: string) => (isHome ? `#${id}` : `/#${id}`);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border/60 bg-background/80 backdrop-blur-xl shadow-soft"
          : "bg-transparent",
      )}
    >
      <div className="flex w-full items-center justify-between gap-3 px-4 py-3 sm:gap-6 sm:px-6 lg:px-10">
        <a
          /* There is no #home anchor on any page; the logo goes to the top of home. */
          href="/"
          className="relative flex min-w-0 shrink-0 items-center"
          aria-label="SAAIE — Syrian Association for AI & Entrepreneurship"
        >
          {(() => {
            const isEnLight = lang === "en" && theme === "light";
            const isEnDark = lang === "en" && theme === "dark";
            const isArDark = lang === "ar" && theme === "dark";
            const isArLight = lang === "ar" && theme === "light";
            const variants = [
              {
                src: logoEnLight,
                show: isEnLight,
                alt: "SAAIE — Syrian Association for AI & Entrepreneurship",
              },
              {
                src: logoEnDark,
                show: isEnDark,
                alt: "SAAIE — Syrian Association for AI & Entrepreneurship",
              },
              {
                src: logoArDark,
                show: isArDark,
                alt: "الجمعية السورية للذكاء الاصطناعي وريادة الأعمال",
              },
              {
                src: logoArLight,
                show: isArLight,
                alt: "الجمعية السورية للذكاء الاصطناعي وريادة الأعمال",
              },
              {
                src: logo,
                show: !(isEnLight || isEnDark || isArDark || isArLight),
                alt: "Syrian Association for AI & Entrepreneurship logo",
              },
            ];
            return variants.map((v, i) => (
              <img
                key={i}
                src={v.src}
                alt={v.alt}
                width={180}
                height={44}
                className={cn(
                  "h-8 w-auto transition-opacity duration-150 sm:h-10 lg:h-11",
                  v.show ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none",
                )}
                fetchPriority="high"
                decoding="async"
              />
            ));
          })()}
        </a>

        {!minimal && (
          <nav className="hidden min-w-0 flex-1 items-center gap-7 lg:flex">
            {sections.map((s) => {
              const isContactRoute = location.pathname.startsWith("/contact");
              const isActive =
                s === "contact"
                  ? isContactRoute
                  : s === "news"
                    ? isNewsRoute
                    : s === "about"
                      ? isAbout
                      : isHome && !isAbout && !isNewsRoute && !isContactRoute && active === s;
              const linkClass = cn(
                "relative inline-flex min-h-[44px] items-center px-3 py-2.5 text-sm font-medium transition-colors",
                isActive ? "text-secondary" : "text-foreground/75 hover:text-primary",
              );
              const underline = (
                <span
                  className={cn(
                    "pointer-events-none absolute -bottom-1.5 left-0 right-0 h-0.5 origin-center rounded-full bg-secondary transition-transform duration-300",
                    isActive ? "scale-x-100" : "scale-x-0",
                  )}
                />
              );
              if (s === "about") {
                return (
                  <a key={s} href="/about" className={linkClass}>
                    {t.nav[s]}
                    {underline}
                  </a>
                );
              }
              if (s === "news") {
                return (
                  <a key={s} href="/news" className={linkClass}>
                    {t.nav[s]}
                    {underline}
                  </a>
                );
              }
              if (s === "contact") {
                return (
                  <a key={s} href="/contact" className={linkClass}>
                    {t.nav[s]}
                    {underline}
                  </a>
                );
              }
              return (
                <a key={s} href={s === "home" ? "/" : `/#${s}`} className={linkClass}>
                  {t.nav[s]}
                  {underline}
                </a>
              );
            })}
            {(() => {
              const isInitiative = (location.pathname.startsWith("/initiative") || location.pathname.startsWith("/one-million-initiative"));
              return (
                <Link
                  to="/initiative"
                  className={cn(
                    "relative inline-flex min-h-[44px] items-center px-3 py-2.5 text-sm font-semibold transition-colors",
                    isInitiative
                      ? "text-secondary"
                      : "text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300",
                  )}
                >
                  {lang === "ar" ? "المبادرة" : "Initiative"}
                  <span
                    className={cn(
                      "pointer-events-none absolute -bottom-1.5 left-0 right-0 h-0.5 origin-center rounded-full bg-secondary transition-transform duration-300",
                      isInitiative ? "scale-x-100" : "scale-x-0",
                    )}
                  />
                </Link>
              );
            })()}
          </nav>
        )}

        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <button
            onClick={toggleLang}
            className="hidden min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-full border border-border px-3 py-2.5 text-sm font-semibold text-foreground/80 transition-colors hover:border-primary hover:text-primary md:inline-flex"
            aria-label="Toggle language"
          >
            <Globe className="h-3.5 w-3.5" />
            {t.nav.langToggle}
          </button>
          <button
            onClick={toggleTheme}
            className="hidden h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-border text-foreground/70 transition-colors hover:border-primary hover:text-primary md:inline-flex"
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-border lg:hidden"
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="max-h-[calc(100dvh-4.5rem)] overflow-y-auto overscroll-contain border-t border-border bg-background/95 backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-6 py-4">
            {!minimal &&
              sections.map((s) => {
                if (s === "about") {
                  return (
                    <a
                      key={s}
                      href="/about"
                      onClick={() => setOpen(false)}
                      className="flex min-h-[44px] items-center rounded-md px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-primary"
                    >
                      {t.nav[s]}
                    </a>
                  );
                }
                if (s === "news") {
                  return (
                    <a
                      key={s}
                      href="/news"
                      onClick={() => setOpen(false)}
                      className="flex min-h-[44px] items-center rounded-md px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-primary"
                    >
                      {t.nav[s]}
                    </a>
                  );
                }
                if (s === "contact") {
                  return (
                    <a
                      key={s}
                      href="/contact"
                      onClick={() => setOpen(false)}
                      className="flex min-h-[44px] items-center rounded-md px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-primary"
                    >
                      {t.nav[s]}
                    </a>
                  );
                }
                return (
                  <a
                    key={s}
                    href={s === "home" ? "/" : `/#${s}`}
                    onClick={() => setOpen(false)}
                    className="flex min-h-[44px] items-center rounded-md px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-primary"
                  >
                    {t.nav[s]}
                  </a>
                );
              })}
            <Link
              to="/initiative"
              onClick={() => setOpen(false)}
              className="flex min-h-[44px] items-center rounded-md px-4 py-3 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:bg-muted"
            >
              {lang === "ar" ? "المبادرة" : "Initiative"}
            </Link>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={toggleLang}
                className="flex-1 rounded-full border border-border px-3 py-3 min-h-[44px] text-sm font-semibold"
              >
                {t.nav.langToggle}
              </button>
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-border px-3 py-3 text-sm font-semibold"
              >
                {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
