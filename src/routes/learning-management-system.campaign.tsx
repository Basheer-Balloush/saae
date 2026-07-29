import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import logo from "@/assets/saae-logo.png";

const CAMPAIGN_PATH = "/learning-management-system/campaign";

export const Route = createFileRoute("/learning-management-system/campaign")({
  head: () => ({
    meta: [
      { title: "SAAE Event Story Campaign · Share & Learn" },
      {
        name: "description",
        content:
          "Join the SAAE event campaign: share the event Story and unlock the free Generative AI course.",
      },
      { property: "og:title", content: "SAAE Event Story Campaign" },
      {
        property: "og:description",
        content:
          "Share the SAAE event Story and unlock the free Generative AI course.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CampaignEntry,
});

const copy = {
  ar: {
    heading: "هل لديك حساب على المنصة؟",
    sub: "اختر الخيار المناسب لمتابعة المشاركة في حملة الفعالية.",
    yes: "نعم، لديّ حساب",
    no: "لا، أريد إنشاء حساب",
    loading: "جارٍ التحميل…",
    welcome: "أهلاً بك 👋",
    welcomeSub: "حسابك جاهز. تابع إلى صفحة الحملة.",
    continue: "متابعة",
  },
  en: {
    heading: "Do you have an account?",
    sub: "Pick an option to continue with the event campaign.",
    yes: "Yes, I have an account",
    no: "No, create an account",
    loading: "Loading…",
    welcome: "Welcome 👋",
    welcomeSub: "Your account is ready. Continue to the campaign.",
    continue: "Continue",
  },
} as const;

function CampaignEntry() {
  const navigate = useNavigate();
  const { user, loading } = useLmsAuth();
  const { lang } = useLang();
  const t = copy[lang];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mx-2" />
        {t.loading}
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-soft text-center">
        <img src={logo} alt="SAAE" width={80} height={80} className="h-16 w-auto mx-auto" />

        {user ? (
          <>
            <h1 className="mt-4 text-xl font-bold text-foreground">{t.welcome}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t.welcomeSub}</p>
            <Button
              className="mt-6 w-full"
              onClick={() => navigate({ to: "/learning-management-system/profile" })}
            >
              {t.continue}
            </Button>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-xl font-bold text-foreground">{t.heading}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t.sub}</p>
            <div className="mt-6 space-y-3">
              <Button
                className="w-full"
                onClick={() =>
                  navigate({
                    to: "/learning-management-system/login",
                    search: { redirect: CAMPAIGN_PATH },
                  })
                }
              >
                <LogIn className="h-4 w-4 mx-2" />
                {t.yes}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  navigate({
                    to: "/learning-management-system/signup",
                    search: { redirect: CAMPAIGN_PATH },
                  })
                }
              >
                <UserPlus className="h-4 w-4 mx-2" />
                {t.no}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
