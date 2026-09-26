import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { currentLmsReturn } from "@/lib/lms-redirect";
import { ConsoleShell } from "@/components/console/ConsoleShell";

export const Route = createFileRoute("/learning-management-system/admin")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const { user, role, loading } = useLmsAuth();
  const { lang } = useLang();
  const tr = lmsT[lang];

  useEffect(() => {
    if (loading) return;
    if (!user)
      navigate({
        to: "/learning-management-system/login",
        search: { redirect: currentLmsReturn() },
      });
    else if (role !== "admin") navigate({ to: "/learning-management-system" });
  }, [loading, user, role, navigate]);

  if (loading || !user || role !== "admin") {
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
  return (
    <ConsoleShell>
      <Outlet />
    </ConsoleShell>
  );
}
