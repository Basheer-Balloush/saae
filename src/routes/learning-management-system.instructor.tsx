import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { LMS_SKIN_LINKS } from "@/components/lms-skin/skin";
import { currentLmsReturn } from "@/lib/lms-redirect";

/* Every instructor page shares the workspace look: the LMS shell's
   stylesheets plus the dashboard sheet, loaded once for the whole subtree. */
export const Route = createFileRoute("/learning-management-system/instructor")({
  head: () => ({
    links: [...LMS_SKIN_LINKS, { rel: "stylesheet", href: "/lms/css/instructor-dashboard.css" }],
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
      navigate({ to: "/learning-management-system/login", search: { redirect: currentLmsReturn() } });
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
      <Workspace>
        <p className="id-empty" role="status">
          <Loader2 aria-hidden="true" className="id-spinner" />
          {tr.loading}
        </p>
      </Workspace>
    );
  }
  if (role !== "admin" && !approved) {
    return (
      <Workspace>
        <section className="id-panel id-notice">
          <h1>
            {lang === "ar"
              ? "حسابك كمدرّب قيد المراجعة"
              : "Your instructor account is pending review"}
          </h1>
          <p>
            {lang === "ar"
              ? "لتفعيل حسابك، عليك تقديم طلب اعتماد رسمي عبر نظام معادلة المدربين (4 مراحل تقييم)."
              : "To activate your account, submit an accreditation request through the trainer equivalence system (4 evaluation phases)."}
          </p>
          <a
            href="/learning-management-system/trainer-apply"
            className="id-button id-button-primary"
          >
            {lang === "ar" ? "فتح نموذج طلب الاعتماد" : "Open accreditation form"}
          </a>
        </section>
      </Workspace>
    );
  }
  return (
    <Workspace>
      {approved && !profileComplete && location.pathname === PROFILE_PATH && (
        <p className="id-alert" role="status">
          {lang === "ar"
            ? "مبارك! تمّ اعتماد حسابك كمدرّب. أكمل بياناتك (الاسم بالعربية والإنجليزية، الاختصاص، ونبذة عنك) لتتمكّن من الوصول إلى لوحة المدرّب."
            : "Congrats! Your instructor account is approved. Complete your profile (name in Arabic & English, specialty, and bio) before accessing the instructor dashboard."}
        </p>
      )}
      <Outlet />
    </Workspace>
  );
}

/** The workspace frame: page width, room for the menu, and the SAAE logo. */
function Workspace({ children }: { children: ReactNode }) {
  const { lang } = useLang();
  return (
    <div className="instructor-dashboard">
      <Link
        to="/learning-management-system"
        className="id-brand"
        aria-label={lang === "ar" ? "الرئيسية — SAAE" : "SAAE home"}
      >
        <img
          src={
            lang === "ar"
              ? "/cinematic/images/saae-logo-ar.png"
              : "/cinematic/images/saae-logo-en.png"
          }
          alt=""
        />
      </Link>
      {children}
    </div>
  );
}
