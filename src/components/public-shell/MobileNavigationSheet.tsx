import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useLocation } from "@tanstack/react-router";
import { useOverlay } from "./OverlayProvider";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { labelAr: "الرئيسية", labelEn: "Home", href: "/" },
  { labelAr: "من نحن", labelEn: "About", href: "/about" },
  { labelAr: "الأخبار", labelEn: "News", href: "/news" },
  { labelAr: "المبادرة", labelEn: "Initiative", href: "/one-million-initiative-home" },
  { labelAr: "منصة التعليم", labelEn: "Learning platform", href: "/learning-management-system" },
  { labelAr: "تواصل معنا", labelEn: "Contact", href: "/contact" },
] as const;

function isActiveLink(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNavigationSheet({ locale = "ar" }: { locale?: "ar" | "en" }) {
  const { active, close } = useOverlay();
  const open = active === "nav";
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/40" />
        <Dialog.Content
          id="mobile-nav-sheet"
          aria-label={locale === "ar" ? "قائمة التنقل" : "Site navigation"}
          style={{ insetInlineEnd: 0 }}
          className="fixed bottom-0 top-0 z-[71] flex w-[min(320px,85vw)] flex-col bg-background shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex min-h-[64px] items-center justify-between gap-2 border-b border-border px-4">
            <Dialog.Title className="text-base font-bold text-foreground">
              {locale === "ar" ? "القائمة" : "Menu"}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                onClick={close}
                aria-label={locale === "ar" ? "إغلاق القائمة" : "Close menu"}
                className="inline-flex min-h-[44px] min-w-[44px] h-11 w-11 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </Dialog.Close>
          </div>

          <nav aria-label={locale === "ar" ? "التنقل الرئيسي" : "Primary"} className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
            <ul className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => {
                const current = isActiveLink(pathname, link.href);
                const label = locale === "ar" ? link.labelAr : link.labelEn;
                return (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      onClick={close}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "flex min-h-[48px] items-center gap-3 rounded-md px-4 py-3 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        current ? "bg-accent font-semibold text-primary" : "text-foreground/80 hover:bg-muted hover:text-primary",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "h-5 w-1 shrink-0 rounded-full bg-primary",
                          current ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default MobileNavigationSheet;
