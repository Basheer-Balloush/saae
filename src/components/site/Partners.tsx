import { motion } from "framer-motion";
import { useLang } from "@/lib/i18n";
import sarrdehLogo from "@/assets/partner-sarrdeh.png";
import devistaLogo from "@/assets/partner-devista.png";
import ilmhubLogo from "@/assets/partner-ilmhub.png";

const PARTNERS = [
  { name: "Sarrdeh Tech", logo: sarrdehLogo, sizeClass: "h-28" },
  { name: "Devista Consulting", logo: devistaLogo, sizeClass: "h-28" },
  { name: "ILM Hub", logo: ilmhubLogo, sizeClass: "h-40" },
];

export function Partners() {
  const { t } = useLang();

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

        <div className="mt-14 flex flex-wrap items-center justify-center gap-12">
          {PARTNERS.map((p) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5 }}
              className="flex items-center justify-center"
            >
              <img
                src={p.logo}
                alt={p.name}
                width={160}
                height={64}
                loading="lazy"
                decoding="async"
                className={`${p.sizeClass} w-auto object-contain transition-transform hover:scale-105`}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
