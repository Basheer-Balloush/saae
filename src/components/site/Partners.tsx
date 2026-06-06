import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

// Eager import of bundled partner assets so legacy /src/assets/... seed rows
// still resolve to real built URLs at runtime.
const bundledLogos = import.meta.glob("@/assets/partner-*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function resolveLogo(url: string): string {
  if (!url) return url;
  if (url.startsWith("/src/assets/")) {
    const key = url.replace("/src/", "/src/");
    // import.meta.glob uses paths relative to project root with leading "/"
    const match = Object.entries(bundledLogos).find(([k]) => k.endsWith(url.replace("/src/assets/", "/assets/")));
    return match ? match[1] : url;
  }
  return url;
}

type Partner = {
  id: string;
  name: string;
  logo_url: string;
  logo_light_url: string | null;
  size_class: string;
};

export function Partners() {
  const { t } = useLang();
  const [partners, setPartners] = useState<Partner[]>([]);

  useEffect(() => {
    supabase
      .from("partners")
      .select("id,name,logo_url,logo_light_url,size_class")
      .eq("show_on_home", true)
      .order("display_order", { ascending: true })
      .then(({ data }) => {
        setPartners(
          ((data ?? []) as Partner[]).map((p) => ({
            ...p,
            logo_url: resolveLogo(p.logo_url),
            logo_light_url: p.logo_light_url ? resolveLogo(p.logo_light_url) : null,
          })),
        );
      });
  }, []);

  const renderPartnerSet = (setIndex: number) => (
    <div className="partners-set flex shrink-0 items-center gap-16 pr-16">
      {partners.map((p) => (
        <div
          key={`${p.id}-${setIndex}`}
          className="flex h-36 w-52 flex-none items-center justify-center sm:w-60"
        >
          {p.logo_light_url ? (
            <>
              <img
                src={p.logo_light_url}
                alt={`${p.name} partner logo`}
                decoding="async"
                className={`${p.size_class} max-h-32 max-w-full w-auto object-contain transition-transform duration-300 hover:scale-105 block dark:hidden`}
              />
              <img
                src={p.logo_url}
                alt={`${p.name} partner logo`}
                decoding="async"
                className={`${p.size_class} max-h-32 max-w-full w-auto object-contain transition-transform duration-300 hover:scale-105 hidden dark:block`}
              />
            </>
          ) : (
            <img
              src={p.logo_url}
              alt={`${p.name} partner logo`}
              decoding="async"
              className={`${p.size_class} max-h-32 max-w-full w-auto object-contain transition-transform duration-300 hover:scale-105`}
            />
          )}
        </div>
      ))}
    </div>
  );

  if (partners.length === 0) return null;

  return (
    <section id="partners" className="relative bg-surface py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mx-auto text-center"
        >
          <h2 className="whitespace-nowrap text-display-2 text-foreground">{t.partners.title}</h2>
        </motion.div>
      </div>

      <div
        dir="ltr"
        className="partners-marquee group relative mt-14 overflow-hidden"
        style={{
          maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        }}
      >
        <div className="partners-track flex w-max items-center py-4">
          {renderPartnerSet(0)}
          {renderPartnerSet(1)}
          {renderPartnerSet(2)}
        </div>
      </div>

      <style>{`
        .partners-track {
          animation: partners-scroll 55s linear infinite;
          direction: ltr;
          will-change: transform;
          backface-visibility: hidden;
          transform: translate3d(-33.333333%, 0, 0);
          transform-style: preserve-3d;
        }
        @keyframes partners-scroll {
          from { transform: translate3d(-33.333333%, 0, 0); }
          to { transform: translate3d(-66.666666%, 0, 0); }
        }

        .partners-marquee:hover .partners-track {
          animation-play-state: paused;
        }
        [dir="rtl"] .partners-track {
          animation-name: partners-scroll;
        }
      `}</style>
    </section>
  );
}
