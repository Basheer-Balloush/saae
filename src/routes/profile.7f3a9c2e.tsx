import { useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Facebook, Linkedin, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import arabicNameArtwork from "@/assets/mohammad-yusr-barnieh-name.png.asset.json";
import profilePhoto from "@/assets/official-profile-photo.jpeg.asset.json";
import "@/components/profile-card/profile-card.css";

type CardLanguage = "ar" | "en";

const COPY = {
  ar: {
    ministry: <>الجمهورية العربية السورية<br />وزارة المالية</>,
    name: "محمد يسر برنية",
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
  validateSearch: (search: Record<string, unknown>): { lang: CardLanguage } => ({
    lang: search.lang === "en" ? "en" : "ar",
  }),
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
  const { lang } = Route.useSearch();
  const isArabic = lang === "ar";
  const copy = COPY[lang];
  const contactHref = useMemo(() => {
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${isArabic ? "محمد يسر برنية" : "Mohammad Yusr Barnieh"}`,
      `TITLE:${isArabic ? "المسمى الوظيفي" : "Official Title"}`,
      "END:VCARD",
    ];
    return `data:text/vcard;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
  }, [isArabic]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isArabic ? "rtl" : "ltr";
  }, [isArabic, lang]);

  return (
    <main className="profile-card-page" dir={isArabic ? "rtl" : "ltr"} lang={lang}>
      <article className="profile-card-shell">
        <header className="profile-card-header">
          <Button
            asChild
            variant="ghost"
            className="profile-card-language"
          >
            <a href={isArabic ? "?lang=en" : "?lang=ar"} aria-label={copy.switchLanguage}>
              {isArabic ? "EN" : "ع"}
            </a>
          </Button>
          <p className="profile-card-ministry">{copy.ministry}</p>
        </header>

        <div className="profile-card-content">
          <span className="profile-card-star profile-card-star-top" aria-hidden="true" />
          <span className="profile-card-star profile-card-star-bottom" aria-hidden="true" />

          <div className="profile-card-portrait">
            <img src={profilePhoto.url} alt={isArabic ? "الصورة الشخصية الرسمية" : "Official portrait"} />
          </div>

          <h1 className={`profile-card-name${isArabic ? " profile-card-name-ar" : ""}`}>
            {isArabic ? (
              <img src={arabicNameArtwork.url} alt={copy.name} />
            ) : (
              copy.name
            )}
          </h1>
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