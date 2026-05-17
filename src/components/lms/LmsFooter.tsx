import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";

export function LmsFooter() {
  const { lang } = useLang();
  const tr = lmsT[lang];
  return (
    <footer className="border-t border-border bg-muted/30 py-6 text-center text-sm text-muted-foreground">
      © {new Date().getFullYear()} {tr.brand} · {tr.copyright}
    </footer>
  );
}
