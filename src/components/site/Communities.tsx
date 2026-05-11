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

  // Editorial alternating rhythm on lg: 3 cards (col-span-2) / 2 cards (col-span-3) / 2 cards (col-span-3)
  const spans = ["lg:col-span-2", "lg:col-span-2", "lg:col-span-2", "lg:col-span-3", "lg:col-span-3", "lg:col-span-3", "lg:col-span-3"];

  return (
    <section id="communities" className="relative overflow-hidden bg-surface py-28 lg:py-36">
      {/* Faint architectural grid pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="text-caption text-primary">{t.communities.eyebrow}</p>
          <h2 className="mt-4 text-display-2 leading-[1.1] tracking-tight text-foreground">
            {t.communities.title}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-body leading-relaxed text-muted-foreground">
            {t.communities.subtitle}
          </p>
        </motion.div>

        <div className="mt-20 grid gap-8 sm:grid-cols-2 lg:grid-cols-6 lg:gap-10">
          {cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.a
                key={card.title}
                href="#"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.55, delay: i * 0.05 }}
                className={`group relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-[0_24px_60px_-20px_hsl(var(--foreground)/0.12)] lg:p-9 ${spans[i] ?? ""}`}
              >
                <Icon className="h-7 w-7 text-secondary" strokeWidth={1.75} />

                <h3
                  className="mt-7 font-bold leading-snug tracking-tight text-foreground text-[1.0625rem] lg:text-lg"
                  style={{ fontFamily: '"Cairo", system-ui, sans-serif' }}
                >
                  {card.title}
                </h3>

                <p className="mt-3 text-[13.5px] text-muted-foreground" style={{ lineHeight: 1.7 }}>
                  {card.desc}
                </p>

                <span className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-primary opacity-0 transition-all duration-300 group-hover:opacity-100">
                  {t.news.readMore}
                  <ArrowUpRight className={dir === "rtl" ? "h-3.5 w-3.5 -scale-x-100" : "h-3.5 w-3.5"} />
                </span>
              </motion.a>
            );
          })}
        </div>

        <div className="mt-20 flex justify-center">
          <a
            href="#"
            className="group inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.55)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-12px_hsl(var(--primary)/0.7)]"
          >
            {t.communities.cta}
            <ArrowRight className={`h-4 w-4 transition-transform group-hover:translate-x-0.5 ${dir === "rtl" ? "-scale-x-100" : ""}`} />
          </a>
        </div>
      </div>
    </section>
  );
}
