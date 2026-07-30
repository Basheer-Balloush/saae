import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useLang } from "@/lib/i18n";

export function LmsCta() {
  const { dir } = useLang();
  const isRtl = dir === "rtl";

  const copy = isRtl
    ? {
        eyebrow: "منصّة التدريب والتعلّم",
        title: "منصة الجمعية التعليمية",
        body: "منصة تعليمية متكاملة توفّر مسارات تدريبيّة متنوعة لتأهيل الكوادر السورية وتطوير مهاراتهم المهنية والتقنية.",
        cta: "ادخل إلى المنصّة",
      }
    : {
        eyebrow: "Training and Learning Platform",
        title: "SAAE Training and Learning Platform",
        body: "A comprehensive learning platform offering diverse training paths to develop Syrian talent and build professional and technical skills.",
        cta: "Enter the platform",
      };

  const Arrow = ArrowRight;

  return (
    <section id="lms" className="relative bg-background py-10 lg:py-14">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className={`flex flex-col gap-6 py-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:py-8 ${
            isRtl ? "lg:flex-row-reverse text-right" : "text-left"
          }`}
        >
          <div className="max-w-2xl">
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
              href="/learning-management-system/campaign"
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
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
              />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
