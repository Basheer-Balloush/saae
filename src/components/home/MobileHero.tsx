import { SaaeLogoAssembly } from "@/components/brand/SaaeLogoAssembly";

export interface MobileHeroProps {
  locale?: "ar" | "en";
}

// Copy reused verbatim from public/cinematic/html/home.html (.hero-static)
// with Arabic equivalents from public/cinematic/js/language.js.
// No invented marketing copy, no fake metrics, no per-letter animation.
const COPY = {
  en: {
    eyebrow: "Syrian Association for AI & Entrepreneurship",
    title: "Build Syria's AI future.",
    support: "Practical AI learning, research and entrepreneurship, connected for people across Syria.",
    primary: "Explore the initiative",
    secondary: "Ask about learning",
  },
  ar: {
    eyebrow: "الجمعية السورية للذكاء الاصطناعي وريادة الأعمال",
    title: "نبني مستقبل الذكاء الاصطناعي في سورية.",
    support: "تعلّم وبحث وريادة أعمال عملية في الذكاء الاصطناعي، متصلة بالناس في كل سورية.",
    primary: "استكشف المبادرة",
    secondary: "استفسر عن التعلّم",
  },
} as const;

export function MobileHero({ locale = "ar" }: MobileHeroProps) {
  const t = COPY[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <section
      dir={dir}
      lang={locale}
      aria-labelledby="mobile-hero-title"
      className="relative overflow-hidden bg-[#144248] text-white"
      style={{
        minHeight: "100svh",
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* LCP backdrop: existing static frame, reserved dimensions, dark overlay for contrast */}
      <img
        src="/cinematic/images/hero-static.jpg"
        srcSet="/cinematic/images/hero-static.jpg 1280w"
        sizes="100vw"
        width={1280}
        height={720}
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        decoding="async"
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-[#0b2b2f]/72" />

      <div className="page-container relative">
        <div className="flex min-h-[100svh] flex-col items-center justify-center gap-5 py-14 text-center">
          <SaaeLogoAssembly locale={locale} />
          <p className="max-w-md text-sm font-semibold tracking-wide text-white/85">{t.eyebrow}</p>
          <h1
            id="mobile-hero-title"
            className="max-w-xl text-4xl font-extrabold leading-[1.25] text-balance"
          >
            {t.title}
          </h1>
          <p className="max-w-md text-base leading-8 text-white/90">{t.support}</p>
          <div className="flex w-full max-w-md flex-col gap-3">
            <a
              href="/initiative"
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-white px-6 py-3 text-base font-bold text-[#144248] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#144248]"
            >
              {t.primary}
            </a>
            <a
              href="/contact#write"
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-white/50 px-6 py-3 text-base font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#144248]"
            >
              {t.secondary}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default MobileHero;
