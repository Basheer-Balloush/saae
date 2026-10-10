import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { loadPmSession, pmRolePath } from "@/features/project-management/auth";
import { useLang } from "@/lib/i18n/i18n";

export const Route = createFileRoute("/project-management/")({
  ssr: false,
  component: ProjectManagementEntry,
});

function ProjectManagementEntry() {
  const navigate = useNavigate();
  const { lang } = useLang();

  useEffect(() => {
    const session = loadPmSession();
    navigate({
      to: session ? (pmRolePath(session.role) as never) : "/project-management/login",
      replace: true,
    });
  }, [navigate]);

  return (
    <div
      className="cx flex min-h-screen items-center justify-center gap-2 bg-[var(--cx-bg)] text-[var(--cx-muted)]"
      role="status"
    >
      <Loader2 className="h-4 w-4 animate-spin" />
      {lang === "ar" ? "جارٍ التحقق من الجلسة…" : "Checking your session…"}
    </div>
  );
}
