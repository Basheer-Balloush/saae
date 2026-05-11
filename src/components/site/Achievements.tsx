import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useLang } from "@/lib/i18n";

export function Achievements() {
  const { t, dir } = useLang();
  const isRtl = dir === "rtl";

  // Staggered masonry: alternate vertical offset and varied widths
  // Layout pattern for 5 stats: [wide, narrow] / [narrow, wide] / [full]
  const cardLayout = [
    { colSpan: "col-span-7", offset: "lg:-translate-y-4" }, // 5,000+ (wider, up)
    { colSpan: "col-span-5", offset: "lg:translate-y-10" }, // 120 (narrower, down 40px)
    { colSpan: "col-span-5", offset: "lg:-translate-y-2" }, // 30 (up)
    { colSpan: "col-span-7", offset: "lg:translate-y-10" }, // 15 (down 40px)
    { colSpan: "col-span-12", offset: "" },                  // 50 workshops (full)
  ];

  return (
    <section
      id="achievements"
      className="relative overflow-hidden py-24 lg:py-32"
      style={{ backgroundColor: "#FFFFFF" }}
    >
      {/* Geometric corner accents */}
      <Plus
        className="absolute left-6 top-6 h-4 w-4 text-foreground/20"
        strokeWidth={1.25}
        aria-hidden
      />
      <Plus
        className="absolute right-6 top-6 h-4 w-4 text-foreground/20"
        strokeWidth={1.25}
        aria-hidden
      />
      <Plus
        className="absolute bottom-6 left-6 h-4 w-4 text-foreground/20"
        strokeWidth={1.25}
        aria-hidden
      />
      <Plus
        className="absolute bottom-6 right-6 h-4 w-4 text-foreground/20"
        strokeWidth={1.25}
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-6"
          >
            <p className="text-caption text-primary">{t.achievements.eyebrow}</p>
            <h2
              className="mt-4 text-display-1 text-foreground"
              style={{
                fontFamily: '"Cairo", system-ui, sans-serif',
                fontWeight: 900,
                lineHeight: 1.02,
                letterSpacing: "-0.02em",
              }}
            >
              {t.achievements.title}
            </h2>
            <p className="mt-6 max-w-lg text-body text-muted-foreground">
              {t.achievements.body}
            </p>
            <div className="mt-8 h-[3px] w-20 bg-gradient-brand" />
          </motion.div>

          <div className="lg:col-span-6">
            <div className="grid grid-cols-12 gap-4 sm:gap-5">
              {t.achievements.stats.map((s, i) => {
                const layout = cardLayout[i] ?? cardLayout[cardLayout.length - 1];
                return (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.55, delay: i * 0.07 }}
                    className={`group relative overflow-hidden rounded-2xl p-6 transition-transform duration-500 sm:p-7 ${layout.colSpan} ${layout.offset}`}
                    style={{ backgroundColor: "#F9F9F9" }}
                  >
                    <div
                      className={`inline-flex flex-col ${isRtl ? "items-end" : "items-start"}`}
                    >
                      <span
                        className="text-h1 leading-none"
                        style={{
                          color: "#048090",
                          fontFamily: '"Cairo", system-ui, sans-serif',
                          fontWeight: 900,
                          letterSpacing: "-0.03em",
                        }}
                      >
                        {s.value}
                      </span>
                      <span
                        className="mt-2 block h-[2px] w-full transition-all duration-500 group-hover:opacity-80"
                        style={{ backgroundColor: "#048090" }}
                      />
                    </div>
                    <div
                      className={`mt-3 text-sm font-semibold text-muted-foreground ${
                        isRtl ? "text-right" : "text-left"
                      }`}
                    >
                      {s.label}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
