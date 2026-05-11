import { useLang } from "@/lib/i18n";

export function AmsFooter() {
  const { lang } = useLang();
  const isRtl = lang === "ar";
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border/60 bg-card/30">
      <div
        className="container mx-auto px-4 py-5 text-center text-xs text-muted-foreground whitespace-pre-line"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {isRtl ? (
          <span dir="rtl">
            جميع الحقوق محفوظة للجمعية السورية للذكاء الاصطناعي وريادة الأعمال <bdi dir="ltr">{year} ©</bdi>
          </span>
        ) : (
          <span>All rights reserved for Syrian Association for AI & Entrepreneurship {year}©</span>
        )}
      </div>
    </footer>
  );
}
