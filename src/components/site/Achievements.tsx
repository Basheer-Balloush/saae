import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useLang } from "@/lib/i18n";

export function Achievements() {
  const { t, dir } = useLang();
  const isRtl = dir === "rtl";

  // Per-card sizing: 5,000+ cards are taller; "7" card is minimal.
  // Stagger: right column shifts down by 60px on large screens.
  const cardConfig = [
    { minHeight: "lg:min-h-[220px]", column: "left" },  // 5,000+ learners (taller)
    { minHeight: "lg:min-h-[170px]", column: "right" }, // 120+ courses
    { minHeight: "lg:min-h-[170px]", column: "left" },  // 30+ partners
    { minHeight: "lg:min-h-[140px]", column: "right" }, // 7 communities (smallest)
    { minHeight: "lg:min-h-[220px]", column: "left" },  // 5,000+ students (taller)
  ];

  return (
    <section
      id="achievements"
      className="relative overflow-hidden py-24 lg:py-32"
      style={{ backgroundColor: "#FFFFFF" }}
    >
      {/* Innovation accent — top-right (top-left in RTL since mirrored visually) */}
      <div
        className={`absolute top-8 ${isRtl ? "left-8" : "right-8"} flex flex-col items-center gap-2`}
        aria-hidden
      >
        <Plus className="h-4 w-4" strokeWidth={1.5} style={{ color: "#698F3F" }} />
        <span className="block h-10 w-px" style={{ backgroundColor: "#698F3F" }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-16">
          {/* Headline column — vertically centered to grid */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-5"
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

          {/* Bento-editorial 2-column staggered grid */}
          <div className="lg:col-span-7">
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ columnGap: "32px", rowGap: "32px" }}>
              {/* Left column */}
              <div className="flex flex-col" style={{ gap: "32px" }}>
                {t.achievements.stats
                  .map((s, i) => ({ s, i, cfg: cardConfig[i] }))
                  .filter(({ cfg }) => cfg.column === "left")
                  .map(({ s, i, cfg }) => (
                    <StatCard key={s.label} value={s.value} label={s.label} index={i} minHeight={cfg.minHeight} isRtl={isRtl} />
                  ))}
              </div>

              {/* Right column — offset down 60px on lg */}
              <div className="flex flex-col lg:translate-y-[60px]" style={{ gap: "32px" }}>
                {t.achievements.stats
                  .map((s, i) => ({ s, i, cfg: cardConfig[i] }))
                  .filter(({ cfg }) => cfg.column === "right")
                  .map(({ s, i, cfg }) => (
                    <StatCard key={s.label} value={s.value} label={s.label} index={i} minHeight={cfg.minHeight} isRtl={isRtl} />
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCard({
  value,
  label,
  index,
  minHeight,
  isRtl,
}: {
  value: string;
  label: string;
  index: number;
  minHeight: string;
  isRtl: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay: index * 0.07 }}
      className={`group relative flex flex-col justify-center overflow-hidden rounded-2xl p-7 sm:p-8 ${minHeight}`}
      style={{
        backgroundColor: "rgba(255,255,255,0.95)",
        border: "1px solid #F2F2F2",
        backdropFilter: "blur(6px)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
      }}
    >
      <div className={`flex flex-col ${isRtl ? "items-end" : "items-start"}`}>
        {/* Number with underline that extends 20px beyond */}
        <div className="relative inline-block">
          <span
            className="block leading-none"
            style={{
              color: "#048090",
              fontFamily: '"Cairo", system-ui, sans-serif',
              fontWeight: 900,
              letterSpacing: "-0.03em",
              fontSize: "clamp(2.5rem, 4.5vw, 3.75rem)",
            }}
          >
            {value}
          </span>
          <span
            aria-hidden
            className="absolute block h-[2px]"
            style={{
              backgroundColor: "#048090",
              bottom: "-10px",
              left: isRtl ? "-20px" : 0,
              right: isRtl ? 0 : "-20px",
            }}
          />
        </div>

        {/* Label — start-aligned flush with the number */}
        <span
          className={`mt-6 ${isRtl ? "text-right" : "text-left"}`}
          style={{
            color: "#666666",
            fontFamily: '"Cairo", system-ui, sans-serif',
            fontWeight: 400,
            fontSize: "14px",
            letterSpacing: "0.01em",
          }}
        >
          {label}
        </span>
      </div>
    </motion.div>
  );
}
