import { motion } from "framer-motion";
import { Database, Building2, Stethoscope, Rocket, FlaskConical, Code2, TrendingUp, ArrowRight, ArrowUpRight } from "lucide-react";
import { useLang } from "@/lib/i18n";

export function Communities() {
  const { t, dir } = useLang();
  const c = t.communities.cards;
  const cards = [
    { icon: Database, ...c.data },
    { icon: Building2, ...c.architecture },
    { icon: Stethoscope, ...c.medical },
    { icon: Rocket, ...c.entrepreneurship },
    { icon: FlaskConical, ...c.research },
    { icon: Code2, ...c.software },
    { icon: TrendingUp, ...c.economy },
  ];

  const isRtl = dir === "rtl";

  return (
    <section id="communities" className="relative overflow-hidden bg-surface py-28 lg:py-36">
      <div className="relative mx-auto max-w-5xl px-6 sm:px-10 lg:px-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="text-caption text-primary">{t.communities.eyebrow}</p>
          <h2
            className="mt-4 text-display-2 leading-[1.05] tracking-tight text-foreground"
            style={{ fontFamily: '"Cairo", system-ui, sans-serif', fontWeight: 900 }}
          >
            {t.communities.title}
          </h2>
          <p
            className="mx-auto mt-5 max-w-2xl text-body leading-relaxed"
            style={{ color: "#555555", letterSpacing: "0.01em" }}
          >
            {t.communities.subtitle}
          </p>
        </motion.div>

        {/* Editorial index */}
        <div className="mt-20 border-t border-border/60">
          {cards.map((card, i) => {
            const Icon = card.icon;
            // Asymmetric 2-column: alternate which column is wider
            const wideLeft = i % 2 === 0;
            const gridCols = wideLeft ? "lg:grid-cols-[1.4fr_1fr]" : "lg:grid-cols-[1fr_1.4fr]";

            return (
              <motion.a
                key={card.title}
                href="#"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className={`group relative block border-b border-border/60 transition-colors duration-500 hover:bg-[rgba(4,128,144,0.02)]`}
              >
                <div className={`grid grid-cols-1 gap-6 px-2 py-10 lg:gap-12 lg:py-14 ${gridCols}`}>
                  {/* Title column with icon */}
                  <div className="flex items-start gap-5">
                    <Icon
                      className="mt-2 h-6 w-6 shrink-0 transition-transform duration-500 group-hover:scale-110"
                      strokeWidth={1.75}
                      style={{ color: "#698F3F" }}
                    />
                    <h3
                      className={`text-foreground leading-[1.05] tracking-tight transition-transform duration-500 ${
                        isRtl ? "group-hover:-translate-x-2" : "group-hover:translate-x-2"
                      }`}
                      style={{
                        fontFamily: '"Cairo", system-ui, sans-serif',
                        fontWeight: 900,
                        fontSize: "clamp(1.5rem, 2.4vw, 2.125rem)",
                      }}
                    >
                      {card.title}
                    </h3>
                  </div>

                  {/* Description column */}
                  <div
                    className={`flex flex-col justify-center transition-transform duration-500 ${
                      isRtl ? "group-hover:-translate-x-2" : "group-hover:translate-x-2"
                    }`}
                  >
                    <p
                      className="text-[15px] leading-[1.85]"
                      style={{
                        color: "#555555",
                        fontFamily: '"Cairo", system-ui, sans-serif',
                        fontWeight: 300,
                        letterSpacing: "0.015em",
                      }}
                    >
                      {card.desc}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                      {t.news.readMore}
                      <ArrowUpRight className={isRtl ? "h-3.5 w-3.5 -scale-x-100" : "h-3.5 w-3.5"} />
                    </span>
                  </div>
                </div>
              </motion.a>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-20 flex justify-center">
          <a
            href="#"
            className="group inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.55)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-12px_hsl(var(--primary)/0.7)]"
          >
            {t.communities.cta}
            <ArrowRight className={`h-4 w-4 transition-transform group-hover:translate-x-0.5 ${isRtl ? "-scale-x-100" : ""}`} />
          </a>
        </div>
      </div>
    </section>
  );
}
