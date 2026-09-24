import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { currentLmsReturn } from "@/lib/lms-redirect";

import { LMS_SKIN_LINKS } from "@/components/lms-skin/skin";

export const Route = createFileRoute("/learning-management-system/admin")({
  head: () => ({
    links: LMS_SKIN_LINKS,
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
    if (!user) navigate({ to: "/learning-management-system/login", search: { redirect: currentLmsReturn() } });
    else if (role !== "admin") navigate({ to: "/learning-management-system" });
  }, [loading, user, role, navigate]);

  if (loading || !user || role !== "admin") {
    return <p className="text-center py-20 text-muted-foreground">{tr.loading}</p>;
  }
  return (
    <div className="lms-dashboard-wrap lms-admin-shell">
      <Outlet />
    </div>
  );
}
