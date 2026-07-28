import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Link2, Unlink, Loader2, CalendarDays, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/safe-error";
import { confirmDialog } from "@/hooks/useConfirm";

export const Route = createFileRoute("/learning-management-system/admin/attendance-link")({
  head: () => ({ meta: [{ title: "LMS · Attendance Link" }] }),
  component: AttendanceLinkPage,
});

type Row = {
  course_id: string;
  title_ar: string;
  title_en: string | null;
  status: string;
  instructor_id: string;
  ams_course_id: string | null;
  registrants_count: number;
};

function AttendanceLinkPage() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("lms_list_courses_with_ams_link");
    if (error) toast.error(toUserMessage(error));
    setRows((data as Row[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const link = async (courseId: string) => {
    setBusy(courseId);
    const { error } = await supabase.rpc("link_lms_course_to_ams", { _lms_course_id: courseId });
    setBusy(null);
    if (error) { toast.error(toUserMessage(error)); return; }
    toast.success(ar ? "تم الربط ومزامنة الطلاب" : "Linked & students synced");
    load();
  };

  const unlink = async (amsCourseId: string) => {
    if (!await confirmDialog({ title: ar
      ? "إلغاء الربط؟ سيُحذف الطلاب المتزامنون من نظام الحضور، لكن الجلسات والإضافات اليدوية تبقى."
      : "Unlink? Synced students will be removed from attendance, but sessions and manual entries remain.", destructive: true })) return;
    setBusy(amsCourseId);
    const { error } = await supabase.rpc("unlink_lms_course_from_ams", { _ams_course_id: amsCourseId });
    setBusy(null);
    if (error) { toast.error(toUserMessage(error)); return; }
    toast.success(ar ? "تم إلغاء الربط" : "Unlinked");
    load();
  };

  const published = rows.filter((r) => r.status === "published");
  const others = rows.filter((r) => r.status !== "published");

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
      <Link to="/learning-management-system/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />{ar ? "رجوع" : "Back"}
      </Link>
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
        <Link2 className="h-6 w-6 text-primary" />
        {ar ? "ربط الدورات بنظام الحضور" : "Link courses to Attendance"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {ar
          ? "اربط دورات المنصة التعليمية بنظام الحضور ليتمكن المدرّب من تسجيل حضور الجلسات. الطلاب المعتمَدون يتزامنون تلقائياً."
          : "Link LMS courses to the attendance system so instructors can record session attendance. Approved students are synced automatically."}
      </p>
      <p className="mt-2 text-xs rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 px-3 py-2">
        {ar
          ? "ملاحظة: عند الربط، تُستبدل جلسات الحضور الحالية بجلسة واحدة لكل قسم من أقسام الدورة، وتحديد \"حاضر\" لطالب يُكمل تلقائياً قسم الدورة المرتبط بالجلسة."
          : "Note: on linking, existing attendance sessions are replaced with one session per LMS section. Marking a student present auto-completes the linked section for them."}
      </p>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <>
          <Section title={ar ? "الدورات المنشورة" : "Published courses"} rows={published} ar={ar} busy={busy} onLink={link} onUnlink={unlink} />
          {others.length > 0 && (
            <Section title={ar ? "دورات أخرى (مسودة / قيد المراجعة)" : "Other courses (draft / pending)"} rows={others} ar={ar} busy={busy} onLink={link} onUnlink={unlink} />
          )}
        </>
      )}
    </div>
  );
}

function Section({
  title, rows, ar, busy, onLink, onUnlink,
}: {
  title: string;
  rows: Row[];
  ar: boolean;
  busy: string | null;
  onLink: (id: string) => void;
  onUnlink: (id: string) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-8">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{title}</h2>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.course_id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-foreground truncate">
                {ar ? r.title_ar : r.title_en || r.title_ar}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                {r.ams_course_id && (
                  <span className="inline-flex items-center gap-1 text-primary">
                    <CalendarDays className="h-3 w-3" />
                    {ar ? "مربوطة" : "Linked"}
                    <span className="inline-flex items-center gap-0.5 ms-2 text-muted-foreground">
                      <Users className="h-3 w-3" />{r.registrants_count}
                    </span>
                  </span>
                )}
              </div>
            </div>
            {r.ams_course_id ? (
              <Button
                variant="outline"
                size="sm"
                disabled={busy === r.ams_course_id}
                onClick={() => onUnlink(r.ams_course_id!)}
              >
                {busy === r.ams_course_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
                <span className="ms-1">{ar ? "إلغاء الربط" : "Unlink"}</span>
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={busy === r.course_id}
                onClick={() => onLink(r.course_id)}
              >
                {busy === r.course_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                <span className="ms-1">{ar ? "ربط" : "Link"}</span>
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
