import { motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowUp, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import React, { useRef } from "react";

export type MotionFooterLocale = "ar" | "en";

type FooterCopy = {
  eyebrow: string;
  title: string;
  body: string;
  primaryCta: string;
  assistantLabel: string;
  assistantSpeech: string;
  assistantStatus: string;
  features: string[];
  explore: string;
  programmes: string;
  location: string;
  copyright: string;
  backToTop: string;
  marquee: string[];
};

const COPY: Record<MotionFooterLocale, FooterCopy> = {
  ar: {
    eyebrow: "أهلاً، أنا أبو الجود",
    title: "اسأل أبو الجود",
    body: "إذا كان لديك أي سؤال عن الجمعية أو برامجها أو دوراتها أو مجتمعاتها، اسألني وسأساعدك على الوصول إلى الخطوة الأنسب.",
    primaryCta: "ابدأ الحديث مع أبو الجود",
    assistantLabel: "تحدّث مع أبو الجود",
    assistantSpeech: "كيف فيني ساعدك اليوم؟",
    assistantStatus: "متصل الآن",
    features: ["إجابات فورية", "اقتراحات مناسبة", "تواصل مع الفريق"],
    explore: "استكشف",
    programmes: "برامجنا",
    location: "دمشق، جانب وزارة التعليم العالي والبحث العلمي",
    copyright: "© 2026 الجمعية السورية للذكاء الاصطناعي وريادة الأعمال. جميع الحقوق محفوظة.",
    backToTop: "العودة إلى أعلى الصفحة",
    marquee: ["تعليم", "بحث", "ريادة أعمال", "مجتمعات", "شراكات", "أثر"],
  },
  en: {
    eyebrow: "Hello, I am Abu Al-Joud",
    title: "Ask Abu Al-Joud",
    body: "If you have questions about SAAE, its programmes, courses, or communities, ask me and I will guide you to the right next step.",
    primaryCta: "Chat with Abu Al-Joud",
    assistantLabel: "Talk to Abu Al-Joud",
    assistantSpeech: "How can I help you today?",
    assistantStatus: "Online now",
    features: ["Instant answers", "Tailored guidance", "Team connection"],
    explore: "Explore",
    programmes: "Programmes",
    location: "Damascus, beside the Ministry of Higher Education and Scientific Research",
    copyright: "© 2026 Syrian Association for AI & Entrepreneurship. All rights reserved.",
    backToTop: "Back to the top",
    marquee: ["Education", "Research", "Entrepreneurship", "Communities", "Partnerships", "Impact"],
  },
};

const LINKS = {
  explore: [
    { ar: "الرئيسية", en: "Home", href: "/" },
    { ar: "عن الجمعية", en: "About SAAE", href: "/about" },
    { ar: "آخر الأخبار", en: "News", href: "/news" },
    { ar: "شركاء النجاح", en: "Partners", href: "/partners" },
  ],
  programmes: [
    { ar: "منصة التعلم", en: "Learning platform", href: "/learning-management-system" },
    { ar: "مجتمعات الجمعية", en: "SAAE communities", href: "/#communities" },
    { ar: "مبادرة المليون", en: "Million-user initiative", href: "/one-million-initiative-home" },
    { ar: "التسجيل", en: "Registration", href: "/registration" },
  ],
};

type MagneticButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  reducedMotion: boolean;
};

function MagneticButton({
  reducedMotion,
  onPointerMove,
  onPointerLeave,
  ...props
}: MagneticButtonProps) {
  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    onPointerMove?.(event);
    if (reducedMotion || event.pointerType !== "mouse") return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left - rect.width / 2) * 0.16;
    const y = (event.clientY - rect.top - rect.height / 2) * 0.2;
    event.currentTarget.style.setProperty("--magnetic-x", `${x}px`);
    event.currentTarget.style.setProperty("--magnetic-y", `${y}px`);
  };

  const handlePointerLeave = (event: React.PointerEvent<HTMLButtonElement>) => {
    onPointerLeave?.(event);
    event.currentTarget.style.setProperty("--magnetic-x", "0px");
    event.currentTarget.style.setProperty("--magnetic-y", "0px");
  };

  return (
    <button {...props} onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave} />
  );
}

function SocialIcon({ network }: { network: "instagram" | "facebook" | "linkedin" }) {
  if (network === "instagram") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.2" cy="6.8" r="1.25" fill="currentColor" />
      </svg>
    );
  }

  if (network === "facebook") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.6c-.3-.04-1.3-.13-2.46-.13-2.44 0-4.11 1.49-4.11 4.22V9.9H7.4V13h2.73v8z"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.5 9H3.6v12h2.9zM5.05 3.6a1.68 1.68 0 1 0 0 3.36 1.68 1.68 0 0 0 0-3.36M20.4 21h-2.9v-5.83c0-1.39-.03-3.18-1.94-3.18-1.94 0-2.24 1.51-2.24 3.08V21h-2.9V9h2.78v1.64h.04a3.05 3.05 0 0 1 2.74-1.5c2.94 0 3.48 1.93 3.48 4.44z"
      />
    </svg>
  );
}

