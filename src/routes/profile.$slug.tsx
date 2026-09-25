import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { getProfileCard, getProfileContact } from "@/lib/private-profiles.functions";
import "@/components/profile-card/profile-card.css";

const ministryMark = { url: "/profile-card/org-ar.svg" };

type CardLanguage = "ar" | "en";

const COPY = {
  ar: { save: "حفظ جهة الاتصال", switchLanguage: "عرض البطاقة باللغة الإنجليزية" },
  en: { save: "Save Contact", switchLanguage: "عرض البطاقة باللغة العربية" },
} as const;

function XMark() {
  return <svg viewBox="0 0 24 24" style={{ fill: "none" }} stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M3 3h5.2L21 21h-5.2Z" /><path d="M20.5 3 13.4 11M10.6 13 3.5 21" /></svg>;
}

function LinkedInMark() {
  return <svg viewBox="0 0 24 24" style={{ fill: "currentColor" }} aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45Z" /></svg>;
}

function WhatsAppMark() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.07-.13-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.89 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41" /></svg>;
}

function PhoneMark() {
  return <svg viewBox="0 0 24 24" style={{ fill: "none" }} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true"><path d="M5 3.5h3.2l1.6 4.2-2.1 1.4a11 11 0 0 0 5.2 5.2l1.4-2.1 4.2 1.6V17a2.5 2.5 0 0 1-2.5 2.5A15.5 15.5 0 0 1 2.5 6 2.5 2.5 0 0 1 5 3.5Z" /></svg>;
}

function EmailMark() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18a1 1 0 0 1 1 1v.4l-10 6.2L2 6.4V6a1 1 0 0 1 1-1Zm-1 3.7 9.5 5.9a1 1 0 0 0 1 0L22 8.7V18a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1Z" /></svg>;
}

export const Route = createFileRoute("/profile/$slug")({
  validateSearch: (search: Record<string, unknown>): { lang: CardLanguage } => ({
    lang: search.lang === "en" ? "en" : "ar",
  }),
  loader: async ({ params }) => {
    const profile = await getProfileCard({ data: { slug: params.slug } });
    if (!profile) throw notFound();
    return profile;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `وزارة المالية | ${loaderData.ar.name}` : "وزارة المالية" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
      { name: "referrer", content: "no-referrer" },
      { name: "theme-color", content: "#391716" },
    ],
  }),
  component: PrivateProfilePage,
});

function PrivateProfilePage() {
  const profile = Route.useLoaderData();
  const { lang } = Route.useSearch();
  const isArabic = lang === "ar";
  const copy = COPY[lang];
  const text = profile[lang];

  // Contact details stay out of the server-rendered HTML; fetch them once the
  // page is running in a real browser.
  const fetchContact = useServerFn(getProfileContact);
  const [contact, setContact] = useState<Awaited<ReturnType<typeof getProfileContact>>>(null);
  useEffect(() => {
    let alive = true;
    fetchContact({ data: { slug: profile.slug } })
      .then((c) => alive && setContact(c))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [fetchContact, profile.slug]);

  const contactHref = useMemo(() => {
    if (!contact) return undefined;
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${text.name}`,
      `TITLE:${text.title}`,
      ...contact.phones.map((p) => `TEL;TYPE=${p.type}:${p.number}`),
      ...contact.emails.map((e, i) => `EMAIL;TYPE=WORK${i === 0 ? ";PREF=1" : ""}:${e}`),
      "END:VCARD",
    ];
    return `data:text/vcard;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
  }, [contact, text]);

  const links = [
    { label: "X", Mark: XMark, href: profile.x, external: true },
    { label: "LinkedIn", Mark: LinkedInMark, href: profile.linkedin, external: true },
    { label: isArabic ? "اتصال" : "Call", Mark: PhoneMark, href: contact && `tel:${contact.phones[0].number}` },
    { label: "WhatsApp", Mark: WhatsAppMark, href: contact && `https://wa.me/${contact.whatsapp}`, external: true },
    { label: "Email", Mark: EmailMark, href: contact && `mailto:${contact.emails[0]}` },
  ];

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isArabic ? "rtl" : "ltr";
  }, [isArabic, lang]);

  return (
    <main className="profile-page" dir={isArabic ? "rtl" : "ltr"} lang={lang}>
      <header className="profile-topbar">
        <div className="profile-org">
          {isArabic ? (
            <img src={ministryMark.url} alt="الجمهورية العربية السورية — وزارة المالية" />
          ) : (
            <span className="profile-org-en">Syrian Arab Republic<br />Ministry of Finance</span>
          )}
        </div>
        <Button asChild variant="ghost" className="profile-lang-btn">
          <Link
            to="/profile/$slug"
            params={{ slug: profile.slug }}
            search={{ lang: isArabic ? "en" : "ar" }}
            aria-label={copy.switchLanguage}
          >
            {isArabic ? "EN" : "ع"}
          </Link>
        </Button>
      </header>

      <section className="profile-card-layout">
        <div className="profile-portrait">
          <img src={profile.portrait} alt={text.name} />
        </div>

        <div className="profile-info">
          <h1 className="profile-signature">
            {isArabic ? <img src={profile.signature} alt={text.name} /> : text.name}
          </h1>

          <p className="profile-role">
            <strong>{text.role}</strong>
            <span>{text.roleSub}</span>
          </p>

          <Button asChild className="profile-save-btn">
            <a
              href={contactHref ?? "#"}
              download={contactHref ? profile.fileName : undefined}
              aria-disabled={!contactHref}
              onClick={(event) => !contactHref && event.preventDefault()}
            >
              <span>{copy.save}</span>
              <Download aria-hidden="true" />
            </a>
          </Button>

          <nav className="profile-social" aria-label={isArabic ? "روابط التواصل" : "Contact links"}>
            {links.map(({ label, Mark, href, external }) =>
              href ? (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  <Mark />
                </a>
              ) : (
                <a
                  key={label}
                  href="#"
                  aria-label={`${label} — ${isArabic ? "رابط مؤقت" : "placeholder link"}`}
                  onClick={(event) => event.preventDefault()}
                >
                  <Mark />
                </a>
              ),
            )}
          </nav>
        </div>
      </section>
    </main>
  );
}
