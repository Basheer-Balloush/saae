import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";

export const Route = createFileRoute("/learning-management-system/instructor")({
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
    if (!user) { navigate({ to: "/learning-management-system/login" }); return; }
    (async () => {
      const { data } = await supabase
        .from("lms_instructors")
        .select("approved,full_name_ar,full_name_en,bio_ar,bio_en,specialty_ar,specialty_en,full_name,bio,specialty")
        .eq("user_id", user.id)
        .maybeSingle();
      const isApproved = data?.approved ?? (role === "lms_instructor" || role === "lms_admin");
      setApproved(isApproved);
      const d = (data ?? {}) as Record<string, string | null>;
      const hasName = !!(d.full_name_ar || d.full_name_en || d.full_name);
      setProfileComplete(role === "lms_admin" ? true : hasName);
    })();
  }, [loading, user, role, navigate, location.pathname]);

  useEffect(() => {
    if (approved && profileComplete === false && location.pathname !== PROFILE_PATH) {
      navigate({ to: PROFILE_PATH });
    }
  }, [approved, profileComplete, location.pathname, navigate]);

  if (loading || !user || approved === null || profileComplete === null) {
    return <p className="text-center py-20 text-muted-foreground">{tr.loading}</p>;
  }
  if (role !== "lms_admin" && !approved) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="text-xl font-bold text-foreground">
          {lang === "ar" ? "حسابك كمدرّب قيد المراجعة" : "Your instructor account is pending review"}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {lang === "ar" ? "سيتم تفعيله من قبل الإدارة قريباً." : "An admin will activate it shortly."}
        </p>
      </div>
    );
  }
  return (
    <>
      {approved && !profileComplete && location.pathname === PROFILE_PATH && (
        <div className="mx-auto max-w-2xl px-4 sm:px-6 pt-6">
          <div className="rounded-2xl border border-amber-400/50 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
            {lang === "ar"
              ? "مبارك! تمّ اعتماد حسابك كمدرّب. أكمل بياناتك (الاسم بالعربية والإنجليزية، الاختصاص، ونبذة عنك) لتتمكّن من الوصول إلى لوحة المدرّب."
              : "Congrats! Your instructor account is approved. Complete your profile (name in Arabic & English, specialty, and bio) before accessing the instructor dashboard."}
          </div>
        </div>
      )}
      <Outlet />
    </>
  );
}
