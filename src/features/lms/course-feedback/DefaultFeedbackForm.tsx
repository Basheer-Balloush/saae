import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ErrorNote, fmtDate, Loading, Panel, useT } from "@/components/console/ui";
import { getDefaultFeedbackForm, type AdminForm } from "@/features/lms/course-feedback/lib/admin.functions";
import { EditableForm } from "./EditableForm";

/* LMS settings: the default feedback form every online course asks, unless
   an admin switched feedback off for the course or gave it its own form. */
export function DefaultFeedbackForm() {
  const { t, lang } = useT();
  const load = useServerFn(getDefaultFeedbackForm);
  const [form, setForm] = useState<AdminForm | null>(null);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(async () => {
    setFailed(false);
    try {
      setForm(await load());
    } catch {
      setFailed(true);
    }
  }, [load]);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="space-y-5">
      <Panel
        title={t("نموذج التقييم الافتراضي", "Default feedback form")}
        description={t(
          "تسأله كل دورة أونلاين بعد الدروس والاختبار وقبل الشهادة، ما لم يكن للدورة نموذجها الخاص أو أُوقف فيها التقييم (من تبويب «التقييم» في صفحة الدورة). كل حفظ نسخة جديدة، والإجابات المرسلة تبقى على الأسئلة التي أجابت عنها.",
          "Every online course asks it after the lessons and the quiz, before the certificate, unless the course has its own form or feedback is switched off (the course page's Feedback tab). Each save is a new version; answers already sent keep the questions they answered.",
        )}
      >
        {form && (
          <p className="text-[13px] text-[var(--cx-muted)]">
            {t(
              `النسخة ${form.version} · آخر تعديل ${fmtDate(form.updatedAt, lang, true)}`,
              `Version ${form.version} · last changed ${fmtDate(form.updatedAt, lang, true)}`,
            )}
          </p>
        )}
      </Panel>
      {failed ? (
        <ErrorNote onRetry={() => void refresh()} />
      ) : !form ? (
        <Loading />
      ) : (
        <EditableForm
          key={`${form.formId}:${form.version}`}
          courseId={null}
          form={form}
          onSaved={() => void refresh()}
        />
      )}
    </div>
  );
}