export function MotionFooter({ locale = "ar" }: { locale?: MotionFooterLocale }) {
  const revealRef = useRef<HTMLDivElement>(null);
  const isVisible = useInView(revealRef, { margin: "-18% 0px -18% 0px", amount: 0.12 });
  const prefersReducedMotion = Boolean(useReducedMotion());
  const copy = COPY[locale];

  const openAssistant = () => {
    window.dispatchEvent(new CustomEvent("assistant:open"));
  };

  const scrollToTop = () => {
    const scrollEngine = (
      window as Window & {
        saaeScroll?: { scrollTo: (target: number, options?: { duration?: number }) => void };
      }
    ).saaeScroll;

    if (scrollEngine) {
      scrollEngine.scrollTo(0, { duration: 1.1 });
      return;
    }
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  };

  const transition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.85, ease: [0.16, 1, 0.3, 1] as const };

  return (
    <div id="site-footer" ref={revealRef} className="hmf-reveal" data-motion-footer data-react-i18n>
      <footer className="hmf-footer" dir={locale === "ar" ? "rtl" : "ltr"}>
        <div className="hmf-circuit-grid" aria-hidden="true" />
        <div className="hmf-scan-line" aria-hidden="true" />

        <motion.div
          className="hmf-giant-word"
          aria-hidden="true"
          initial={false}
          animate={isVisible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 80, scale: 0.92 }}
          transition={transition}
        >
          SAAE
        </motion.div>

        <div className="hmf-marquee" aria-hidden="true">
          <div className="hmf-marquee-track">
            {[0, 1].map((group) => (
              <div className="hmf-marquee-group" key={group}>
                {copy.marquee.map((item) => (
                  <React.Fragment key={`${group}-${item}`}>
                    <span>{item}</span>
                    <i />
                  </React.Fragment>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="hmf-shell">
          <motion.div
            id="assistant-chatbot-section"
            className="hmf-assistant-intro"
            initial={false}
            animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
            transition={{ ...transition, delay: prefersReducedMotion ? 0 : 0.08 }}
          >
            <div className="hmf-assistant-copy">
              <p className="hmf-eyebrow">
                <span />
                {copy.eyebrow}
              </p>
              <h2>{copy.title}</h2>
              <p className="hmf-intro">{copy.body}</p>
              <div className="hmf-assistant-features" aria-label={copy.title}>
                {copy.features.map((feature) => (
                  <span key={feature}>
                    <i />
                    {feature}
                  </span>
                ))}
              </div>
              <div className="hmf-actions">
                <MagneticButton
                  type="button"
                  onClick={openAssistant}
                  className="hmf-action hmf-action-primary"
                  reducedMotion={prefersReducedMotion}
                >
                  <MessageCircle aria-hidden="true" />
                  <span>{copy.primaryCta}</span>
                </MagneticButton>
              </div>
            </div>

            <motion.button
              type="button"
              className="hmf-assistant-character"
              onClick={openAssistant}
              aria-label={copy.assistantLabel}
              initial={false}
              animate={
                isVisible
                  ? { opacity: 1, y: 0, rotate: 0, scale: 1 }
                  : { opacity: 0, y: 42, rotate: -2, scale: 0.94 }
              }
              whileHover={prefersReducedMotion ? undefined : { y: -8, rotate: 1.5 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
              transition={{ ...transition, delay: prefersReducedMotion ? 0 : 0.18 }}
            >
              <span className="hmf-character-halo" aria-hidden="true" />
              <img
                src="/cinematic/images/abu-al-joud-comic-welcome.webp"
                alt={copy.assistantLabel}
                width="480"
                height="720"
                draggable={false}
              />
              <span className="hmf-character-prompt">
                <MessageCircle aria-hidden="true" />
                {copy.assistantSpeech}
              </span>
            </motion.button>
          </motion.div>

          <motion.div
            className="hmf-information"
            initial={false}
            animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 36 }}
            transition={{ ...transition, delay: prefersReducedMotion ? 0 : 0.2 }}
          >
            <div className="hmf-identity">
              <img
                src={
                  locale === "ar"
                    ? "/cinematic/images/saae-logo-ar.png"
                    : "/cinematic/images/saae-logo-en.png"
                }
                alt={
                  locale === "ar"
                    ? "الجمعية السورية للذكاء الاصطناعي وريادة الأعمال"
                    : "Syrian Association for AI & Entrepreneurship"
                }
                width="500"
                height="170"
              />
              <div
                className="hmf-social"
                aria-label={locale === "ar" ? "حسابات الجمعية" : "SAAE social accounts"}
              >
                <a
                  href="https://www.instagram.com/saae_sy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                >
                  <SocialIcon network="instagram" />
                </a>
                <a
                  href="https://www.facebook.com/share/18SQ11hcct/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                >
                  <SocialIcon network="facebook" />
                </a>
                <a
                  href="https://www.linkedin.com/company/syrian-association-for-ai-entrepreneurship/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                >
                  <SocialIcon network="linkedin" />
                </a>
              </div>
            </div>

            <nav className="hmf-link-column" aria-label={copy.explore}>
              <h3>{copy.explore}</h3>
              {LINKS.explore.map((link) => (
                <a href={link.href} key={link.href}>
                  {link[locale]}
                </a>
              ))}
            </nav>

            <nav className="hmf-link-column" aria-label={copy.programmes}>
              <h3>{copy.programmes}</h3>
              {LINKS.programmes.map((link) => (
                <a href={link.href} key={link.href}>
                  {link[locale]}
                </a>
              ))}
            </nav>

            <address className="hmf-contact">
              <a
                href="https://maps.app.goo.gl/bKMSHXkmkr5U3tZh6"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPin aria-hidden="true" />
                <span>{copy.location}</span>
              </a>
              <a href="mailto:info@aisyria.org">
                <Mail aria-hidden="true" />
                <span>info@aisyria.org</span>
              </a>
              <a href="tel:+963930763547" dir="ltr">
                <Phone aria-hidden="true" />
                <span>+963 930 763 547</span>
              </a>
            </address>
          </motion.div>

          <div className="hmf-bottom">
            <p>{copy.copyright}</p>
            <button
              type="button"
              onClick={scrollToTop}
              aria-label={copy.backToTop}
              title={copy.backToTop}
            >
              <ArrowUp aria-hidden="true" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
