import { useEffect, useState } from "react";
import { Globe, Menu } from "lucide-react";
import { useOverlay } from "./OverlayProvider";
import defaultLogo from "@/assets/saae-logo-horizontal.png";
import { cn } from "@/lib/utils";

export interface PublicHeaderProps {
  locale?: "ar" | "en";
  dir?: "ltr" | "rtl";
  logoSrc?: string;
  logoAlt?: string;
}

export function PublicHeader({ locale = "ar", dir, logoSrc, logoAlt }: PublicHeaderProps) {
  const { active, open } = useOverlay();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navOpen = active === "nav";
  const resolvedDir = dir ?? (locale === "ar" ? "rtl" : "ltr");
  const alt =
    logoAlt ?? (locale === "ar" ? "الجمعية السورية للذكاء الاصطناعي وريادة الأعمال" : "Syrian Association for AI & Entrepreneurship");

  return (
    <header
      dir={resolvedDir}
      style={{ height: "var(--header-height)" }}
      className={cn(
        "sticky top-0 z-50 w-full transition-colors duration-200",
        scrolled ? "border-b border-border/60 bg-background/90 backdrop-blur-md" : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-full w-full max-w-[1280px] items-center justify-between gap-3 px-4 sm:px-6">
        <a
          href="/"
          aria-label={alt}
          className="flex min-h-[44px] min-w-0 shrink-0 items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <img
            src={logoSrc ?? defaultLogo}
            alt={alt}
            width={180}
            height={44}
            decoding="async"
            fetchPriority="high"
            className="h-9 w-auto sm:h-10"
          />
        </a>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label={locale === "ar" ? "Change language" : "تغيير اللغة"}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-full border border-border px-3 py-2.5 text-sm font-semibold text-foreground/80 transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Globe className="h-4 w-4" aria-hidden />
            <span aria-hidden>{locale === "ar" ? "EN" : "عربي"}</span>
          </button>
          <button
            type="button"
            onClick={() => open("nav")}
            aria-expanded={navOpen}
            aria-controls="mobile-nav-sheet"
            aria-label={navOpen ? "Close menu" : "Open menu"}
            className="inline-flex min-h-[44px] min-w-[44px] h-11 w-11 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>
    </header>
  );
}

export default PublicHeader;
