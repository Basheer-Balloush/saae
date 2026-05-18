import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, GraduationCap } from "lucide-react";
import { useLang } from "@/lib/i18n";

export function LmsCta() {
  const { dir } = useLang();
  const isRtl = dir === "rtl";

  const copy = isRtl
    ? {
        eyebrow: "منصّة التعلّم",
        title: "تعلّم. ابنِ. انطلق.",
        body: "ادخل إلى منصّة التعلّم الخاصّة بالجمعية واكتشف مساراتٍ تعليميّةً في الذكاء الاصطناعي وريادة الأعمال، مصمَّمةً لتأهيل الجيل القادم من المبتكرين السوريين.",
        cta: "ادخل إلى المنصّة",
      }
    : {
        eyebrow: "Learning Platform",
        title: "Learn. Build. Launch.",
        body: "Step into SAAE's learning platform and explore curated tracks in AI and entrepreneurship, designed to empower the next generation of Syrian innovators.",
        cta: "Enter the platform",
      };

  const Arrow = isRtl ? ArrowLeft : ArrowRight;

  return (
    <section
      id="lms"
      className="relative overflow-hidden bg-background py-24 lg:py-32"
    >
      <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="relative overflow-hidden rounded-3xl"
          style={{
            background:
              "linear-gradient(135deg, #048090 0%, #036774 55%, #02525d 100%)",
          }}
        >
          {/* Decorative orbs */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-30 blur-3xl"
            style={{ background: "radial-gradient(circle, #7fe7d8 0%, transparent 70%)" }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full opacity-20 blur-3xl"
            style={{ background: "radial-gradient(circle, #ffffff 0%, transparent 70%)" }}
          />

          <div
            className={`relative grid items-center gap-10 px-8 py-14 lg:grid-cols-12 lg:gap-12 lg:px-16 lg:py-20 ${
              isRtl ? "text-right" : "text-left"
            }`}
          >
            <div className="lg:col-span-8">
              <div
                className={`inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 backdrop-blur ${
                  isRtl ? "flex-row-reverse" : ""
                }`}
              >
                <GraduationCap className="h-4 w-4 text-white" />
                <span
                  className="text-xs uppercase tracking-[0.18em] text-white/90"
                  style={{ fontFamily: '"Cairo", system-ui, sans-serif', fontWeight: 600 }}
                >
                  {copy.eyebrow}
                </span>
              </div>

              <h2
                className="mt-6 text-display-1 text-white"
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
                className="mt-6 max-w-2xl text-body text-white/85"
                style={{ fontFamily: '"Cairo", system-ui, sans-serif' }}
              >
                {copy.body}
              </p>

              <div className="mt-6 h-[3px] w-20 bg-white/70" />
            </div>

            <div
              className={`lg:col-span-4 flex ${
                isRtl ? "lg:justify-start" : "lg:justify-end"
              }`}
            >
              <a
                href="https://lms.aisyria.org"
                target="_blank"
                rel="noopener noreferrer"
                className={`group inline-flex items-center gap-3 rounded-full bg-white px-8 py-4 text-base font-semibold text-[#02525d] shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-2xl ${
                  isRtl ? "flex-row-reverse" : ""
                }`}
                style={{ fontFamily: '"Cairo", system-ui, sans-serif', fontWeight: 700 }}
              >
                {copy.cta}
                <Arrow
                  className={`h-5 w-5 transition-transform ${
                    isRtl ? "group-hover:-translate-x-1" : "group-hover:translate-x-1"
                  }`}
                />
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
