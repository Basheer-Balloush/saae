import { motion } from "framer-motion";
import { useLang } from "@/lib/i18n";

const PARTNERS = [
  "Damascus University",
  "Ministry of Higher Education",
  "UNESCO",
  "Aleppo University",
  "Tishreen University",
  "Syrian Computer Society",
  "ICARDA",
  "UNDP Syria",
  "Tartous University",
  "Higher Institute for Applied Sciences",
];

export function Partners() {
  const { t } = useLang();
  const row = [...PARTNERS, ...PARTNERS];

  return (
    <section id="partners" className="relative bg-surface py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">{t.partners.eyebrow}</p>
          <h2 className="mt-3 font-display text-3xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-4xl">
            {t.partners.title}
          </h2>
        </motion.div>

        <div className="relative mt-14 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
          <div className="flex w-max animate-[marquee_45s_linear_infinite] gap-12 hover:[animation-play-state:paused]">
            {row.map((p, i) => (
              <div
                key={i}
                className="flex h-16 min-w-[200px] items-center justify-center px-5 text-[15px] font-semibold tracking-tight text-muted-foreground/70 grayscale transition-all hover:text-primary hover:grayscale-0"
              >
                {p}
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        [dir="rtl"] .animate-\\[marquee_45s_linear_infinite\\] {
          animation-direction: reverse;
        }
      `}</style>
    </section>
  );
}
