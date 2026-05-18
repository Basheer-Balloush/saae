import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { useLang } from "@/lib/i18n";

export function LmsCta() {
  const { dir } = useLang();
  const isRtl = dir === "rtl";

  const copy = isRtl
    ? {
        eyebrow: "منصّة التعلّم",
        title: "تعلّم. ابنِ. انطلق.",
        body: "ادخل إلى منصّة التعلّم الخاصّة بالجمعية واكتشف مساراتٍ تعليميّةً في الذكاء الاصطناعي وريادة الأعمال.",
        cta: "ادخل إلى المنصّة",
      }
    : {
        eyebrow: "Learning Platform",
        title: "Learn. Build. Launch.",
        body: "Step into SAAE's learning platform and explore curated tracks in AI and entrepreneurship.",
        cta: "Enter the platform",
      };

  const Arrow = isRtl ? ArrowLeft : ArrowRight;

  return (
    <section id="lms" className="relative bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className={`flex flex-col gap-10 border-y border-border/60 py-14 lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:py-16 ${
            isRtl ? "lg:flex-row-reverse text-right" : "text-left"
          }`}
        >
          <div className="max-w-2xl">
            <span
              className="text-xs uppercase tracking-[0.22em]"
              style={{
                color: "#048090",
                fontFamily: '"Cairo", system-ui, sans-serif',
                fontWeight: 600,
              }}
            >
              {copy.eyebrow}
            </span>

            <h2
              className="mt-4 text-display-2 text-foreground"
              style={{
                fontFamily: '"Cairo", system-ui, sans-serif',
                fontWeight: 900,
                lineHeight: isRtl ? 1.4 : 1.05,
                letterSpacing: "-0.02em",
              }}
            >
              {copy.title}
            </h2>

            <p
              className="mt-5 text-body text-muted-foreground"
              style={{ fontFamily: '"Cairo", system-ui, sans-serif' }}
            >
              {copy.body}
            </p>

            <div
              className="mt-6 h-[2px] w-16"
              style={{ backgroundColor: "#048090" }}
            />
          </div>

          <div className="shrink-0">
            <a
              href="https://lms.aisyria.org"
              target="_blank"
              rel="noopener noreferrer"
              className={`group inline-flex items-center gap-3 rounded-full px-7 py-3.5 text-base transition-all hover:-translate-y-0.5 ${
                isRtl ? "flex-row-reverse" : ""
              }`}
              style={{
                backgroundColor: "#048090",
                color: "#ffffff",
                fontFamily: '"Cairo", system-ui, sans-serif',
                fontWeight: 700,
              }}
            >
              {copy.cta}
              <Arrow
                className={`h-4 w-4 transition-transform ${
                  isRtl ? "group-hover:-translate-x-1" : "group-hover:translate-x-1"
                }`}
              />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
