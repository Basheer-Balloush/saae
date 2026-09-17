import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
} from "framer-motion";

import { usePortalTarget } from "@/hooks/usePortalTarget";
import { IPhoneMockup } from "@/components/ui/iphone-mockup";
import {
  ContainerScroll,
  useContainerScrollProgress,
} from "@/components/ui/container-scroll-animation";
import { FAQS, FAQ_COPY, type Locale } from "./mobile-home-content";
import "./homepage-partners.css";

function pick<T extends { ar: string; en: string }>(text: T, lang: Locale) {
  return lang === "ar" ? text.ar : text.en;
}

function sequenceIndex(progress: number) {
  const readingProgress = Math.max(0, (progress - 0.86) / 0.14) * FAQS.length;
  const index = Math.min(FAQS.length - 1, Math.floor(readingProgress));
  if (index < FAQS.length - 1 && readingProgress - index >= 0.75) return -1;
  return index;
}

function FaqSequence({ lang }: { lang: Locale }) {
  const parentProgress = useContainerScrollProgress();
  const fallbackProgress = useMotionValue(0);
  const progress = parentProgress ?? fallbackProgress;
  const reducedMotion = useReducedMotion();
  const [activeFaq, setActiveFaq] = useState(0);

  useMotionValueEvent(progress, "change", (value) => {
    const next = sequenceIndex(value);
    setActiveFaq((current) => (current === next ? current : next));
  });

  return (
    <ul className="faq-list" dir={lang === "ar" ? "rtl" : "ltr"}>
      <AnimatePresence mode="wait" initial={false}>
        {FAQS.map((faq, index) => {
          if (!reducedMotion && activeFaq !== index) return null;
          return (
            <motion.li
              key={pick(faq.question, lang)}
              className="faq-item is-open is-active"
              initial={reducedMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: reducedMotion ? 0 : 0.7, ease: "easeInOut" }}
            >
              <h3 className="faq-heading">
                <span className="faq-trigger">
                  <span className="faq-num" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="faq-question">{pick(faq.question, lang)}</span>
                </span>
              </h3>
              <div className="faq-answer" id={`faq-scroll-answer-${index}`} role="region">
                <div className="faq-answer-inner">
                  <p>
                    {pick(faq.answer, lang)}
                    {faq.answerLink ? (
                      <>
                        {" "}
                        <a href={faq.answerLink.href}>{pick(faq.answerLink.text, lang)}</a>.
                      </>
                    ) : null}
                  </p>
                </div>
              </div>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}

export function DesktopFaqScroll() {
  const target = usePortalTarget("#faq-scroll-root");
  const [lang, setLang] = useState<Locale>("ar");

  useEffect(() => {
    const sync = () => setLang(document.documentElement.lang === "en" ? "en" : "ar");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, []);

  if (!target) return null;

  return createPortal(
    <ContainerScroll
      className="hp-faq-scroll"
      cardClassName="hp-faq-scroll-card"
      layout="split"
      introHeight={1800}
      titleComponent={
        <div className="faq-intro" dir={lang === "ar" ? "rtl" : "ltr"}>
          <h2 id="faq-title-scroll" className="photo-head">
            {pick(FAQ_COPY.title, lang)}
          </h2>
        </div>
      }
    >
      <IPhoneMockup
        model="15-pro"
        islandTop={20}
        color="#163a43"
        screenBg="#061820"
        className="hp-faq-device"
        style={{ width: "100%" }}
        frameStyle={{
          width: "100%",
          height: "auto",
          aspectRatio: "420 / 720",
          border: "1px solid rgba(114, 214, 223, .55)",
        }}
        screenStyle={{ position: "absolute", inset: 12, width: "auto", height: "auto" }}
        safeAreaOverrides={{ left: 16, right: 16 }}
        shadow="0 18px 42px rgba(0, 0, 0, .35), 0 0 30px rgba(0, 139, 157, .16)"
      >
        <FaqSequence lang={lang} />
      </IPhoneMockup>
    </ContainerScroll>,
    target,
  );
}
