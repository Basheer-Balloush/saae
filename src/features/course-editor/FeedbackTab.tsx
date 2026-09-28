import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Info, Loader2 } from "lucide-react";
import { ErrorNote, Loading, Panel, Seg, ToggleRow } from "@/components/console/ui";
import { toUserMessage } from "@/lib/safe-error";
import { allQuestions } from "@/lib/course-feedback-survey";
import {
  getCourseFeedbackAdmin,
  setCourseFeedbackSettings,
  type CourseFeedbackAdmin,
} from "@/lib/course-feedback-admin.functions";
import { EditableForm } from "@/features/course-feedback/EditableForm";
import { FeedbackResults } from "@/features/course-feedback/FeedbackResults";
import type { EditorCtx } from "./types";

/* Course feedback for admins: whether the course asks it before the
   certificate, which form it asks (the default or its own) and what learners
   answered. Instructors never see this tab. */
export function FeedbackTab({ ctx }: { ctx: EditorCtx }) {
  const { course, t, lang } = ctx;
  const load = useServerFn(getCourseFeedbackAdmin);
  const setSettings = useServerFn(setCourseFeedbackSettings);
  const [data, setData] = useState<CourseFeedbackAdmin | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<"enabled" | "custom" | null>(null);

  const refresh = useCallback(async () => {
    setFailed(false);
    try {
      setData(await load({ data: { courseId: course.id } }));
    } catch {
      setFailed(true);
    }
  }, [course.id, load]);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (course.delivery_mode === "onsite") {
    return (
      <div className="cx-card flex items-start gap-3 p-6 text-[14px] text-[var(--cx-muted)]">
        <Info className="mt-0.5 h-5 w-5 shrink-0" />
        {t(
          "تقييم الدورة للدورات الأونلاين فقط. تصدر شهادة الدورة الحضورية بعد حضور الجلسات.",
          "Course feedback is for online courses only. An in-person course's certificate follows attendance.",
        )}
      </div>
    );
  }
  if (failed) return <ErrorNote onRetry={() => void refresh()} />;
  if (!data) return <Loading />;

  const change = async (patch: { enabled?: boolean; custom?: boolean }) => {
    setBusy(patch.enabled !== undefined ? "enabled" : "custom");
    try {
      await setSettings({ data: { courseId: course.id, ...patch } });
      await refresh();
      toast.success(t("حُفظ.", "Saved."));
    } catch (e) {
      toast.error(toUserMessage(e, lang));
    } finally {
      setBusy(null);
    }
  };

  const count = allQuestions(data.form.definition).length;

  return (
    <div className="space-y-5">
      <Panel
        title={t("تقييم الدورة", "Course feedback")}
        description={t(
          "يجيب المتعلّم عن نموذج التقييم بعد الدروس والاختبار، ثم تصدر شهادته.",
          "Learners answer the feedback form after the lessons and the quiz; then their certificate is issued.",
        )}
      >
        <ToggleRow
          id="course-feedback-enabled"
          label={t("طلب التقييم قبل الشهادة", "Ask for feedback before the certificate")}
          hint={
            data.enabled
              ? t(
                  "تنتظر الشهادة إرسال التقييم.",
                  "The certificate waits until the feedback is sent.",
                )
              : t(
                  "لا نموذج لهذه الدورة: تصدر الشهادة بعد الدروس والاختبار.",
                  "No form for this course: the certificate follows the lessons and the quiz.",
                )
          }
          checked={data.enabled}
          disabled={busy !== null}
          onChange={(v) => void change({ enabled: v })}
        />

        {data.enabled && (
          <div className="mt-4 space-y-3 border-t border-[var(--cx-line-2)] pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[14px] font-bold">{t("الأسئلة", "Questions")}</span>
              <Seg
                value={data.custom ? "custom" : "default"}
                onChange={(v) => {
                  if (busy === null && (v === "custom") !== data.custom)
                    void change({ custom: v === "custom" });
                }}
                options={[
                  { value: "default", label: t("النموذج الافتراضي", "Default form") },
                  { value: "custom", label: t("نموذج خاص بالدورة", "This course's own form") },
                ]}
              />
              {busy === "custom" && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            {data.custom ? (
              <p className="text-[13px] text-[var(--cx-muted)]">
                {t(
                  "تعديلات هذا النموذج لهذه الدورة وحدها. كل حفظ نسخة جديدة، والإجابات المرسلة تبقى على أسئلتها.",
                  "Changes to this form apply to this course only. Each save is a new version; answers already sent keep their questions.",
                )}
              </p>
            ) : (
              <p className="text-[13px] text-[var(--cx-muted)]">
                {t(
                  `تسأل الدورة النموذج الافتراضي (عدد الأسئلة: ${count}). عدّله من `,
                  `This course asks the default form (${count} questions). Edit it under `,
                )}
                <Link
                  to="/learning-management-system/admin/settings"
                  search={{ tab: "feedback" }}
                  className="font-bold text-[var(--cx-teal)] underline-offset-4 hover:underline"
                >
                  {t("الإعدادات ← تقييم الدورات", "Settings → Course feedback")}
                </Link>
                {t(
                  "، أو اختر «نموذج خاص بالدورة» لتعديل نسخة لهذه الدورة وحدها.",
                  ", or pick “This course's own form” to edit a copy for this course only.",
                )}
              </p>
            )}
          </div>
        )}
      </Panel>

      {data.enabled && data.custom && (
        <EditableForm
          key={`${data.form.formId}:${data.form.version}`}
          courseId={course.id}
          form={data.form}
          onSaved={() => void refresh()}
        />
      )}

      <FeedbackResults data={data} fileName={`course-feedback-${course.slug || course.id}`} />
    </div>
  );
}
