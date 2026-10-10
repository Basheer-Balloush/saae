import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useLang } from "@/lib/i18n/i18n";
import { clearPmSession, loadPmSession, pmRolePath, type PmSession } from "./auth";
import type { PmRole } from "./model";
import { ProjectManagementApp } from "./ProjectManagementApp";

export function ProjectManagementRolePage({ role }: { role: PmRole }) {
  const navigate = useNavigate();
  const { lang } = useLang();
  const [session] = useState<PmSession | null>(() => loadPmSession());

  useEffect(() => {
    if (!session) {
      navigate({ to: "/project-management/login", replace: true });
    } else if (session.role !== role) {
      navigate({ to: pmRolePath(session.role) as never, replace: true });
    }
  }, [navigate, role, session]);

  if (!session || session.role !== role) {
    return (
      <div
        className="cx flex min-h-screen items-center justify-center gap-2 bg-[var(--cx-bg)] text-[var(--cx-muted)]"
        role="status"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        {lang === "ar" ? "جارٍ فتح مساحة العمل…" : "Opening workspace…"}
      </div>
    );
  }

  return (
    <ProjectManagementApp
      actorId={session.userId}
      expectedRole={role}
      onSignOut={() => {
        clearPmSession();
        navigate({ to: "/project-management/login", replace: true });
      }}
    />
  );
}
