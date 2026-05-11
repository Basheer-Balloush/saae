import { useEffect, useState } from "react";
import { Moon, Sun, Globe, LogOut } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { amsT } from "@/lib/ams-i18n";
import logo from "@/assets/saae-logo-horizontal.png";
import logoEnLight from "@/assets/saae-logo-en-light.png";
import logoEnDark from "@/assets/saae-logo-en-dark.png";
import logoArDark from "@/assets/saae-logo-ar-dark.png";

type Props = {
  onSignOut?: () => void;
  showSignOut?: boolean;
  extra?: React.ReactNode;
};

export function AmsNavbar({ onSignOut, showSignOut, extra }: Props) {
  const { t, lang, toggle: toggleLang } = useLang();
  const { theme, toggle: toggleTheme } = useTheme();
  const tr = amsT[lang];
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isEnLight = lang === "en" && theme === "light";
  const isEnDark = lang === "en" && theme === "dark";
  const isArDark = lang === "ar" && theme === "dark";
  const variants = [
    { src: logoEnLight, show: isEnLight, alt: "SAAIE" },
    { src: logoEnDark, show: isEnDark, alt: "SAAIE" },
    { src: logoArDark, show: isArDark, alt: "SAAIE" },
    { src: logo, show: !(isEnLight || isEnDark || isArDark), alt: "SAAIE" },
  ];

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border/60 bg-background/80 backdrop-blur-xl shadow-soft"
          : "bg-transparent",
      )}
    >
      <div className="flex w-full items-center justify-between gap-2 px-3 py-3 sm:gap-6 sm:px-6 lg:px-10">
        <div className="relative flex h-10 sm:h-11 items-center shrink-0" aria-label="SAAIE">
          {variants.map((v, i) => (
            <img
              key={i}
              src={v.src}
              alt={v.alt}
              className={cn(
                "h-10 w-auto sm:h-11 transition-opacity duration-150",
                v.show ? "opacity-100 relative" : "opacity-0 absolute inset-y-0 start-0 pointer-events-none",
              )}
              fetchPriority="high"
              decoding="async"
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleLang}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground/80 transition-colors hover:border-primary hover:text-primary"
            aria-label="Toggle language"
          >
            <Globe className="h-3.5 w-3.5" />
            {t.nav.langToggle}
          </button>
          <button
            onClick={toggleTheme}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground/70 transition-colors hover:border-primary hover:text-primary"
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          {extra}
          {showSignOut && (
            <Button variant="ghost" size="sm" onClick={onSignOut}>
              <LogOut className="h-4 w-4 mx-1" />
              <span className="hidden sm:inline">{tr.signOut}</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
