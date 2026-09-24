import { useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import arabicNameArtwork from "@/assets/mohammad-yusr-barnieh-name-v2.png.asset.json";
import profilePhoto from "@/assets/official-profile-photo.jpeg.asset.json";
import "@/components/profile-card/profile-card.css";

type CardLanguage = "ar" | "en";

const COPY = {
  ar: {
    ministry: <>الجمهورية العربية السورية<br />وزارة المالية</>,
    name: "محمد يسر برنية",
    role: <><strong>وزير المالية</strong><br /><span>في الجمهورية العربية السورية</span></>,
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

function FacebookMark() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4.3A24 24 0 0 0 14.4 4C11.8 4 10 5.6 10 8.6V11H7v4h3v7h4v-7h3l.5-4H14V8.8c0-.7.2-.8 1-.8Z" /></svg>;
}

function XMark() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h4.7l4.2 5.6L17.8 3H20l-6.1 7.1L21 21h-4.7l-4.8-6.4L6 21H3.8l6.7-7.9L4 3Zm3.6 1.7 9.6 14.6h1.9L9.5 4.7H7.6Z" /></svg>;
}

function LinkedInMark() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.4 8.4H2.2V22h3.2V8.4ZM3.8 2A1.9 1.9 0 1 0 3.8 5.8 1.9 1.9 0 0 0 3.8 2ZM21.8 14.2c0-4.1-2.2-6-5.1-6-2.4 0-3.4 1.3-4 2.2v-2H9.5V22h3.2v-6.7c0-1.8.3-3.5 2.6-3.5 2.2 0 2.3 2.1 2.3 3.6V22h3.2l1-7.8Z" /></svg>;
}

function WhatsAppMark() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12 2a9.7 9.7 0 0 0-8.3 14.7L2.3 22l5.5-1.4A9.8 9.8 0 1 0 12 2Zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-3.2.8.9-3.1-.2-.3A8 8 0 1 1 12 19.7Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.7.9c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.2-.3 0-.5.1-.6l.5-.6c.1-.2.1-.3.2-.5 0-.1 0-.3-.1-.4l-.8-2c-.2-.5-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.5 3.9.6.3 1.1.4 1.5.5.7.2 1.3.2 1.8.1.5-.1 1.4-.6 1.6-1.2.2-.6.2-1.1.1-1.2-.1-.1-.3-.2-.5-.3Z" clipRule="evenodd" /></svg>;
}

function EmailMark() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 3.2v8.5h18V8.2l-7.7 6.2a2 2 0 0 1-2.6 0L3 8.2Zm1.1-1.5 7.9 6.4 7.9-6.4H4.1Z" /></svg>;
}

const SOCIALS = [
  { label: "Facebook", Mark: FacebookMark },
  { label: "X", Mark: XMark },
  { label: "LinkedIn", Mark: LinkedInMark },
  { label: "WhatsApp", Mark: WhatsAppMark },
  { label: "Email", Mark: EmailMark },
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
      `TITLE:${isArabic ? "وزير المالية في الجمهورية العربية السورية" : "Official Title"}`,
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
              {SOCIALS.map(({ label, Mark }) => (
                <a
                  key={label}
                  className="profile-card-social"
                  href="#"
                  aria-label={`${label} — ${isArabic ? "رابط مؤقت" : "placeholder link"}`}
                  onClick={(event) => event.preventDefault()}
                >
                  <Mark />
                </a>
              ))}
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}