import type { ReactNode } from "react";
import { useLang } from "@/lib/i18n";

/* Shared pieces of the instructor workspace. Their styles live in
   public/lms/css/instructor-dashboard.css, loaded by the instructor layout. */

type HeaderProps = {
  /** A back link rendered above the title, e.g. to the course. */
  back?: ReactNode;
  title: ReactNode;
  /** Short line under the title: a description, the course name, a status. */
  meta?: ReactNode;
  actions?: ReactNode;
};

export function InstructorPageHeader({ back, title, meta, actions }: HeaderProps) {
  const { lang } = useLang();
  return (
    <header className="id-header">
      <div className="id-heading">
        {back}
        <span className="id-eyebrow">{lang === "ar" ? "لوحة المدرّب" : "INSTRUCTOR"}</span>
        <h1>{title}</h1>
        {meta && <div className="id-meta">{meta}</div>}
      </div>
      {actions && <div className="id-header-actions">{actions}</div>}
    </header>
  );
}

export function InstructorStatusBadge({ status }: { status: string }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const map: Record<string, { cls: string; label: string }> = {
    draft: { cls: "id-status-draft", label: ar ? "مسودّة" : "Draft" },
    pending: { cls: "id-status-pending", label: ar ? "بانتظار المراجعة" : "Pending" },
    published: { cls: "id-status-published", label: ar ? "منشورة" : "Published" },
    rejected: { cls: "id-status-rejected", label: ar ? "مرفوضة" : "Rejected" },
    archived: { cls: "id-status-draft", label: ar ? "مؤرشفة" : "Archived" },
  };
  const m = map[status] ?? map.draft;
  return <span className={`id-status ${m.cls}`}>{m.label}</span>;
}
