import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { Loader2, Compass, Sparkles, ArrowLeft, ArrowRight } from "lucide-react";
import logo from "@/assets/saae-logo.png";

const CHOICE_PATH = "/learning-management-system/campaign/choice";

export const Route = createFileRoute("/learning-management-system/campaign/choice")({
  head: () => ({
    meta: [
      { title: "Choose Your Next Step · SAAE Campaign" },
      {
        name: "description",
        content:
          "Explore the SAAE learning platform or claim the free Generative AI course from the event campaign.",
      },
      { property: "og:title", content: "Choose Your Next Step · SAAE Campaign" },
      {
        property: "og:description",
        content:
          "Explore the SAAE platform or get the Generative AI course for free.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CampaignChoice,
});

const copy = {
  ar: {
    heading: "ماذا تريد أن تفعل الآن؟",
    sub: "اختر أحد الخيارين للمتابعة.",
    loading: "جارٍ التحميل…",
    exploreTitle: "استكشف المنصة",
    exploreSub: "تصفّح الدورات والبرامج المتاحة على منصة سآء.",
    freeTitle: "احصل على دورة الذكاء الاصطناعي التوليدي مجاناً",
    freeSub: "شارك صورة الفعالية في ستوري إنستغرام واحصل على الدورة مجاناً.",
    recommended: "الخيار الموصى به",
  },
  en: {
    heading: "What would you like to do?",
    sub: "Pick one of the two options to continue.",
    loading: "Loading…",
    exploreTitle: "Explore the Platform",
    exploreSub: "Browse the courses and programs available on SAAE.",
    freeTitle: "Get the Generative AI Course for Free",
    freeSub: "Share the event image to your Instagram Story and unlock the course.",
    recommended: "Recommended",
  },
} as const;

function CampaignChoice() {
  const navigate = useNavigate();
  const { user, loading } = useLmsAuth();
  const { lang } = useLang();
  const t = copy[lang];
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  useEffect(() => {
    if (!loading && !user) {
      navigate({
        to: "/learning-management-system/campaign",
        search: { redirect: CHOICE_PATH },
        replace: true,
      });
    }
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mx-2" />
        {t.loading}
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl text-center">
        <img src={logo} alt="SAAE" width={80} height={80} className="h-14 w-auto mx-auto" />
        <h1 className="mt-5 text-2xl sm:text-3xl font-bold text-foreground">{t.heading}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t.sub}</p>

        <div className="mt-8 grid gap-4">
          <Link
            to="/learning-management-system/campaign/story"
            className="group relative block rounded-2xl border-2 border-primary bg-primary/5 p-6 text-start shadow-soft transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="absolute top-4 end-4 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground">
              {t.recommended}
            </span>
            <Sparkles className="h-8 w-8 text-primary" />
            <h2 className="mt-4 text-xl font-bold text-foreground">{t.freeTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.freeSub}</p>
            <Arrow className="mt-4 h-5 w-5 text-primary transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
          </Link>

          <Link
            to="/learning-management-system/catalog"
            className="group block rounded-2xl border border-border bg-card p-5 text-start transition hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Compass className="h-6 w-6 text-muted-foreground" />
            <h2 className="mt-3 text-lg font-semibold text-foreground">{t.exploreTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.exploreSub}</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
