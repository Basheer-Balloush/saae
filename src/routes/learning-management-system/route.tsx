import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { confirmDialog } from "@/hooks/useConfirm";
import { useLang } from "@/lib/i18n/i18n";
import { useSingleDeviceSession } from "@/features/lms/hooks/useSingleDeviceSession";
import { LmsNavbar } from "@/features/lms/LmsNavbar";
import { Footer } from "@/components/layout/Footer";
import { LmsSkinShell } from "@/features/lms/skin/LmsSkinShell";
import { isConsoleLmsPath, isSkinnedLmsPath, LMS_SKIN_LINKS } from "@/features/lms/skin/skin";
import { LocationGate } from "@/features/user-location/LocationGate";
import { useShownPathname } from "@/hooks/useShownPathname";
import { emailLinkError } from "@/features/lms/lib/redirect";

/* Signed-in users must say where they live before using the platform; the
   pages that sign them in, up or back are left alone. */
const AUTH_PATHS =
  /^\/learning-management-system\/(login|signup|forgot-password|reset-password|confirm-account)\/?$/;

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
  const pathname = useShownPathname();
  useSingleDeviceSession(user?.id ?? null);

  // An email link that expired or was used already comes back with the error
  // in the URL. Pages would drop it on their way to the login page, which
  // explains it and offers a new link.
  useEffect(() => {
    if (emailLinkError())
      navigate({
        to: "/learning-management-system/login",
        search: { link: "expired" },
        replace: true,
      });
  }, [navigate]);

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

  /* The admin console and the instructor workspace bring their own frame
     (and their own location gate, in ConsoleShell). */
  if (isConsoleLmsPath(pathname)) return <Outlet />;

  const locationGate = user && !isGuest && !AUTH_PATHS.test(pathname) && (
    <LocationGate userId={user.id} lang={lang} />
  );

  /* Cinematic routes share the LMS ambient background, navigation, and footer.
     Other LMS pages keep the standard navbar and footer below. */
  if (isSkinnedLmsPath(pathname)) {
    return (
      <LmsSkinShell role={role} isAuthed={!!user} isGuest={isGuest} onSignOut={handleSignOut}>
        <Outlet />
        {locationGate}
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
      {locationGate}
    </div>
  );
}
