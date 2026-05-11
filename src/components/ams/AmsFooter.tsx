import { useLang } from "@/lib/i18n";
import { amsT } from "@/lib/ams-i18n";

export function AmsFooter() {
  const { lang } = useLang();
  const tr = amsT[lang];
  const year = new Date().getFullYear().toString();
  return (
    <footer className="border-t border-border/60 bg-card/30 mt-12">
      <div className="container mx-auto px-4 py-5 text-center text-xs text-muted-foreground">
        {tr.copyright.replace("{year}", year)}
      </div>
    </footer>
  );
}
