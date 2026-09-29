import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { CalendarCheck, Loader2, Smartphone, Unlink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toUserMessage } from "@/lib/safe-error";
import { confirmDialog } from "@/hooks/useConfirm";
import { Button } from "@/components/ui/button";
import { EmptyState, Loading, Panel } from "@/components/console/ui";
import { Register } from "@/features/attendance/Register";
import type { EditorCtx } from "./types";

/* Attendance for an in-person course, taken inside the course itself. The
   register is the same one the attendance system and the phone app use. */
export function AttendanceTab({ ctx }: { ctx: EditorCtx }) {
  const { course, t, isAdmin, canManage } = ctx;
  const [amsId, setAmsId] = useState<string | null | undefined>(undefined);
  const [linking, setLinking] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("ams_courses")
      .select("id")
      .eq("lms_course_id", course.id)
      .maybeSingle();
    setAmsId((data as { id: string } | null)?.id ?? null);
  }, [course.id]);
  useEffect(() => {
    load();
  }, [load]);

  const start = async () => {
    setLinking(true);
    const { error } = await supabase.rpc("link_lms_course_to_ams", { _lms_course_id: course.id });
    setLinking(false);
    if (error) return void toast.error(toUserMessage(error));
    toast.success(t("بدأ تسجيل الحضور لهذه الدورة", "Attendance is on for this course"));
    load();
  };

  const stop = async () => {
    if (!amsId) return;
    const ok = await confirmDialog({
      title: t("إيقاف تسجيل الحضور لهذه الدورة؟", "Stop tracking attendance for this course?"),
      description: t(
        "سيُلغى ربط نظام الحضور وسيُحذف الطلاب المتزامنون منه.",
        "The attendance link is removed and the synced students are deleted from it.",
      ),
      destructive: true,
    });
    if (!ok) return;
    const { error } = await supabase.rpc("unlink_lms_course_from_ams", { _ams_course_id: amsId });
    if (error) return void toast.error(toUserMessage(error));
    toast.success(t("تم إلغاء الربط", "Unlinked"));
    load();
  };

  if (amsId === undefined) return <Loading />;

  if (!amsId) {
    return (
      <Panel>
        <EmptyState
          icon={CalendarCheck}
          title={t("تسجيل الحضور غير مفعّل بعد", "Attendance is not on yet")}
          text={t(
            "يُفعَّل تلقائياً عند نشر دورة حضورية. يمكنك تفعيله الآن لتظهر الجلسات والطلاب هنا.",
            "It turns on automatically when an in-person course is published. You can turn it on now so the sessions and students appear here.",
          )}
          action={
            canManage ? (
              <Button onClick={start} disabled={linking}>
                {linking && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("تفعيل الحضور", "Turn on attendance")}
              </Button>
            ) : undefined
          }
        />
      </Panel>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button asChild size="sm" variant="outline">
          <Link to="/attendance-management-system" search={{ course: amsId }}>
            <Smartphone className="h-4 w-4" />
            {t("فتح على الهاتف", "Open on a phone")}
          </Link>
        </Button>
        {isAdmin && (
          <Button size="sm" variant="ghost" className="text-[var(--cx-red)]" onClick={stop}>
            <Unlink className="h-4 w-4" />
            {t("إيقاف الحضور", "Stop tracking")}
          </Button>
        )}
      </div>
      <Register amsId={amsId} lmsCourseId={course.id} canDelete={isAdmin} />
    </div>
  );
}
