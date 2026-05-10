import { useEffect, useState } from "react";
import { Menu, X, Moon, Sun, Globe } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import logo from "@/assets/saae-logo-horizontal.png";
import logoEnLight from "@/assets/saae-logo-en-light.png";
import logoArDark from "@/assets/saae-logo-ar-dark.png";

const sections = ["home", "communities", "achievements", "partners", "contact", "news", "about"] as const;

export function Navbar() {
  const { t, lang, toggle: toggleLang } = useLang();
  const { theme, toggle: toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("home");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
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
      if (id === "news") return; // الأخبار قسم داخل الرئيسية — يبقى "home" هو الـ active
      const targetId = id === "contact" ? "assistant" : id;
      const el = document.getElementById(targetId);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border/60 bg-background/80 backdrop-blur-xl shadow-soft"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3 lg:px-10">
        <a href="#home" className="relative flex items-center" aria-label="SAAIE — Syrian Association for AI & Entrepreneurship">
          {(() => {
            const variants = [
              { src: logoEnLight, show: lang === "en" && theme === "light", alt: "SAAIE — Syrian Association for AI & Entrepreneurship" },
              { src: logoArDark, show: lang === "ar" && theme === "dark", alt: "الجمعية السورية للذكاء الاصطناعي وريادة الأعمال" },
              { src: logo, show: !((lang === "en" && theme === "light") || (lang === "ar" && theme === "dark")), alt: "SAAIE" },
            ];
            return variants.map((v, i) => (
              <img
                key={i}
                src={v.src}
                alt={v.alt}
                className={cn(
                  "h-10 w-auto sm:h-11 transition-opacity duration-150",
                  v.show ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none",
                )}
                fetchPriority="high"
                decoding="async"
              />
            ));
          })()}
        </a>

        <nav className="hidden items-center gap-7 lg:flex">
          {sections.map((s) => {
            const isActive = s === "contact" ? (active === "assistant" || active === "contact") : active === s;
            const href = s === "contact" ? "#assistant" : `#${s}`;
            return (
              <a
                key={s}
                href={href}
                className={cn(
                  "relative text-sm font-medium transition-colors",
                  isActive ? "text-secondary" : "text-foreground/75 hover:text-primary",
                )}
              >
                {t.nav[s]}
                <span
                  className={cn(
                    "pointer-events-none absolute -bottom-1.5 left-0 right-0 h-0.5 origin-center rounded-full bg-secondary transition-transform duration-300",
                    isActive ? "scale-x-100" : "scale-x-0",
                  )}
                />
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleLang}
            className="hidden items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground/80 transition-colors hover:border-primary hover:text-primary md:inline-flex"
            aria-label="Toggle language"
          >
            <Globe className="h-3.5 w-3.5" />
            {t.nav.langToggle}
          </button>
          <button
            onClick={toggleTheme}
            className="hidden h-9 w-9 items-center justify-center rounded-full border border-border text-foreground/70 transition-colors hover:border-primary hover:text-primary md:inline-flex"
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border lg:hidden"
            aria-label="Menu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background/95 backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-6 py-4">
            {sections.map((s) => (
              <a
                key={s}
                href={s === "contact" ? "#assistant" : `#${s}`}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-primary"
              >
                {t.nav[s]}
              </a>
            ))}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={toggleLang}
                className="flex-1 rounded-full border border-border px-3 py-2 text-xs font-semibold"
              >
                {t.nav.langToggle}
              </button>
              <button
                onClick={toggleTheme}
                className="rounded-full border border-border px-3 py-2 text-xs font-semibold"
              >
                {theme === "light" ? "Dark" : "Light"}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
