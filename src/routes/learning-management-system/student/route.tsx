import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n/i18n";
import { lmsT } from "@/features/lms/lib/i18n";
import { currentLmsReturn, emailLinkFailed } from "@/features/lms/lib/redirect";

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
        search: {
          redirect: currentLmsReturn(),
          // Confirmation links land here; say so when one failed.
          ...(emailLinkFailed() ? { link: "expired" as const } : {}),
        },
      });
  }, [loading, user, navigate]);

  if (loading || !user)
    return <p className="text-center py-20 text-muted-foreground">{tr.loading}</p>;
  return <Outlet />;
}
