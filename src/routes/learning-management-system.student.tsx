import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { emailLinkFailed } from "@/lib/lms-redirect";

export const Route = createFileRoute("/learning-management-system/student")({
  component: StudentLayout,
});

function StudentLayout() {
  const navigate = useNavigate();
  const { user, loading } = useLmsAuth();
  const { lang } = useLang();
  const tr = lmsT[lang];

  useEffect(() => {
    if (!loading && !user)
      navigate({
        to: "/learning-management-system/login",
        // Confirmation links land here; say so when one failed.
        search: emailLinkFailed() ? { link: "expired" } : {},
      });
  }, [loading, user, navigate]);

  if (loading || !user) return <p className="text-center py-20 text-muted-foreground">{tr.loading}</p>;
  return <Outlet />;
}
