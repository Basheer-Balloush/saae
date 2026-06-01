import { motion } from "framer-motion";
import { useLang } from "@/lib/i18n";
import sarrdehLogo from "@/assets/partner-sarrdeh.png";
import devistaLogo from "@/assets/partner-devista.png";
import ilmhubLogo from "@/assets/partner-ilmhub.png";
import stepupLogo from "@/assets/partner-stepup.png";
import aleppoLogo from "@/assets/partner-aleppo.png";
import circlesLogo from "@/assets/partner-circles.png";
import sdoLogo from "@/assets/partner-sdo.png";
import sdoLogoLight from "@/assets/partner-sdo-light.png";
import dLogo from "@/assets/partner-d.png";
import joblinkLogo from "@/assets/partner-joblink.png";
import yarmoukLogo from "@/assets/partner-yarmouk.png";
import damascusLogo from "@/assets/partner-damascus.png";
import abqarLogo from "@/assets/partner-abqar.png";
import lmipLogo from "@/assets/partner-lmip.png";
import peopleLogo from "@/assets/partner-people.png";
import azbooksLogo from "@/assets/partner-azbooks.png";
import syrianTelecomLogo from "@/assets/partner-syriantelecom.png";
import ihsanLogo from "@/assets/partner-ihsan.png";
import mosalLogo from "@/assets/partner-mosal.png";
import cubesLogo from "@/assets/partner-cubes.png";
import baukantLogo from "@/assets/partner-baukant.png";
import baccaLogo from "@/assets/partner-bacca.png";

const PARTNERS = [
  { name: "Sarrdeh Tech", logo: sarrdehLogo, sizeClass: "h-24" },
  { name: "Devista Consulting", logo: devistaLogo, sizeClass: "h-24" },
  { name: "ILM Hub", logo: ilmhubLogo, sizeClass: "h-32" },
  { name: "Step Up", logo: stepupLogo, sizeClass: "h-24" },
  { name: "Aleppo Governorate", logo: aleppoLogo, sizeClass: "h-28" },
  { name: "Circles", logo: circlesLogo, sizeClass: "h-24" },
  { name: "Syrian Development Organization", logo: sdoLogo, logoLight: sdoLogoLight, sizeClass: "h-36" },
  { name: "D", logo: dLogo, sizeClass: "h-20" },
  { name: "JobLink", logo: joblinkLogo, sizeClass: "h-24" },
  { name: "Yarmouk Private University", logo: yarmoukLogo, sizeClass: "h-28" },
  { name: "Damascus University", logo: damascusLogo, sizeClass: "h-28" },
  { name: "Kawkab Abqar", logo: abqarLogo, sizeClass: "h-24" },
  { name: "LMIP", logo: lmipLogo, sizeClass: "h-24" },
  { name: "People", logo: peopleLogo, sizeClass: "h-24" },
  { name: "A-Z Books", logo: azbooksLogo, sizeClass: "h-24" },
  { name: "Syrian Telecom", logo: syrianTelecomLogo, sizeClass: "h-24" },
  { name: "Al-Ihsan Medical", logo: ihsanLogo, sizeClass: "h-24" },
  { name: "Ministry of Social Affairs and Labor", logo: mosalLogo, sizeClass: "h-24" },
  { name: "Cubes", logo: cubesLogo, sizeClass: "h-24" },
  { name: "Baukant", logo: baukantLogo, sizeClass: "h-24" },
  { name: "BACCA", logo: baccaLogo, sizeClass: "h-20" },
];

export function Partners() {
  const { t } = useLang();

  const renderPartnerSet = (setIndex: number) => (
    <div className="partners-set flex shrink-0 items-center gap-16 pr-16">
      {PARTNERS.map((p) => (
        <div
          key={`${p.name}-${setIndex}`}
          className="flex h-36 w-52 flex-none items-center justify-center sm:w-60"
        >
          {(p as { logoLight?: string }).logoLight ? (
            <>
              <img
                src={(p as { logoLight: string }).logoLight}
                alt={`${p.name} partner logo`}
                decoding="async"
                className={`${p.sizeClass} max-h-32 max-w-full w-auto object-contain transition-transform duration-300 hover:scale-105 block dark:hidden`}
              />
              <img
                src={p.logo}
                alt={`${p.name} partner logo`}
                decoding="async"
                className={`${p.sizeClass} max-h-32 max-w-full w-auto object-contain transition-transform duration-300 hover:scale-105 hidden dark:block`}
              />
            </>
          ) : (
            <img
              src={p.logo}
              alt={`${p.name} partner logo`}
              decoding="async"
              className={`${p.sizeClass} max-h-32 max-w-full w-auto object-contain transition-transform duration-300 hover:scale-105`}
            />
          )}
        </div>
      ))}
    </div>
  );

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
