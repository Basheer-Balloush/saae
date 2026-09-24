import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Facebook, Linkedin, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import "@/components/profile-card/profile-card.css";

type CardLanguage = "ar" | "en";

const COPY = {
  ar: {
    ministry: <>الجمهورية العربية السورية<br />وزارة المالية</>,
    name: "الاسم الكامل",
    role: <>المسمى الوظيفي<br />في الجمهورية العربية السورية</>,
    photo: "مكان الصورة",
    save: "حفظ جهة الاتصال",
    switchLanguage: "عرض البطاقة باللغة الإنجليزية",
  },
  en: {
    ministry: <>Syrian Arab Republic<br />Ministry of Finance</>,
    name: "Full Name",
    role: <>Official Title<br />Syrian Arab Republic</>,
    photo: "Photo placeholder",
    save: "Save contact",
    switchLanguage: "View this card in Arabic",
  },
} as const;

const SOCIALS = [
  { label: "Facebook", Icon: Facebook },
  { label: "X", text: "X" },
  { label: "LinkedIn", Icon: Linkedin },
  { label: "WhatsApp", Icon: MessageCircle },
  { label: "Email", Icon: Mail },
] as const;

export const Route = createFileRoute("/profile/7f3a9c2e")({
  head: () => ({
    meta: [
      { title: "بطاقة تعريف رسمية | Official Profile Card" },
      {
        name: "description",
        content: "بطاقة تعريف رسمية قابلة للمشاركة وحفظ معلومات الاتصال.",
      },
      { property: "og:title", content: "بطاقة تعريف رسمية" },
      {
        property: "og:description",
        content: "بطاقة تعريف رسمية قابلة للمشاركة وحفظ معلومات الاتصال.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
      { name: "theme-color", content: "#431719" },
    ],
  }),
  component: ProfileCardPage,
});

function ProfileCardPage() {
  const [language, setLanguage] = useState<CardLanguage>("ar");
  const isArabic = language === "ar";
  const copy = COPY[language];
  const contactHref = useMemo(() => {
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${isArabic ? "الاسم الكامل" : "Full Name"}`,
      `TITLE:${isArabic ? "المسمى الوظيفي" : "Official Title"}`,
      "END:VCARD",
    ];
    return `data:text/vcard;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
  }, [isArabic]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isArabic ? "rtl" : "ltr";
  }, [isArabic, language]);

  return (
    <main className="profile-card-page" dir={isArabic ? "rtl" : "ltr"} lang={language}>
      <article className="profile-card-shell">
        <header className="profile-card-header">
          <Button
            type="button"
            variant="ghost"
            className="profile-card-language"
            aria-label={copy.switchLanguage}
            onClick={() => setLanguage(isArabic ? "en" : "ar")}
          >
            {isArabic ? "EN" : "ع"}
          </Button>
          <p className="profile-card-ministry">{copy.ministry}</p>
        </header>

        <div className="profile-card-content">
          <span className="profile-card-star profile-card-star-top" aria-hidden="true" />
          <span className="profile-card-star profile-card-star-bottom" aria-hidden="true" />

          <div className="profile-card-portrait" role="img" aria-label={copy.photo}>
            <span>{copy.photo}</span>
          </div>

          <h1 className="profile-card-name">{copy.name}</h1>
          <p className="profile-card-role">{copy.role}</p>

          <div className="profile-card-actions">
            <Button asChild className="profile-card-save">
              <a href={contactHref} download="contact.vcf">
                <Download aria-hidden="true" />
                <span>{copy.save}</span>
              </a>
            </Button>

            <div className="profile-card-socials" aria-label={isArabic ? "روابط التواصل" : "Contact links"}>
              {SOCIALS.map(({ label, ...social }) => (
                <a
                  key={label}
                  className="profile-card-social"
                  href="#"
                  aria-label={`${label} — ${isArabic ? "رابط مؤقت" : "placeholder link"}`}
                  onClick={(event) => event.preventDefault()}
                >
                  {"Icon" in social ? (
                    <social.Icon aria-hidden="true" />
                  ) : (
                    <span aria-hidden="true" className="text-lg font-semibold">{social.text}</span>
                  )}
                </a>
              ))}
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}