import { useCallback, useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCourseParticipantNames } from "@/hooks/useCourseParticipantNames";
import { CourseFormBuilder } from "@/components/lms/CourseFormBuilder";
import { Input } from "@/components/ui/input";
import {
  EmptyState,
  Field,
  Loading,
  Panel,
  SearchInput,
  ToggleRow,
  fmtDate,
  fmtNum,
} from "@/components/console/ui";
import { EnrollmentRequestsPanel } from "@/features/lms-console/EnrollmentRequestsPanel";
import type { EditorCtx } from "./types";

type Enrolled = { id: string; student_id: string; enrolled_at: string; progress: number };

export function StudentsTab({ ctx }: { ctx: EditorCtx }) {
  const { course, update, t, lang, user, isAdmin } = ctx;
  const participants = useCourseParticipantNames(course.id, user?.id, !user);
  const [enrolled, setEnrolled] = useState<Enrolled[] | null>(null);
  const [q, setQ] = useState("");

  const loadEnrolled = useCallback(async () => {
    const { data } = await supabase
      .from("lms_enrollments")
      .select("id,student_id,enrolled_at,progress")
      .eq("course_id", course.id)
      .order("enrolled_at", { ascending: false });
    setEnrolled((data as Enrolled[]) ?? []);
  }, [course.id]);
  useEffect(() => {
    loadEnrolled();
  }, [loadEnrolled]);

  const nameOf = (uid: string) =>
    participants.names[uid]?.trim() ||
    (participants.loading
      ? t("جارٍ تحميل الاسم…", "Loading name…")
      : t("الاسم غير متوفر", "Name unavailable"));
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (enrolled ?? []).filter((e) => !n || nameOf(e.student_id).toLowerCase().includes(n));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrolled, q, participants.names]);

  const deadlineValue = (() => {
    if (!course.enrollment_deadline) return "";
    const d = new Date(course.enrollment_deadline);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  })();

  return (
    <div className="space-y-5">
      <Panel title={t("إعدادات التسجيل", "Enrollment settings")}>
        <ToggleRow
          id="enroll-open"
          label={t("التسجيل مفتوح", "Enrollment is open")}
          hint={t("أغلقه لإيقاف الطلبات الجديدة.", "Turn it off to stop new requests.")}
          checked={course.enrollment_open}
          onChange={(v) => update({ enrollment_open: v })}
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            label={t("آخر موعد للتسجيل (اختياري)", "Enrollment deadline (optional)")}
            hint={t("بعده لا يستطيع الطلاب التسجيل.", "After it, students cannot enroll.")}
          >
            <Input
              type="datetime-local"
              value={deadlineValue}
              onChange={(e) =>
                update({
                  enrollment_deadline: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : null,
                })
              }
            />
          </Field>
          <Field
            label={t("الحد الأقصى للطلاب (اختياري)", "Maximum students (optional)")}
            hint={t(
              `المسجّلون الآن: ${fmtNum(course.students_count, lang)}. اتركه فارغاً بلا حد.`,
              `Enrolled now: ${fmtNum(course.students_count, lang)}. Leave empty for no limit.`,
            )}
          >
            <Input
              type="number"
              min={0}
              value={course.max_students ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                update({ max_students: v === "" ? null : Math.max(0, parseInt(v, 10) || 0) });
              }}
            />
          </Field>
        </div>
      </Panel>

      <Panel
        title={t("طلبات التسجيل", "Enrollment requests")}
        description={
          isAdmin
            ? t(
                "اقبل الطلب مع رسالة بريد أو واتساب، أو ارفضه مع ملاحظة.",
                "Approve a request with an email or WhatsApp message, or reject it with a note.",
              )
            : t(
                "يوافق فريق الإدارة على الطلبات. يمكنك الاطلاع على الطلبات وبيانات التسجيل.",
                "The admin team approves requests. You can see the requests and their form answers.",
              )
        }
      >
        <EnrollmentRequestsPanel
          courseId={course.id}
          canDecide={isAdmin}
          onChanged={loadEnrolled}
        />
      </Panel>

      <Panel
        title={t("الطلاب المسجّلون", "Enrolled students")}
        description={
          enrolled
            ? t(
                `${fmtNum(enrolled.length, lang)} طالب`,
                `${fmtNum(enrolled.length, lang)} students`,
              )
            : undefined
        }
        actions={
          enrolled && enrolled.length > 6 ? (
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder={t("ابحث بالاسم", "Search by name")}
            />
          ) : undefined
        }
        flush
      >
        {enrolled === null ? (
          <Loading />
        ) : enrolled.length === 0 ? (
          <EmptyState
            compact
            icon={Users}
            title={t("لا يوجد طلاب مسجّلون بعد", "No enrolled students yet")}
          />
        ) : (
          <div className="max-h-[480px] overflow-auto">
            <table className="cx-table">
              <thead>
                <tr>
                  <th>{t("الطالب", "Student")}</th>
                  <th>{t("تاريخ التسجيل", "Enrolled")}</th>
                  <th className="w-[40%]">{t("التقدّم", "Progress")}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((e) => {
                  const pct = Math.round(Number(e.progress) || 0);
                  return (
                    <tr key={e.id}>
                      <td className="font-semibold">{nameOf(e.student_id)}</td>
                      <td className="text-[13px] text-[var(--cx-muted)]">
                        {fmtDate(e.enrolled_at, lang)}
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--cx-line-2)]">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                background: pct >= 100 ? "var(--cx-green)" : "var(--cx-teal)",
                              }}
                            />
                          </div>
                          <span className="w-10 text-end text-[13px] font-bold tabular-nums">
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <CourseFormBuilder courseId={course.id} />
    </div>
  );
}
