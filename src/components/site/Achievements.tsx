import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useLang } from "@/lib/i18n";

export function Achievements() {
  const { t, dir } = useLang();
  const isRtl = dir === "rtl";

  // Masonry rhythm: long, short / short, long → X-pattern of visual weight
  const heights = [
    "min-h-[260px] lg:min-h-[300px]", // 0: 5,000+ learners (long)
    "min-h-[180px] lg:min-h-[200px]", // 1: 120+ courses (short)
    "min-h-[180px] lg:min-h-[200px]", // 2: 30+ partners (short)
    "min-h-[260px] lg:min-h-[300px]", // 3: 5,000+ students (long)
  ];

  return (
    <section
      id="achievements"
      className="relative overflow-hidden py-24 lg:py-32"
      style={{ backgroundColor: "#FFFFFF" }}
    >
      {/* Innovation accent */}
      <div
        className={`absolute top-8 ${isRtl ? "left-8" : "right-8"} flex flex-col items-center gap-2`}
        aria-hidden
      >
        <Plus className="h-4 w-4" strokeWidth={1.5} style={{ color: "#698F3F" }} />
        <span className="block h-10 w-px" style={{ backgroundColor: "#698F3F" }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-16">
          {/* Headline column — vertically centered to the stat grid */}
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

          {/* 2×2 masonry stat grid */}
          <div className="lg:col-span-7">
            <div
              className="grid grid-cols-1 sm:grid-cols-2"
              style={{ columnGap: "32px", rowGap: "40px" }}
            >
              {t.achievements.stats.slice(0, 4).map((s, i) => (
                <StatCard
                  key={s.label}
                  value={s.value}
                  label={s.label}
                  index={i}
                  heightClass={heights[i]}
                  isRtl={isRtl}
                />
              ))}
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
  heightClass,
  isRtl,
}: {
  value: string;
  label: string;
  index: number;
  heightClass: string;
  isRtl: boolean;
}) {
  const PADDING = 28; // px — controls both inner padding and divider width

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay: index * 0.07 }}
      className={`group relative flex flex-col justify-center overflow-hidden rounded-2xl ${heightClass}`}
      style={{
        backgroundColor: "#FBFBFB",
        padding: `${PADDING}px`,
      }}
    >
      <div className={`flex flex-col ${isRtl ? "items-end text-right" : "items-start text-left"}`}>
        <span
          className="block leading-none"
          style={{
            color: "#048090",
            fontFamily: '"Cairo", system-ui, sans-serif',
            fontWeight: 900,
            letterSpacing: "-0.03em",
            fontSize: "clamp(2.75rem, 5vw, 4rem)",
          }}
        >
          {value}
        </span>

        {/* Teal divider — spans the card's inner padding width */}
        <span
          aria-hidden
          className="mt-5 block h-[2px] w-full"
          style={{ backgroundColor: "#048090" }}
        />

        <span
          className="mt-5 block"
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
