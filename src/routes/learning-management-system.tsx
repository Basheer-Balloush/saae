import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useSingleDeviceSession } from "@/hooks/useSingleDeviceSession";
import { LmsNavbar } from "@/components/lms/LmsNavbar";
import { LmsFooter } from "@/components/lms/LmsFooter";
import { LmsSkinShell } from "@/components/lms-skin/LmsSkinShell";
import { isSkinnedLmsPath } from "@/components/lms-skin/skin";

export const Route = createFileRoute("/learning-management-system")({
  head: () => ({
    meta: [
      { title: "Training and Learning Platform" },
      { name: "description", content: "Complete LMS platform — browse courses, learn, and grow." },
    ],
  }),
  component: LmsLayout,
});

function LmsLayout() {
  const navigate = useNavigate();
  const { user, role } = useLmsAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useSingleDeviceSession(user?.id ?? null);


  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/learning-management-system" });
  };

  /* Redesigned student pages get Moaz's chrome; admin and instructor
     dashboards keep the navbar and footer below. */
  if (isSkinnedLmsPath(pathname)) {
    return (
      <LmsSkinShell role={role} isAuthed={!!user} onSignOut={handleSignOut}>
        <Outlet />
      </LmsSkinShell>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <LmsNavbar role={role} isAuthed={!!user} onSignOut={handleSignOut} />
      <main className="flex-1 pt-20">
        <Outlet />
      </main>
      <LmsFooter />
    </div>
  );
}
