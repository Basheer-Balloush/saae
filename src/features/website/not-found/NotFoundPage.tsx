import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLang } from "@/lib/i18n/i18n";
import { ABU_AL_JOUD } from "@/features/chat/lib/mascot";
import MotionButton from "@/features/website/motion/motion-button";
import { MobileRadialNav } from "@/features/website/home/MobileRadialNav";
import "./not-found.css";

const COPY = {
  en: {
    error: "PAGE NOT FOUND",
    name: "Abu Al-Joud",
    title: "Looks like we took a wrong turn!",
    note: "The page you're looking for has moved or doesn't exist. No worries—I'll help you find your way back.",
    home: "Back to home",
    chat: "Ask Abu Al-Joud",
    footer: "Syrian Association for AI & Entrepreneurship. All rights reserved",
  },
  ar: {
    error: "الصفحة غير موجودة",
    name: "أبو الجود",
    title: "يبدو أننا أخذنا منعطفاً خاطئاً!",
    note: "الصفحة التي تبحث عنها انتقلت أو لم تعد موجودة. ولا يهمك، أنا هون لأساعدك ترجع للطريق الصحيح.",
    home: "العودة للرئيسية",
    chat: "اسأل أبو الجود",
    footer: "الجمعية السورية للذكاء الاصطناعي وريادة الأعمال. جميع الحقوق محفوظة",
  },
} as const;

export function NotFoundPage() {
  const { lang, dir, toggle } = useLang();
  const reduce = Boolean(useReducedMotion());
  const copy = COPY[lang];

  useEffect(() => {
    const previous = document.title;
    document.title = lang === "ar" ? "الصفحة غير موجودة — SAAE" : "Page not found — SAAE";
    document.documentElement.classList.add("nf-active");
    return () => {
      document.title = previous;
      document.documentElement.classList.remove("nf-active");
    };
  }, [lang]);

  const openAssistant = () => window.dispatchEvent(new CustomEvent("assistant:open"));

  return (
    <main className="nf-page" dir={dir}>
      <link rel="stylesheet" href="/cinematic/css/navigation.css" precedence="default" />
      <div className="nf-background" aria-hidden="true">
        <span />
        <span />
      </div>
      <header className="nf-header">
        <MobileRadialNav lang={lang} onToggleLang={toggle} homeHref="/#hero-sec" />
      </header>

      <section className="nf-scene" aria-labelledby="nf-error-title">
        <motion.div
          className="nf-error-heading"
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1
            className="nf-number"
            id="nf-error-title"
            aria-label={`404 — ${copy.error}`}
            dir="ltr"
          >
            404
          </h1>
        </motion.div>

        <motion.div
          className="nf-conversation"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: reduce ? 0 : 0.1 }}
        >
          <motion.button
            className="nf-character"
            type="button"
            aria-label={copy.chat}
            onClick={openAssistant}
            animate={reduce ? undefined : { y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="nf-character-halo" aria-hidden="true" />
            <img
              src={ABU_AL_JOUD.think}
              alt={copy.name}
              width="480"
              height="720"
              draggable={false}
            />
          </motion.button>

          <div className="nf-context">
            <h2>{copy.title}</h2>
            <p className="nf-note">{copy.note}</p>
            <div className="nf-actions">
              <MotionButton label={copy.home} href="/" classes="nf-primary" />
            </div>
          </div>
        </motion.div>
      </section>

      <footer className="nf-footer">
        <span>
          {copy.footer}{" "}
          <bdi dir="ltr">
            <sup>©</sup> 2026
          </bdi>
          .
        </span>
      </footer>
    </main>
  );
}
