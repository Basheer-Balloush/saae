import { motion } from "framer-motion";
import { Database, Building2, Stethoscope, Rocket, FlaskConical, Code2, TrendingUp, ArrowRight } from "lucide-react";
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

  return (
    <section id="communities" className="relative bg-surface py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl"
        >
          <p className="text-caption text-primary">{t.communities.eyebrow}</p>
          <h2 className="mt-4 text-display-2 text-foreground">
            {t.communities.title}
          </h2>
          <p className="mt-5 text-body text-muted-foreground">{t.communities.subtitle}</p>
        </motion.div>

        <div className="relative mt-14 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <div className="flex w-max animate-[marquee-communities_60s_linear_infinite] gap-5 hover:[animation-play-state:paused]">
            {[...cards, ...cards].map((card, i) => {
              const Icon = card.icon;
              return (
                <div
                  key={i}
                  className="group relative w-[320px] flex-none overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-soft transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lift"
                >
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-6 text-lg font-bold text-foreground">{card.title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{card.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-14 flex justify-center">
          <a
            href="#"
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-7 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
          >
            {t.communities.cta}
            <ArrowRight className={dir === "rtl" ? "h-4 w-4 -scale-x-100" : "h-4 w-4"} />
          </a>
        </div>
      </div>
    </section>
  );
}
