import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useLang } from "@/lib/i18n";

export function InitiativeCta() {
  const { dir } = useLang();
  const isRtl = dir === "rtl";

  const copy = isRtl
    ? {
        eyebrow: "مبادرة وطنية",
        title: "مليون مستخدم ذكاء اصطناعي سوري",
        body: "مبادرة وطنية لمحو الأمية في الذكاء الاصطناعي وتمكين مليون سوري من أدوات المستقبل عبر تدريب معتمد وشفاف على كامل الجغرافيا السورية.",
        cta: "اكتشف المبادرة",
      }
    : {
        eyebrow: "National Initiative",
        title: "One Million Syrian AI Users",
        body: "A national initiative to eradicate AI illiteracy and empower one million Syrians with future-ready tools through accredited, transparent training across Syria.",
        cta: "Explore the initiative",
      };

  const Arrow = ArrowRight;

  return (
    <section id="initiative" className="relative bg-muted/30 py-10 lg:py-14">
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
          <div className="shrink-0">
            <a
              href="/one-million-initiative"
              className={`group inline-flex items-center gap-3 rounded-full bg-secondary px-7 py-3.5 text-base font-semibold text-secondary-foreground transition-all hover:-translate-y-0.5 ${
                isRtl ? "flex-row-reverse" : ""
              }`}
            >
              {copy.cta}
              <Arrow
                className={`h-4 w-4 transition-transform ${
                  isRtl ? "group-hover:-translate-x-1" : "group-hover:translate-x-1"
                }`}
              />
            </a>
          </div>

          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-4 py-1.5 text-xs font-semibold text-secondary">
              <Sparkles className="h-3.5 w-3.5" />
              {copy.eyebrow}
            </div>

            <h2 className="mt-4 text-display-2 text-foreground">
              {copy.title}
            </h2>

            <p className="mt-5 text-body text-muted-foreground">
              {copy.body}
            </p>

            <div className="mt-6 h-[2px] w-16 bg-secondary" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

