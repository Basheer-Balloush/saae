import { createFileRoute } from "@tanstack/react-router";

import { PageV2 } from "@/components/site-v2/PageV2";
import { Reveal } from "@/components/site-v2/Reveal";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

// Eager import of bundled partner assets so legacy /src/assets/... seed rows
// still resolve to real built URLs at runtime (same approach as the
// home-page logo wall, copied rather than shared so that file stays untouched).
const bundledLogos = import.meta.glob("@/assets/partner-*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function resolveLogo(url: string | null): string {
  if (!url) return "";
  if (url.startsWith("/src/assets/") && bundledLogos[url]) return bundledLogos[url];
  return url;
}

type PartnerRow = {
  id: string;
  name: string;
  logo_url: string | null;
  logo_light_url: string | null;
  size_class: string | null;
  display_order: number | null;
};

export const Route = createFileRoute("/partners")({
  loader: async () => {
    const { data } = await supabase
      .from("partners")
      .select("id,name,logo_url,logo_light_url,size_class,display_order")
      .order("display_order", { ascending: true });

    const partners = ((data ?? []) as PartnerRow[]).map((p) => ({
      ...p,
      logo_url: resolveLogo(p.logo_url),
      logo_light_url: resolveLogo(p.logo_light_url),
    }));

    return { partners };
  },
  head: () => ({
    meta: [
      { title: "الشركاء | الجمعية السورية للذكاء الاصطناعي وريادة الأعمال — SAAE Partners" },
      {
        name: "description",
        content:
          "The organisations SAAE lists publicly as partners: universities, ministries, companies and community bodies working with the association on training and applied projects.",
      },
      { property: "og:title", content: "Partners | SAAE" },
      {
        property: "og:description",
        content:
          "Universities, ministries, companies and community organisations working with the Syrian Association for AI & Entrepreneurship.",
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
  const { t } = useLang();
  const p = t.v2.partners;

  return (
    <PageV2>
      <div className="v2-shell v2-partners-head">
        <Reveal>
          <p className="v2-eyebrow">{p.eyebrow}</p>
          <h1 className="v2-partners-title">{p.title}</h1>
          <p className="v2-partners-intro">{p.intro}</p>
          <div className="v2-rule" aria-hidden="true" />
        </Reveal>
      </div>

      <div className="v2-shell">
        {partners.length === 0 ? (
          <p className="v2-partners-empty">{p.empty}</p>
        ) : (
          <>
            <ul className="v2-partner-grid">
              {partners.map((partner, i) => {
                const light = partner.logo_light_url || partner.logo_url;
                return (
                  <li key={partner.id}>
                    <Reveal className="v2-partner-plate" delay={Math.min(i, 9) * 0.03}>
                      <span className="v2-plate-face">
                        {light ? (
                          <img
                            src={light}
                            alt=""
                            width={320}
                            height={320}
                            loading="lazy"
                            decoding="async"
                          />
                        ) : null}
                      </span>
                      <span className="v2-plate-name">{partner.name}</span>
                    </Reveal>
                  </li>
                );
              })}
            </ul>
            <p className="v2-partners-note">{p.note}</p>
          </>
        )}
      </div>
    </PageV2>
  );
}
