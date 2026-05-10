import { motion } from "framer-motion";
import { Sparkles, Stethoscope, GraduationCap, FlaskConical, Rocket, Bot, ArrowRight } from "lucide-react";
import { useLang } from "@/lib/i18n";

export function Communities() {
  const { t, dir } = useLang();
  const c = t.communities.cards;
  const cards = [
    { icon: Sparkles, ...c.women },
    { icon: Stethoscope, ...c.health },
    { icon: GraduationCap, ...c.education },
    { icon: FlaskConical, ...c.research },
    { icon: Rocket, ...c.entrepreneurship },
    { icon: Bot, ...c.robotics },
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
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">{t.communities.eyebrow}</p>
          <h2 className="mt-3 font-display text-3xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {t.communities.title}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">{t.communities.subtitle}</p>
        </motion.div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-soft transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lift"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-6 text-lg font-bold text-foreground">{card.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{card.desc}</p>
              </motion.div>
            );
          })}
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
