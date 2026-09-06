import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { Reveal } from "./Reveal";
import { V2Link } from "./V2Link";

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
};

export function HomePartners() {
  const { t } = useLang();
  const h = t.v2.home;
  const [partners, setPartners] = useState<PartnerRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("partners")
        .select("id,name,logo_url,logo_light_url,size_class")
        .eq("show_on_home", true)
        .order("display_order", { ascending: true });
      if (!cancelled) setPartners((data ?? []) as PartnerRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (partners.length === 0) return null;

  const lane = [...partners, ...partners];

  return (
    <section id="partners" className="v2-home-section">
      <div className="v2-shell">
        <Reveal>
          <p className="v2-eyebrow">{h.partnersEyebrow}</p>
          <h2 className="v2-section-title">{h.partnersTitle}</h2>
          <p className="v2-section-intro">{h.partnersCopy}</p>
        </Reveal>
      </div>

      <div className="v2-marquee" tabIndex={0} aria-label={h.partnersTitle}>
        <ul className="v2-marquee-lane">
          {lane.map((partner, i) => (
            <li
              key={`${partner.id}-${i}`}
              className="v2-marquee-item"
              aria-hidden={i >= partners.length}
            >
              <img
                src={resolveLogo(partner.logo_light_url) || resolveLogo(partner.logo_url)}
                alt={i >= partners.length ? "" : partner.name}
                loading="lazy"
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="v2-shell v2-partners-more">
        <V2Link to="/partners" className="v2-band-cta is-ghost">
          {h.partnersCta}
        </V2Link>
      </div>
    </section>
  );
}

export default HomePartners;
