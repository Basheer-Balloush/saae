import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePortalTarget } from "@/hooks/usePortalTarget";
import "./desktop-section-guide.css";
import {
  SECTION_COMIC_IMAGES,
  SECTION_COPY,
  SHARED,
  type GuideContext,
  type GuideCopy,
  type Locale,
} from "./section-guide-copy";

type CommunityCopy = {
  body: string;
  title: string;
};

const HERO_COPY: Record<Locale, GuideCopy[]> = {
  ar: [
    {
      ...SHARED.ar,
      section: "01 / البداية",
      greeting: "أهلاً، أنا أبو الجود. سأرافقك في هذه الرحلة.",
      title: "ذكاء وريادة لوطن ينهض",
      body: "نبدأ من رؤية الجمعية: معرفة وتقنية وريادة أعمال تتحول إلى قدرة عملية تبني مستقبل سورية.",
      speech: "لنبدأ رحلتنا معاً",
      prefill: "عرّفني على الجمعية ورؤيتها",
    },
    {
      ...SHARED.ar,
      section: "02 / مجتمعات الجمعية",
      greeting: "هنا تبدأ جذور المعرفة والتخصص.",
      title: "تسعة مجتمعات، أساس واحد",
      body: "تجمع مجتمعاتنا الخبراء والمهتمين في البيانات والصحة والمدن والبرمجيات وغيرها، ليعمل كل تخصص ضمن شبكة واحدة.",
      speech: "تعرّف إلى مجتمعاتنا",
      prefill: "ما هي مجتمعات الجمعية التسعة؟",
    },
    {
      ...SHARED.ar,
      section: "03 / المنصة التعليمية",
      greeting: "ومن هذه الجذور ينمو التعلّم.",
      title: "تعلّم ينمو من مجتمعاتنا",
      body: "مسارات ودورات تدريبية معتمدة تنقل المعرفة من الفكرة إلى مهارات مهنية وتقنية قابلة للتطبيق.",
      speech: "اكتشف مسارات التعلّم",
      prefill: "أخبرني عن منصة التعلّم ودورات الجمعية",
    },
    {
      ...SHARED.ar,
      section: "04 / إنجازات الجمعية",
      greeting: "الأثر يظهر في الأرقام والناس.",
      title: "مجتمع يتجاوز 5,000 متعلم",
      body: "أكثر من 120 دورة، وثلاثون شريكاً استراتيجياً، وتسعة مجتمعات تعمل معاً لتوسيع أثر المعرفة.",
      speech: "هذه بعض إنجازاتنا",
      prefill: "أخبرني أكثر عن إنجازات الجمعية",
    },
    {
      ...SHARED.ar,
      section: "05 / مبادرة المليون",
      greeting: "وهنا تتحول الرؤية إلى خطوة وطنية.",
      title: "مليون شخص، خطوة إلى الأمام",
      body: "مبادرة وطنية لتمكين مليون سوري من استخدام الذكاء الاصطناعي بثقة في العمل والدراسة والحياة اليومية.",
      speech: "هذه مبادرة المليون",
      prefill: "اشرح لي مبادرة مليون مستخدم سوري للذكاء الاصطناعي",
    },
    {
      ...SHARED.ar,
      section: "06 / إلى كل سورية",
      greeting: "وتصل الرحلة من دمشق إلى كل سورية.",
      title: "ننمو معاً في كل سورية",
      body: "تحمل المجتمعات والمبادرات المعرفة إلى الناس في مختلف المحافظات، لتصبح التقنية فرصة مشتركة للجميع.",
      speech: "معاً إلى كل سورية",
      prefill: "كيف تصل برامج الجمعية إلى مختلف المحافظات السورية؟",
    },
  ],
  en: [
    {
      ...SHARED.en,
      section: "01 / The beginning",
      greeting: "Hello, I am Abu Al-Joud. I will guide you through this journey.",
      title: "Intelligence and entrepreneurship for a nation on the rise",
      body: "We begin with SAAE's vision: knowledge, technology and entrepreneurship becoming practical capability for Syria's future.",
      speech: "Let us begin together",
      prefill: "Introduce me to SAAE and its vision",
    },
    {
      ...SHARED.en,
      section: "02 / SAAE communities",
      greeting: "The roots of knowledge and expertise begin here.",
      title: "Nine communities, one foundation",
      body: "Our communities connect specialists across data, health, cities, software and more, working together as one network.",
      speech: "Meet our communities",
      prefill: "What are SAAE's nine communities?",
    },
    {
      ...SHARED.en,
      section: "03 / Learning platform",
      greeting: "Learning grows from those roots.",
      title: "Learning, grown from our communities",
      body: "Certified learning paths turn knowledge into professional and technical skills that people can put to work.",
      speech: "Explore learning paths",
      prefill: "Tell me about SAAE's learning platform and courses",
    },
    {
      ...SHARED.en,
      section: "04 / SAAE achievements",
      greeting: "Impact becomes visible through people and results.",
      title: "A community of 5,000+ learners",
      body: "More than 120 courses, 30 strategic partners and nine communities work together to broaden the reach of practical knowledge.",
      speech: "See what we have achieved",
      prefill: "Tell me more about SAAE's achievements",
    },
    {
      ...SHARED.en,
      section: "05 / Million-user initiative",
      greeting: "Here, the vision becomes a national step.",
      title: "One million people, one step forward",
      body: "A national initiative enabling one million Syrians to use AI confidently at work, in study and in everyday life.",
      speech: "Meet the million-user initiative",
      prefill: "Explain the Million Syrian AI Users initiative",
    },
    {
      ...SHARED.en,
      section: "06 / Across Syria",
      greeting: "The journey reaches from Damascus across Syria.",
      title: "Growing together across Syria",
      body: "Communities and initiatives carry knowledge across the country, making technology a shared opportunity for everyone.",
      speech: "Together across Syria",
      prefill: "How do SAAE's programmes reach communities across Syria?",
    },
  ],
};

