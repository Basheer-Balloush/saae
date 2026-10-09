import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useSingleDeviceSession } from "@/hooks/useSingleDeviceSession";
import { LmsNavbar } from "@/components/lms/LmsNavbar";
import { Footer } from "@/components/site/Footer";
import { LmsSkinShell } from "@/components/lms-skin/LmsSkinShell";
import { isConsoleLmsPath, isSkinnedLmsPath, LMS_SKIN_LINKS } from "@/components/lms-skin/skin";
import { useShownPathname } from "@/hooks/useShownPathname";
import { emailLinkError } from "@/lib/lms-redirect";

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
  const { user, role } = useLmsAuth();
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
    await supabase.auth.signOut();
    navigate({ to: "/learning-management-system" });
  };

  /* Cinematic routes share the LMS ambient background, navigation, and footer.
     Other LMS pages keep the standard navbar and footer below. */
  /* The admin console and the instructor workspace bring their own frame. */
  if (isConsoleLmsPath(pathname)) return <Outlet />;

  if (isSkinnedLmsPath(pathname)) {
    return (
      <LmsSkinShell
        role={role}
        isAuthed={!!user}
        onSignOut={handleSignOut}
      >
        <Outlet />
      </LmsSkinShell>
    );
  }

  return (
    <div className="lms-skin dark min-h-screen flex flex-col text-[#e7f1f0] relative">
      <div className="ambient" aria-hidden="true">
        <span className="orb-petrol" />
        <span className="orb-olive" />
      </div>
      <LmsNavbar role={role} isAuthed={!!user} onSignOut={handleSignOut} />
      <main className="flex-1 pt-20 relative z-[1]">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
