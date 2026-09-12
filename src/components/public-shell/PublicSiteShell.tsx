import type { ReactNode } from "react";
import { OverlayProvider } from "./OverlayProvider";
import { PublicHeader } from "./PublicHeader";
import { MobileNavigationSheet } from "./MobileNavigationSheet";
import { Footer } from "../site/Footer";

export interface PublicSiteShellProps {
  children: ReactNode;
  locale?: "ar" | "en";
  dir?: "ltr" | "rtl";
  logoSrc?: string;
}

export function PublicSiteShell({ children, locale = "ar", dir, logoSrc }: PublicSiteShellProps) {
  const resolvedDir = dir ?? (locale === "ar" ? "rtl" : "ltr");

  return (
    <OverlayProvider>
      <div dir={resolvedDir} lang={locale}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:z-[80] focus:inline-flex focus:min-h-[44px] focus:items-center focus:rounded-md focus:bg-background focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {locale === "ar" ? "تخطَّ إلى المحتوى الرئيسي" : "Skip to main content"}
        </a>
        <PublicHeader locale={locale} dir={resolvedDir} logoSrc={logoSrc} />
        <MobileNavigationSheet locale={locale} />
        <main id="main-content" tabIndex={-1} className="min-h-[50vh] focus-visible:outline-none">
          {children}
        </main>
        <Footer />
      </div>
    </OverlayProvider>
  );
}

export default PublicSiteShell;
