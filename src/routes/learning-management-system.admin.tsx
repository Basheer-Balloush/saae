import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";

export const Route = createFileRoute("/learning-management-system/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const { user, role, loading } = useLmsAuth();
  const { lang } = useLang();
  const tr = lmsT[lang];

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/learning-management-system/login" });
    else if (role !== "lms_admin") navigate({ to: "/learning-management-system" });
  }, [loading, user, role, navigate]);

  if (loading || !user || role !== "lms_admin") {
    return <p className="text-center py-20 text-muted-foreground">{tr.loading}</p>;
  }
  return <Outlet />;
}
