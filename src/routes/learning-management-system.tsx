import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useSingleDeviceSession } from "@/hooks/useSingleDeviceSession";
import { LmsNavbar } from "@/components/lms/LmsNavbar";
import { LmsFooter } from "@/components/lms/LmsFooter";

export const Route = createFileRoute("/learning-management-system")({
  head: () => ({
    meta: [
      { title: "Learning Management System" },
      { name: "description", content: "Complete LMS platform — browse courses, learn, and grow." },
    ],
  }),
  component: LmsLayout,
});

function LmsLayout() {
  const navigate = useNavigate();
  const { user, role } = useLmsAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/learning-management-system" });
  };

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
