import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { safeLmsRedirect } from "@/lib/lms-redirect";
import { ConsoleShell } from "@/components/console/ConsoleShell";
import { EmptyState } from "@/components/console/ui";
import { Button } from "@/components/ui/button";

/* Every instructor page lives in the console frame. Admins reach the same
   pages (the course editor with its grading tab) with the LMS menu. */
export const Route = createFileRoute("/learning-management-system/instructor")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: InstructorLayout,
});

const PROFILE_PATH = "/learning-management-system/instructor/profile";

function InstructorLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, loading } = useLmsAuth();
  const { lang } = useLang();
  const tr = lmsT[lang];
  const [approved, setApproved] = useState<boolean | null>(null);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({
        to: "/learning-management-system/login",
        search: {
          redirect: safeLmsRedirect(`${window.location.pathname}${window.location.search}`),
        },
      });
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("lms_instructors")
        .select(
          "approved,full_name_ar,full_name_en,bio_ar,bio_en,specialty_ar,specialty_en,full_name,bio,specialty",
        )
        .eq("user_id", user.id)
        .maybeSingle();
      const isApproved = role === "admin" || (role === "lms_instructor" && !!data?.approved);
      setApproved(isApproved);
      const d = (data ?? {}) as Record<string, string | null>;
      const hasName = !!(d.full_name_ar || d.full_name_en || d.full_name);
      setProfileComplete(role === "admin" ? true : hasName);
    })();
  }, [loading, user, role, navigate, location.pathname]);

  useEffect(() => {
    if (approved && profileComplete === false && location.pathname !== PROFILE_PATH) {
      navigate({ to: PROFILE_PATH });
    }
  }, [approved, profileComplete, location.pathname, navigate]);

  if (loading || !user || approved === null || profileComplete === null) {
    return (
      <p
        className="flex min-h-screen items-center justify-center gap-2 text-muted-foreground"
        role="status"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr.loading}
      </p>
    );
  }

  if (role !== "admin" && !approved) {
    return (
      <ConsoleShell>
        <div className="cx-card mx-auto max-w-xl">
          <EmptyState
            icon={ShieldCheck}
            title={
              lang === "ar"
                ? "حسابك كمدرّب قيد المراجعة"
                : "Your instructor account is pending review"
            }
            text={
              lang === "ar"
                ? "لتفعيل حسابك، عليك تقديم طلب اعتماد رسمي عبر نظام معادلة المدربين (4 مراحل تقييم)."
                : "To activate your account, submit an accreditation request through the trainer equivalence system (4 evaluation phases)."
            }
            action={
              <Button asChild>
                <a href="/learning-management-system/trainer-apply">
                  {lang === "ar" ? "فتح نموذج طلب الاعتماد" : "Open accreditation form"}
                </a>
              </Button>
            }
          />
        </div>
      </ConsoleShell>
    );
  }

  return (
    <ConsoleShell>
      {approved && !profileComplete && location.pathname === PROFILE_PATH && (
        <p
          className="mb-5 rounded-2xl bg-[var(--cx-green-50)] px-5 py-3.5 text-[14px] font-semibold text-[var(--cx-green)]"
          role="status"
        >
          {lang === "ar"
            ? "مبارك! تمّ اعتماد حسابك كمدرّب. أكمل بياناتك (الاسم بالعربية والإنجليزية، الاختصاص، ونبذة عنك) لتتمكّن من الوصول إلى لوحة المدرّب."
            : "Congrats! Your instructor account is approved. Complete your profile (name in Arabic & English, specialty, and bio) before accessing the instructor dashboard."}
        </p>
      )}
      <Outlet />
    </ConsoleShell>
  );
}
