import { motion } from "framer-motion";
import { useLang } from "@/lib/i18n";
import sarrdehLogo from "@/assets/partner-sarrdeh.png";
import devistaLogo from "@/assets/partner-devista.png";
import ilmhubLogo from "@/assets/partner-ilmhub.png";
import stepupLogo from "@/assets/partner-stepup.png";
import aleppoLogo from "@/assets/partner-aleppo.png";
import circlesLogo from "@/assets/partner-circles.png";
import sdoLogo from "@/assets/partner-sdo.png";
import dLogo from "@/assets/partner-d.png";
import joblinkLogo from "@/assets/partner-joblink.png";
import yarmoukLogo from "@/assets/partner-yarmouk.png";
import damascusLogo from "@/assets/partner-damascus.png";
import abqarLogo from "@/assets/partner-abqar.png";
import lmipLogo from "@/assets/partner-lmip.png";

const PARTNERS = [
  { name: "Sarrdeh Tech", logo: sarrdehLogo, sizeClass: "h-24" },
  { name: "Devista Consulting", logo: devistaLogo, sizeClass: "h-24" },
  { name: "ILM Hub", logo: ilmhubLogo, sizeClass: "h-32" },
  { name: "Step Up", logo: stepupLogo, sizeClass: "h-24" },
  { name: "Aleppo Governorate", logo: aleppoLogo, sizeClass: "h-28" },
  { name: "Circles", logo: circlesLogo, sizeClass: "h-24" },
  { name: "Syrian Development Organization", logo: sdoLogo, sizeClass: "h-28" },
  { name: "D", logo: dLogo, sizeClass: "h-20" },
  { name: "JobLink", logo: joblinkLogo, sizeClass: "h-24" },
  { name: "Yarmouk Private University", logo: yarmoukLogo, sizeClass: "h-28" },
  { name: "Damascus University", logo: damascusLogo, sizeClass: "h-28" },
  { name: "Kawkab Abqar", logo: abqarLogo, sizeClass: "h-24" },
  { name: "LMIP", logo: lmipLogo, sizeClass: "h-24" },
];

export function Partners() {
  const { t } = useLang();
  const loop = [...PARTNERS, ...PARTNERS];

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
          <h2 className="whitespace-nowrap text-display-2 text-foreground">
            {t.partners.title}
          </h2>
        </motion.div>
      </div>

      <div
        className="partners-marquee group relative mt-14 overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        }}
      >
        <div className="partners-track flex w-max items-center gap-16 py-4">
          {loop.map((p, i) => (
            <div
              key={`${p.name}-${i}`}
              className="flex flex-none items-center justify-center"
            >
              <img
                src={p.logo}
                alt={p.name}
                loading="lazy"
                decoding="async"
                className={`${p.sizeClass} w-auto object-contain opacity-70 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0 hover:scale-105`}
              />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes partners-scroll {
          from { transform: translate3d(0, 0, 0); }
          to { transform: translate3d(-50%, 0, 0); }
        }
        .partners-track {
          animation: partners-scroll 60s linear infinite;
          will-change: transform;
          backface-visibility: hidden;
        }

        .partners-marquee:hover .partners-track {
          animation-play-state: paused;
        }
        [dir="rtl"] .partners-track {
          animation-direction: reverse;
        }
      `}</style>
    </section>
  );
}
