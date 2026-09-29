import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SaveBar, useT } from "@/components/console/ui";
import { toUserMessage } from "@/lib/safe-error";
import { formProblems, type FormDefinition } from "@/features/lms/course-feedback/lib/survey";
import { saveFeedbackForm, type AdminForm } from "@/features/lms/course-feedback/lib/admin.functions";
import { FormEditor } from "./FormEditor";

/* A form open for editing, saved as its next version. `courseId` null is the
   default form. Render it with key={`${form.formId}:${form.version}`} so a
   newly saved version starts a fresh copy. */
export function EditableForm({
  courseId,
  form,
  onSaved,
}: {
  courseId: string | null;
  form: AdminForm;
  onSaved: () => void;
}) {
  const { t, lang } = useT();
  const save = useServerFn(saveFeedbackForm);
  const [draft, setDraft] = useState<FormDefinition>(form.definition);
  const [showProblems, setShowProblems] = useState(false);
  const [saving, setSaving] = useState(false);

  const problems = useMemo(() => formProblems(draft), [draft]);
  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(form.definition),
    [draft, form.definition],
  );

  const submit = async () => {
    if (problems.length) {
      setShowProblems(true);
      toast.error(t("صحّح العناصر المحدّدة ثم احفظ.", "Fix the marked items, then save."));
      return;
    }
    setSaving(true);
    try {
      const res = await save({ data: { courseId, baseVersion: form.version, definition: draft } });
      toast.success(
        t(
          `حُفظ النموذج (النسخة ${res.version}). الإجابات المرسلة سابقاً تبقى على أسئلتها.`,
          `Form saved (version ${res.version}). Answers already sent keep their questions.`,
        ),
      );
      onSaved();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("form_changed")) {
        toast.error(
          t(
            "حفظ شخص آخر هذا النموذج للتو. انسخ تعديلاتك، ثم أعد تحميل الصفحة لترى نسخته.",
            "Someone else just saved this form. Copy your changes, then reload the page to see their version.",
          ),
          { duration: 20_000 },
        );
      } else if (msg.includes("invalid_form")) {
        setShowProblems(true);
        toast.error(t("صحّح العناصر المحدّدة ثم احفظ.", "Fix the marked items, then save."));
      } else {
        toast.error(toUserMessage(e, lang));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <FormEditor
        value={draft}
        onChange={setDraft}
        problems={problems}
        showProblems={showProblems}
        disabled={saving}
      />
      <SaveBar
        show={dirty}
        saving={saving}
        onSave={() => void submit()}
        onDiscard={() => {
          setDraft(form.definition);
          setShowProblems(false);
        }}
      />
    </>
  );
}
