import { createFileRoute } from "@tanstack/react-router";
import { PublicSiteLayout } from "@/components/public/PublicSiteLayout";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

type PartnerRow = {
  id: string;
  name: string;
  logo_url: string;
  logo_light_url: string | null;
  size_class: string;
};

export const Route = createFileRoute("/partners")({
  loader: async () => {
    const { data } = await supabase
      .from("partners")
      .select("id,name,logo_url,logo_light_url,size_class")
      .order("display_order", { ascending: true });
    return { partners: (data ?? []) as PartnerRow[] };
  },
  head: () => ({
    meta: [
      { title: "Partners — SAAE" },
      {
        name: "description",
        content:
          "The universities, ministries, companies and community bodies working with the Syrian Association for AI & Entrepreneurship.",
      },
      { property: "og:title", content: "Partners — SAAE" },
      {
        property: "og:description",
        content: "The organisations building Syria's AI capacity together with SAAE.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://aisyria.org/partners" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://aisyria.org/partners" }],
  }),
  component: PartnersPage,
});

function PartnersPage() {
  const { partners } = Route.useLoaderData();
  const { lang } = useLang();
  const isArabic = lang === "ar";

  return (
    <PublicSiteLayout>
      <main id="main-content">
        <div className="head page-shell">
          <p className="eyebrow">{isArabic ? "عمل مشترك" : "Shared work"}</p>
          <h1 id="partners-h" className="photo-head">
            {isArabic ? "سجل الشركاء." : "The partner register."}
          </h1>
          <p>
            {isArabic
              ? "الجهات التي تعلن الجمعية شراكتها معها: جامعات ووزارات وشركات ومؤسسات مجتمعية تعمل معنا على التدريب والمشاريع التطبيقية."
              : "The organisations SAAE lists publicly as partners: universities, ministries, companies and community bodies working with the association on training and applied projects."}
          </p>
          <div className="rule" aria-hidden="true" />
        </div>

        <div className="page-shell">
          <ul className="partner-grid">
            {partners.map((partner) => (
              <li className="partner-plate" key={partner.id}>
                <span className="plate-face">
                  <img
                    src={partner.logo_url}
                    alt=""
                    width={320}
                    height={320}
                    loading="lazy"
                    decoding="async"
                  />
                </span>
                <span className="plate-name">{partner.name}</span>
              </li>
            ))}
          </ul>

          <p className="note">
            {isArabic
              ? "الشعارات والأسماء منشورة من الجمعية وموحّدة الحجم فقط، دون أي إعادة رسم."
              : "Marks and names are published by SAAE and fitted to a common size. Nothing here has been redrawn."}
          </p>
        </div>
      </main>
    </PublicSiteLayout>
  );
}
