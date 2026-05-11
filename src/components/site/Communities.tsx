import { motion } from "framer-motion";
import { Database, Building2, Stethoscope, Rocket, FlaskConical, Code2, TrendingUp, ArrowRight, ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";
import type { CommunityKey } from "@/lib/communityCategories";

export function Communities() {
  const { t, dir, lang } = useLang();
  const c = t.communities.cards;
  const cards: Array<{ icon: typeof Database; title: string; desc: string; key: CommunityKey }> = [
    { icon: Database, ...c.data, key: "data" },
    { icon: Building2, ...c.architecture, key: "architecture" },
    { icon: Stethoscope, ...c.medical, key: "medical" },
    { icon: Rocket, ...c.entrepreneurship, key: "entrepreneurship" },
    { icon: FlaskConical, ...c.research, key: "research" },
    { icon: Code2, ...c.software, key: "software" },
    { icon: TrendingUp, ...c.economy, key: "economy" },
  ];

  const isRtl = dir === "rtl";

  return (
    <section id="communities" className="relative overflow-hidden bg-surface pb-28 pt-16 lg:pb-36 lg:pt-20">
      <div className="relative mx-auto max-w-5xl px-6 sm:px-10 lg:px-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          
          <h2
            className="mt-4 text-display-2 leading-[1.4] tracking-tight text-foreground"
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
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              >
              <Link
                to="/communities/$key"
                params={{ key: card.key }}
                className={`group relative block border-b border-border/60 transition-colors duration-500 hover:bg-[rgba(4,128,144,0.02)]`}
              >
                <div className="grid grid-cols-1 gap-6 px-2 py-10 lg:grid-cols-[40px_350px_1fr] lg:gap-x-12 lg:py-14">
                  {/* Icon column (fixed 40px) */}
                  <div className="hidden lg:flex items-start justify-center pt-2">
                    <Icon
                      className="h-6 w-6 shrink-0 transition-transform duration-500 group-hover:scale-110"
                      strokeWidth={1.75}
                      style={{ color: "#698F3F" }}
                    />
                  </div>

                  {/* Title column (fixed 350px on lg) */}
                  <div className="flex items-start gap-4 lg:gap-0">
                    <Icon
                      className="mt-2 h-6 w-6 shrink-0 transition-transform duration-500 group-hover:scale-110 lg:hidden"
                      strokeWidth={1.75}
                      style={{ color: "#698F3F" }}
                    />
                    <h3
                      className={`text-foreground leading-[1.35] tracking-tight transition-transform duration-500 ${
                        isRtl ? "text-right group-hover:-translate-x-2" : "text-left group-hover:translate-x-2"
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
                    className={`flex flex-col items-start transition-transform duration-500 ${
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
                      {lang === "ar" ? "اكتشف المجتمع" : "Discover community"}
                      <ArrowUpRight className={isRtl ? "h-3.5 w-3.5 -scale-x-100" : "h-3.5 w-3.5"} />
                    </span>
                  </div>
                </div>
              </motion.a>
            );
          })}
        </div>

      </div>
    </section>
  );
}
