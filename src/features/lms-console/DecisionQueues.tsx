import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Briefcase, Check, CheckCircle2, ExternalLink, Pencil, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  adminListInternships,
  type AdminInternshipRow,
} from "@/lib/lms-internships-admin.functions";
import { Button } from "@/components/ui/button";
import {
  CourseThumb,
  EmptyState,
  Loading,
  Panel,
  Pill,
  ReasonDialog,
  fmtDate,
  fmtNum,
  useT,
} from "@/components/console/ui";
import { useLmsAdminActions } from "./actions";

/* ---------- Courses sent for review ---------- */

type PendingCourse = {
  id: string;
  title_ar: string;
  title_en: string | null;
  cover_url: string | null;
  instructor_id: string;
  updated_at: string;
  delivery_mode: string;
  instructor: string;
};

export function CourseReviewQueue() {
  const { t, ar, lang } = useT();
  const actions = useLmsAdminActions(lang);
  const [rows, setRows] = useState<PendingCourse[] | null>(null);
  const [rejecting, setRejecting] = useState<PendingCourse | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("lms_courses")
      .select("id,title_ar,title_en,cover_url,instructor_id,updated_at,delivery_mode")
      .eq("status", "pending")
      .order("updated_at", { ascending: true });
    const list = (data as Omit<PendingCourse, "instructor">[]) ?? [];
    const ids = [...new Set(list.map((c) => c.instructor_id))];
    const { data: names } = ids.length
      ? await supabase.from("lms_instructors").select("user_id,full_name").in("user_id", ids)
      : { data: [] };
    const nameOf = Object.fromEntries(
      ((names as { user_id: string; full_name: string }[]) ?? []).map((n) => [
        n.user_id,
        n.full_name,
      ]),
    );
    setRows(list.map((c) => ({ ...c, instructor: nameOf[c.instructor_id] ?? "" })));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const title = (c: PendingCourse) => (ar ? c.title_ar : c.title_en || c.title_ar);

  return (
    <Panel
      title={t("دورات أرسلها المدرّبون للمراجعة", "Courses instructors sent for review")}
      description={t(
        "افتح الدورة وراجعها، ثم انشرها أو أعدها مع السبب.",
        "Open the course and check it, then publish it or send it back with a reason.",
      )}
      flush
    >
      {rows === null ? (
        <Loading />
      ) : rows.length === 0 ? (
        <AllClear
          text={t("لا توجد دورات بانتظار المراجعة.", "No courses are waiting for review.")}
        />
      ) : (
        <ul>
          {rows.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center gap-3 border-b border-[var(--cx-line-2)] px-5 py-3.5 last:border-0"
            >
              <CourseThumb src={c.cover_url} size={42} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-bold">{title(c)}</div>
                <div className="text-[12.5px] text-[var(--cx-muted)]">
                  {c.instructor || "—"} ·{" "}
                  {c.delivery_mode === "onsite" ? t("حضوري", "In person") : t("أونلاين", "Online")}{" "}
                  · {t("أُرسلت", "Sent")} {fmtDate(c.updated_at, lang)}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to="/learning-management-system/admin/courses/$id" params={{ id: c.id }}>
                    <Pencil className="h-4 w-4" />
                    {t("مراجعة", "Review")}
                  </Link>
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    if (await actions.setCourseStatus(c.id, "published")) load();
                  }}
                >
                  <Check className="h-4 w-4" />
                  {t("نشر", "Publish")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setRejecting(c)}>
                  <X className="h-4 w-4" />
                  {t("إعادة مع السبب", "Send back")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ReasonDialog
        open={!!rejecting}
        onOpenChange={(v) => !v && setRejecting(null)}
        title={t("إعادة الدورة للمدرّب", "Send the course back")}
        description={t(
          "سيرى المدرّب هذا السبب ويمكنه التعديل وإعادة الإرسال.",
          "The instructor sees this reason and can edit and resubmit.",
        )}
        confirmLabel={t("رفض الدورة", "Reject course")}
        required
        destructive
        onConfirm={async (reason) => {
          if (rejecting && (await actions.setCourseStatus(rejecting.id, "rejected", reason)))
            load();
        }}
      />
    </Panel>
  );
}

/* ---------- Internship applications ---------- */

type OppCount = AdminInternshipRow & { waiting: number };

export function InternshipRequestList() {
  const { t, ar, lang } = useT();
  const list = useServerFn(adminListInternships);
  const [rows, setRows] = useState<OppCount[] | null>(null);

  useEffect(() => {
    (async () => {
      const res = await list({ data: { page: 1, page_size: 100, sort: "updated_desc" } }).catch(
        () => null,
      );
      const opps = (res?.rows ?? []) as AdminInternshipRow[];
      // Waiting = new or under review, counted per opportunity.
      const { data } = await supabase
        .from("internship_applications")
        .select("opportunity_id,status")
        .in("status", ["new", "under_review"]);
      const waiting: Record<string, number> = {};
      for (const a of (data as { opportunity_id: string }[]) ?? [])
        waiting[a.opportunity_id] = (waiting[a.opportunity_id] ?? 0) + 1;
      setRows(
        opps
          .map((o) => ({ ...o, waiting: waiting[o.id] ?? 0 }))
          .filter((o) => o.applications_count > 0)
          .sort((a, b) => b.waiting - a.waiting),
      );
    })();
  }, [list]);

  return (
    <Panel
      title={t("طلبات فرص التدريب", "Internship applications")}
      description={t(
        "افتح الفرصة لمراجعة المتقدّمين وتغيير حالاتهم.",
        "Open an opportunity to review its applicants and change their status.",
      )}
      flush
    >
      {rows === null ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState
          compact
          icon={Briefcase}
          title={t("لا توجد طلبات بعد", "No applications yet")}
        />
      ) : (
        <ul>
          {rows.map((o) => (
            <li key={o.id} className="border-b border-[var(--cx-line-2)] last:border-0">
              <Link
                to="/learning-management-system/admin/internships/$id/applications"
                params={{ id: o.id }}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--cx-hover)]"
              >
                <Briefcase className="h-5 w-5 text-[var(--cx-teal)]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-bold">
                    {ar ? o.title_ar : o.title_en || o.title_ar}
                  </span>
                  <span className="text-[12.5px] text-[var(--cx-muted)]">
                    {t(
                      `${fmtNum(o.applications_count, lang)} طلب`,
                      `${fmtNum(o.applications_count, lang)} applications`,
                    )}
                  </span>
                </span>
                {o.waiting > 0 ? (
                  <Pill tone="orange">
                    {t(
                      `${fmtNum(o.waiting, lang)} بانتظار المراجعة`,
                      `${fmtNum(o.waiting, lang)} to review`,
                    )}
                  </Pill>
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-[var(--cx-green)]" />
                )}
                <ExternalLink className="h-4 w-4 text-[var(--cx-muted)]" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function AllClear({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-6 text-[14px] text-[var(--cx-muted)]">
      <CheckCircle2 className="h-5 w-5 text-[var(--cx-green)]" />
      {text}
    </div>
  );
}
