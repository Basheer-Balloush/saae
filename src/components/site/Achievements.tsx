import { motion } from "framer-motion";
import { useLang } from "@/lib/i18n";

export function Achievements() {
  const { t } = useLang();
  return (
    <section id="achievements" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-6"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">{t.achievements.eyebrow}</p>
            <h2 className="mt-3 font-display text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-[56px]">
              {t.achievements.title}
            </h2>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground">{t.achievements.body}</p>
            <div className="mt-8 h-[3px] w-20 bg-gradient-brand" />
          </motion.div>

          <div className="lg:col-span-6">
            <div className="grid grid-cols-2 gap-4 sm:gap-5">
              {t.achievements.stats.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: i * 0.07 }}
                  className={
                    "group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-soft transition-shadow hover:shadow-lift sm:p-7" +
                    (i === 4 ? " col-span-2" : "")
                  }
                >
                  <div className="font-display text-4xl font-bold leading-none text-foreground sm:text-5xl">{s.value}</div>
                  <div className="mt-3 h-px w-10 bg-primary/60 transition-all group-hover:w-16" />
                  <div className="mt-3 text-sm font-semibold text-muted-foreground">{s.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