const HERO_COMIC_IMAGES = [
  "/cinematic/images/abu-al-joud-comic-welcome.webp",
  "/cinematic/images/abu-al-joud-comic-curious.webp",
  "/cinematic/images/abu-al-joud-comic-curious.webp",
  "/cinematic/images/abu-al-joud-comic-celebrate.webp",
  "/cinematic/images/abu-al-joud-comic-vision.webp",
  "/cinematic/images/abu-al-joud-comic-vision.webp",
] as const;

function useActiveGuideContext() {
  const [active, setActive] = useState<GuideContext | null>(null);

  useEffect(() => {
    let frame = 0;
    const ordered: GuideContext[] = ["hero", "news", "partners", "mission", "faq"];

    const sync = () => {
      frame = 0;
      const assistantSection = document.getElementById("assistant-chatbot-section");
      if (assistantSection) {
        // The motion footer is fixed to the viewport while its outer reveal
        // wrapper remains in normal document flow.  Its intro can therefore
        // have an on-screen rect even while it is fully transparent and the
        // footer is still far below the viewport.  Use the reveal wrapper for
        // the visibility check so the floating guide is only suppressed when
        // the user has actually reached the footer.
        const assistantHost = assistantSection.closest<HTMLElement>("#site-footer");
        const assistantRect = (assistantHost ?? assistantSection).getBoundingClientRect();
        const assistantIsVisible =
          assistantRect.top < window.innerHeight * 0.92 &&
          assistantRect.bottom > window.innerHeight * 0.08;
        if (assistantIsVisible) {
          setActive(null);
          return;
        }
      }

      const viewportLine = window.innerHeight * 0.52;
      const candidates = ordered
        .map((context) => {
          const element = document.getElementById(context === "hero" ? "hero-sec" : context);
          if (!element) return null;
          const rect = element.getBoundingClientRect();
          if (rect.bottom < 0 || rect.top > window.innerHeight) return null;
          const containsLine = rect.top <= viewportLine && rect.bottom >= viewportLine;
          const distance = containsLine
            ? 0
            : Math.min(Math.abs(rect.top - viewportLine), Math.abs(rect.bottom - viewportLine));
          return { context, distance, containsLine, height: rect.height, top: rect.top };
        })
        .filter(Boolean) as Array<{
        containsLine: boolean;
        context: GuideContext;
        distance: number;
        height: number;
        top: number;
      }>;

      candidates.sort((a, b) => {
        if (a.containsLine !== b.containsLine) return a.containsLine ? -1 : 1;
        if (a.distance !== b.distance) return a.distance - b.distance;
        if (a.height !== b.height) return a.height - b.height;
        return b.top - a.top;
      });
      setActive(candidates[0]?.context ?? null);
    };

    const queueSync = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(sync);
    };

    sync();
    const interval = window.setInterval(queueSync, 100);
    window.addEventListener("scroll", queueSync, { passive: true });
    window.addEventListener("resize", queueSync);
    const observer = new MutationObserver(queueSync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", queueSync);
      window.removeEventListener("resize", queueSync);
      window.clearInterval(interval);
      observer.disconnect();
    };
  }, []);

  return active;
}

