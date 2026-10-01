import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { confirmDialog } from "@/hooks/useConfirm";
import { useLang } from "@/lib/i18n/i18n";
import { useSingleDeviceSession } from "@/features/lms/hooks/useSingleDeviceSession";
import { LmsNavbar } from "@/features/lms/LmsNavbar";
import { Footer } from "@/components/layout/Footer";
import { LmsSkinShell } from "@/features/lms/skin/LmsSkinShell";
import { isConsoleLmsPath, isSkinnedLmsPath, LMS_SKIN_LINKS } from "@/features/lms/skin/skin";
import { LocationPrompt } from "@/features/user-location/LocationPrompt";

/* Pages where a signed-in user may be asked where they live: browsing pages,
   never sign-in pages, lessons, quizzes, certificates or the profile (which
   has its own location card). */
const LOCATION_PROMPT_PATHS =
  /^\/learning-management-system(\/(catalog|student|student\/requests|courses\/[^/]+|internships(\/[^/]+)?))?\/?$/;

export const Route = createFileRoute("/learning-management-system")({
  head: () => ({
    meta: [
      { title: "Training and Learning Platform" },
      { name: "description", content: "Complete LMS platform — browse courses, learn, and grow." },
    ],
    links: LMS_SKIN_LINKS,
  }),
  component: LmsLayout,
});

function LmsLayout() {
  const navigate = useNavigate();
  const { user, role, isGuest } = useLmsAuth();
  const { lang } = useLang();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useSingleDeviceSession(user?.id ?? null);

  const handleSignOut = async () => {
    // A guest's progress lives only in this browser's session.
    if (
      isGuest &&
      !(await confirmDialog({
        title: lang === "ar" ? "الخروج من وضع الزائر؟" : "Leave guest mode?",
        description:
          lang === "ar"
            ? "ستفقد دوراتك وتقدّمك كزائر. أنشئ حسابك أولاً لتحتفظ بها."
            : "You will lose your guest courses and progress. Create your account first to keep them.",
        confirmLabel: lang === "ar" ? "خروج" : "Leave",
        destructive: true,
      }))
    ) {
      return;
    }
    await supabase.auth.signOut();
    navigate({ to: "/learning-management-system" });
  };

  /* The admin console and the instructor workspace bring their own frame. */
  if (isConsoleLmsPath(pathname)) return <Outlet />;

  /* Cinematic routes share the LMS ambient background, navigation, and footer.
     Other LMS pages keep the standard navbar and footer below. */
  if (isSkinnedLmsPath(pathname)) {
    return (
      <LmsSkinShell role={role} isAuthed={!!user} isGuest={isGuest} onSignOut={handleSignOut}>
        <Outlet />
        {user && !isGuest && LOCATION_PROMPT_PATHS.test(pathname) && (
          <LocationPrompt userId={user.id} lang={lang} />
        )}
      </LmsSkinShell>
    );
  }

  return (
    <div className="lms-skin dark min-h-screen flex flex-col text-[#e7f1f0] relative">
      <div className="ambient" aria-hidden="true">
        <span className="orb-petrol" />
        <span className="orb-olive" />
      </div>
      <LmsNavbar role={role} isAuthed={!!user} isGuest={isGuest} onSignOut={handleSignOut} />
      <main className="flex-1 pt-20 relative z-[1]">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