export function DesktopSectionGuide() {
  const [locale, setLocale] = useState<Locale>("ar");
  const [heroGuideReady, setHeroGuideReady] = useState(false);
  const [activeBand, setActiveBand] = useState(0);
  const [communityCopy, setCommunityCopy] = useState<CommunityCopy | null>(null);
  const prefersReducedMotion = Boolean(useReducedMotion());
  const hero = usePortalTarget("#hero-sec");
  const context = useActiveGuideContext();
  const heroMode = context === "hero";
  const communityMode = heroMode && activeBand === 1;
  const baseCopy = heroMode
    ? HERO_COPY[locale][activeBand]
    : context
      ? SECTION_COPY[context][locale]
      : HERO_COPY[locale][activeBand];
  const copy =
    communityMode && communityCopy
      ? {
          ...baseCopy,
          greeting:
            locale === "ar"
              ? "هذا الرمز يختصر مجال المجتمع ودوره."
              : "This symbol captures the community's field and role.",
          title: communityCopy.title,
          body: communityCopy.body,
        }
      : baseCopy;
  const comicImage = heroMode
    ? HERO_COMIC_IMAGES[activeBand]
    : context
      ? SECTION_COMIC_IMAGES[context]
      : HERO_COMIC_IMAGES[0];

  useEffect(() => {
    const syncLanguage = () => setLocale(document.documentElement.lang === "en" ? "en" : "ar");
    syncLanguage();
    const languageObserver = new MutationObserver(syncLanguage);
    languageObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"],
    });
    return () => languageObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!hero) return;

    const root = document.documentElement;
    let cancelled = false;
    let revealTimer = 0;
    let removeLogoListeners = () => {};

    const revealAfterOpening = () => {
      if (cancelled || revealTimer) return;
      const logo = document.querySelector<HTMLImageElement>(".radial-nav-tree");
      const reveal = () => {
        if (cancelled || revealTimer) return;
        revealTimer = window.setTimeout(
          () => {
            if (!cancelled) setHeroGuideReady(true);
          },
          prefersReducedMotion ? 120 : 1400,
        );
      };

      if (!logo || logo.complete) {
        reveal();
        return;
      }

      const onLogoSettled = () => {
        removeLogoListeners();
        reveal();
      };
      logo.addEventListener("load", onLogoSettled, { once: true });
      logo.addEventListener("error", onLogoSettled, { once: true });
      removeLogoListeners = () => {
        logo.removeEventListener("load", onLogoSettled);
        logo.removeEventListener("error", onLogoSettled);
      };
    };

    const syncOpeningState = () => {
      if (root.classList.contains("hero-opening-ready")) revealAfterOpening();
    };
    syncOpeningState();
    const openingObserver = new MutationObserver(syncOpeningState);
    openingObserver.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => {
      cancelled = true;
      window.clearTimeout(revealTimer);
      removeLogoListeners();
      openingObserver.disconnect();
    };
  }, [hero, prefersReducedMotion]);

  useEffect(() => {
    if (!hero) return;

    const syncBand = () => {
      const current = hero.querySelector<HTMLElement>(".hero-band.is-active");
      const next = Number(current?.dataset.band ?? 0);
      if (Number.isInteger(next) && next >= 0 && next < HERO_COPY.ar.length) {
        setActiveBand(next);
      }
    };
    const handleBandChange = (event: Event) => {
      const next = Number((event as CustomEvent<{ index?: number }>).detail?.index);
      if (Number.isInteger(next) && next >= 0 && next < HERO_COPY.ar.length) {
        setActiveBand(next);
      }
    };

    syncBand();
    window.addEventListener("saae:herobandchange", handleBandChange);
    return () => window.removeEventListener("saae:herobandchange", handleBandChange);
  }, [hero]);

  useEffect(() => {
    if (!heroMode) {
      setCommunityCopy(null);
      return;
    }

    const title = document.getElementById("community-card-name");
    const body = document.getElementById("community-card-copy");
    const track = document.getElementById("community-flip-track");
    if (!title || !body) return;

    let frame = 0;
    const sync = () => {
      frame = 0;
      setCommunityCopy(
        communityMode
          ? {
              title: title.textContent?.trim() || baseCopy.title,
              body: body.textContent?.trim() || baseCopy.body,
            }
          : null,
      );
    };
    const queueSync = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(sync);
    };

    sync();
    const mutationObserver = new MutationObserver(queueSync);
    if (communityMode && track)
      mutationObserver.observe(track, { childList: true, characterData: true, subtree: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      mutationObserver.disconnect();
    };
  }, [activeBand, baseCopy.body, baseCopy.title, communityMode, heroMode]);

  const openConversation = () => {
    window.dispatchEvent(
      new CustomEvent("assistant:open", {
        detail: { prefill: copy.prefill },
      }),
    );
  };

  const visible = context !== null && (!heroMode || heroGuideReady);
  const cue = `${context}-${activeBand}-${locale}-${communityCopy?.title ?? ""}`;

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.aside
            className="section-guide"
            data-guide-context="comic"
            data-guide-section={!heroMode && context ? context : undefined}
            data-guide-band={heroMode ? activeBand : undefined}
            dir={locale === "ar" ? "rtl" : "ltr"}
            aria-label={locale === "ar" ? "دليل أبو الجود للصفحة" : "Abu Al-Joud's page guide"}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -50, y: 38 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -38, y: 24 }}
            transition={{ duration: prefersReducedMotion ? 0.15 : 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={cue}
                className="section-guide-copy"
                aria-live="polite"
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -18, y: 8 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 12, y: -6 }}
                transition={{
                  duration: prefersReducedMotion ? 0.12 : 0.34,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <p className="section-guide-greeting">{copy.greeting}</p>
                <h2>{copy.title}</h2>
                <p className="section-guide-body">{copy.body}</p>
              </motion.div>
            </AnimatePresence>

            <motion.button
              key={comicImage}
              type="button"
              className="community-comic-speaker"
              onClick={openConversation}
              aria-label={copy.label}
              title={copy.label}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -22, y: 12 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              whileHover={prefersReducedMotion ? undefined : { y: -5, scale: 1.025 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
              transition={{ duration: prefersReducedMotion ? 0.12 : 0.48, delay: 0.08 }}
            >
              <img src={comicImage} alt="" aria-hidden="true" />
            </motion.button>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
