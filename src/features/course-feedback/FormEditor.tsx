import { useMemo, useState, type ReactNode } from "react";
import { AlignLeft, ArrowDown, ArrowUp, ChevronDown, ListChecks, Plus, Trash2 } from "lucide-react";
import { confirmDialog } from "@/hooks/useConfirm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, ToggleRow, useT } from "@/components/console/ui";
import {
  allQuestions,
  LIMITS,
  newId,
  OTHER_CHOICE,
  OTHER_ID,
  TEXT_MAX,
  type ChoiceQuestion,
  type FormDefinition,
  type FormProblem,
  type Question,
  type Step,
} from "@/lib/course-feedback-survey";

/* Edits a course feedback form: steps, their questions and each question's
   choices, in Arabic and English. Works on a copy the page saves as a new
   version; nothing here touches the database. */

type Props = {
  value: FormDefinition;
  onChange: (next: FormDefinition) => void;
  problems: FormProblem[];
  /** Show problems inline (after the admin first tries to save). */
  showProblems: boolean;
  disabled?: boolean;
};

const blankChoice = (taken: string[]) => ({ id: newId("c", taken), ar: "", en: "" });

export function FormEditor({ value, onChange, problems, showProblems, disabled }: Props) {
  const { t, ar } = useT();
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const steps = value.steps;
  const numbers = useMemo(() => {
    const map = new Map<string, number>();
    allQuestions(value).forEach((q, i) => map.set(q.id, i + 1));
    return map;
  }, [value]);

  const shown = showProblems ? problems : [];
  const stepProblems = (si: number) =>
    shown.filter((p) => p.step === si && p.question === undefined);
  const questionProblems = (si: number, qi: number) =>
    shown.filter((p) => p.step === si && p.question === qi);
  const formProblemsList = shown.filter(
    (p) => p.code === "no_steps" || p.code === "no_questions" || p.code.startsWith("too_many_"),
  );

  const setSteps = (next: Step[]) => onChange({ steps: next });
  const patchStep = (si: number, patch: Partial<Step>) =>
    setSteps(steps.map((s, i) => (i === si ? { ...s, ...patch } : s)));
  const patchQuestion = (si: number, qi: number, patch: Partial<Question>) =>
    patchStep(si, {
      questions: steps[si].questions.map((q, i) =>
        i === qi ? ({ ...q, ...patch } as Question) : q,
      ),
    });

  const toggle = (id: string, force?: boolean) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (force ?? !next.has(id)) next.add(id);
      else next.delete(id);
      return next;
    });

  const addStep = () =>
    setSteps([
      ...steps,
      {
        id: newId(
          "s",
          steps.map((s) => s.id),
        ),
        title: { ar: "", en: "" },
        questions: [],
      },
    ]);

  const removeStep = async (si: number) => {
    if (
      steps[si].questions.length &&
      !(await confirmDialog({
        title: t("حذف الخطوة مع أسئلتها؟", "Delete this step and its questions?"),
        description: t(
          "لا يتغيّر شيء قبل الحفظ، ويمكنك تجاهل التغييرات.",
          "Nothing changes until you save, and you can discard the changes.",
        ),
        confirmLabel: t("حذف", "Delete"),
        destructive: true,
      }))
    )
      return;
    setSteps(steps.filter((_, i) => i !== si));
  };

  const moveStep = (si: number, dir: -1 | 1) => {
    const to = si + dir;
    if (to < 0 || to >= steps.length) return;
    const next = [...steps];
    [next[si], next[to]] = [next[to], next[si]];
    setSteps(next);
  };

  const addQuestion = (si: number, kind: Question["kind"]) => {
    const id = newId(
      "q",
      allQuestions(value).map((q) => q.id),
    );
    const question: Question =
      kind === "choice"
        ? {
            kind,
            id,
            ar: "",
            en: "",
            required: true,
            choices: [blankChoice([]), blankChoice([])].map((c, i) => ({ ...c, id: `c${i + 1}` })),
          }
        : { kind, id, ar: "", en: "", required: false, max: TEXT_MAX };
    patchStep(si, { questions: [...steps[si].questions, question] });
    toggle(id, true);
  };

  const removeQuestion = (si: number, qi: number) =>
    patchStep(si, { questions: steps[si].questions.filter((_, i) => i !== qi) });

  /** Up or down one place; past the edge of a step it moves to the next one. */
  const moveQuestion = (si: number, qi: number, dir: -1 | 1) => {
    const questions = [...steps[si].questions];
    const to = qi + dir;
    if (to >= 0 && to < questions.length) {
      [questions[qi], questions[to]] = [questions[to], questions[qi]];
      patchStep(si, { questions });
      return;
    }
    const target = si + dir;
    if (target < 0 || target >= steps.length) return;
    const [q] = questions.splice(qi, 1);
    setSteps(
      steps.map((s, i) => {
        if (i === si) return { ...s, questions };
        if (i === target)
          return { ...s, questions: dir < 0 ? [...s.questions, q] : [q, ...s.questions] };
        return s;
      }),
    );
  };

  const total = allQuestions(value).length;

  return (
    <div className="space-y-5">
      {formProblemsList.map((p) => (
        <p
          key={p.code}
          role="alert"
          className="rounded-lg bg-[var(--cx-red-50)] px-3 py-2 text-[13px] font-semibold text-[var(--cx-red)]"
        >
          {problemText(p, t)}
        </p>
      ))}

      {steps.map((step, si) => (
        <section
          key={step.id}
          className="rounded-2xl border border-[var(--cx-line)] bg-[var(--cx-raise)] p-4"
          aria-labelledby={`fb-step-${step.id}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id={`fb-step-${step.id}`} className="text-[15px] font-extrabold">
              {t(`الخطوة ${si + 1}`, `Step ${si + 1}`)}
            </h3>
            <div className="flex items-center gap-1">
              <IconButton
                label={t("نقل الخطوة للأعلى", "Move step up")}
                onClick={() => moveStep(si, -1)}
                disabled={disabled || si === 0}
              >
                <ArrowUp />
              </IconButton>
              <IconButton
                label={t("نقل الخطوة للأسفل", "Move step down")}
                onClick={() => moveStep(si, 1)}
                disabled={disabled || si === steps.length - 1}
              >
                <ArrowDown />
              </IconButton>
              <IconButton
                label={t("حذف الخطوة", "Delete step")}
                onClick={() => void removeStep(si)}
                disabled={disabled || steps.length === 1}
                danger
              >
                <Trash2 />
              </IconButton>
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Field label={t("عنوان الخطوة بالعربية", "Step title in Arabic")}>
              <Input
                dir="rtl"
                maxLength={LIMITS.stepTitle}
                value={step.title.ar}
                disabled={disabled}
                aria-invalid={stepProblems(si).some((p) => p.code === "step_title") || undefined}
                onChange={(e) => patchStep(si, { title: { ...step.title, ar: e.target.value } })}
              />
            </Field>
            <Field label={t("عنوان الخطوة بالإنجليزية", "Step title in English")}>
              <Input
                dir="ltr"
                maxLength={LIMITS.stepTitle}
                value={step.title.en}
                disabled={disabled}
                aria-invalid={stepProblems(si).some((p) => p.code === "step_title") || undefined}
                onChange={(e) => patchStep(si, { title: { ...step.title, en: e.target.value } })}
              />
            </Field>
          </div>
          {stepProblems(si).map((p) => (
            <p key={p.code} className="mt-2 text-[12.5px] font-semibold text-[var(--cx-red)]">
              {problemText(p, t)}
            </p>
          ))}

          <ol className="mt-4 space-y-2">
            {step.questions.map((q, qi) => {
              const issues = questionProblems(si, qi);
              const expanded = open.has(q.id) || issues.length > 0;
              const n = numbers.get(q.id) ?? 0;
              const isFirst = si === 0 && qi === 0;
              const isLast = si === steps.length - 1 && qi === step.questions.length - 1;
              return (
                <li
                  key={q.id}
                  className={`rounded-xl border bg-[var(--cx-field)] ${issues.length ? "border-[var(--cx-red-line)]" : "border-[var(--cx-line-2)]"}`}
                >
                  <div className="flex items-center gap-2 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => toggle(q.id)}
                      aria-expanded={expanded}
                      className="flex min-w-0 flex-1 items-center gap-2 text-start"
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--cx-raise-2)] text-[12px] font-extrabold tabular-nums">
                        {n}
                      </span>
                      {q.kind === "choice" ? (
                        <ListChecks className="h-4 w-4 shrink-0 text-[var(--cx-muted)]" />
                      ) : (
                        <AlignLeft className="h-4 w-4 shrink-0 text-[var(--cx-muted)]" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-[14px] font-bold" dir="auto">
                        {(ar ? q.ar : q.en) ||
                          (ar ? q.en : q.ar) ||
                          t("سؤال بلا نص", "Untitled question")}
                      </span>
                      <span className="shrink-0 text-[12px] text-[var(--cx-muted)]">
                        {q.required ? t("مطلوب", "Required") : t("اختياري", "Optional")}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-[var(--cx-muted)] transition-transform ${expanded ? "rotate-180" : ""}`}
                      />
                    </button>
                    <IconButton
                      label={t(`نقل السؤال ${n} للأعلى`, `Move question ${n} up`)}
                      onClick={() => moveQuestion(si, qi, -1)}
                      disabled={disabled || isFirst}
                    >
                      <ArrowUp />
                    </IconButton>
                    <IconButton
                      label={t(`نقل السؤال ${n} للأسفل`, `Move question ${n} down`)}
                      onClick={() => moveQuestion(si, qi, 1)}
                      disabled={disabled || isLast}
                    >
                      <ArrowDown />
                    </IconButton>
                    <IconButton
                      label={t(`حذف السؤال ${n}`, `Delete question ${n}`)}
                      onClick={() => removeQuestion(si, qi)}
                      disabled={disabled || total === 1}
                      danger
                    >
                      <Trash2 />
                    </IconButton>
                  </div>

                  {expanded && (
                    <div className="space-y-3 border-t border-[var(--cx-line-2)] px-3 py-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <Field label={t("السؤال بالعربية", "Question in Arabic")}>
                          <Input
                            dir="rtl"
                            maxLength={LIMITS.label}
                            value={q.ar}
                            disabled={disabled}
                            aria-invalid={
                              issues.some((p) => p.code === "question_text") || undefined
                            }
                            onChange={(e) => patchQuestion(si, qi, { ar: e.target.value })}
                          />
                        </Field>
                        <Field label={t("السؤال بالإنجليزية", "Question in English")}>
                          <Input
                            dir="ltr"
                            maxLength={LIMITS.label}
                            value={q.en}
                            disabled={disabled}
                            aria-invalid={
                              issues.some((p) => p.code === "question_text") || undefined
                            }
                            onChange={(e) => patchQuestion(si, qi, { en: e.target.value })}
                          />
                        </Field>
                      </div>
                      <ToggleRow
                        id={`fb-required-${q.id}`}
                        label={t("إجابة مطلوبة", "Answer required")}
                        hint={
                          q.kind === "choice"
                            ? t("يختار المتعلّم إجابة واحدة.", "The learner picks one answer.")
                            : t(
                                `نص حرّ، حتى ${q.max} حرف.`,
                                `Free text, up to ${q.max} characters.`,
                              )
                        }
                        checked={q.required}
                        disabled={disabled}
                        onChange={(v) => patchQuestion(si, qi, { required: v })}
                      />
                      {q.kind === "choice" && (
                        <ChoiceList
                          q={q}
                          disabled={disabled}
                          invalid={(ci) =>
                            issues.some((p) => p.code === "choice_text" && p.choice === ci)
                          }
                          onChange={(patch) => patchQuestion(si, qi, patch)}
                        />
                      )}
                      {issues.map((p, i) => (
                        <p
                          key={`${p.code}-${i}`}
                          className="text-[12.5px] font-semibold text-[var(--cx-red)]"
                        >
                          {problemText(p, t)}
                        </p>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || total >= LIMITS.questions}
              onClick={() => addQuestion(si, "choice")}
            >
              <Plus className="h-4 w-4" />
              {t("سؤال اختيار", "Choice question")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || total >= LIMITS.questions}
              onClick={() => addQuestion(si, "text")}
            >
              <Plus className="h-4 w-4" />
              {t("سؤال مكتوب", "Written question")}
            </Button>
          </div>
        </section>
      ))}

      <Button
        type="button"
        variant="outline"
        disabled={disabled || steps.length >= LIMITS.steps}
        onClick={addStep}
      >
        <Plus className="h-4 w-4" />
        {t("إضافة خطوة", "Add a step")}
      </Button>
    </div>
  );
}

function ChoiceList({
  q,
  disabled,
  invalid,
  onChange,
}: {
  q: ChoiceQuestion;
  disabled?: boolean;
  invalid: (index: number) => boolean;
  onChange: (patch: Partial<ChoiceQuestion>) => void;
}) {
  const { t } = useT();
  const hasOther = !!q.otherText;
  // "Other" stays last and keeps its fixed id; the admin can still reword it.
  const movable = hasOther ? q.choices.length - 1 : q.choices.length;

  const setChoices = (choices: ChoiceQuestion["choices"]) => onChange({ choices });
  const move = (ci: number, dir: -1 | 1) => {
    const to = ci + dir;
    if (to < 0 || to >= movable) return;
    const next = [...q.choices];
    [next[ci], next[to]] = [next[to], next[ci]];
    setChoices(next);
  };
  const add = () => {
    const next = [...q.choices];
    next.splice(movable, 0, blankChoice(q.choices.map((c) => c.id)));
    setChoices(next);
  };
  const setOther = (on: boolean) =>
    onChange(
      on
        ? {
            otherText: true,
            choices: [...q.choices.filter((c) => c.id !== OTHER_ID), OTHER_CHOICE],
          }
        : { otherText: false, choices: q.choices.filter((c) => c.id !== OTHER_ID) },
    );

  return (
    <div className="space-y-2">
      <div className="text-[13px] font-bold text-[var(--cx-ink-2)]">{t("الخيارات", "Choices")}</div>
      <ol className="space-y-2">
        {q.choices.map((c, ci) => {
          const isOther = hasOther && c.id === OTHER_ID;
          const label = t(`الخيار ${ci + 1}`, `Choice ${ci + 1}`);
          return (
            <li key={c.id} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
              <span className="w-6 shrink-0 text-center text-[12px] font-bold tabular-nums text-[var(--cx-muted)]">
                {ci + 1}
              </span>
              <Input
                dir="rtl"
                className="min-w-0 flex-1"
                aria-label={t(`${label} بالعربية`, `${label} in Arabic`)}
                placeholder={t("بالعربية", "Arabic")}
                maxLength={LIMITS.label}
                value={c.ar}
                disabled={disabled}
                aria-invalid={invalid(ci) || undefined}
                onChange={(e) =>
                  setChoices(q.choices.map((x, i) => (i === ci ? { ...x, ar: e.target.value } : x)))
                }
              />
              <Input
                dir="ltr"
                className="min-w-0 flex-1"
                aria-label={t(`${label} بالإنجليزية`, `${label} in English`)}
                placeholder={t("بالإنجليزية", "English")}
                maxLength={LIMITS.label}
                value={c.en}
                disabled={disabled}
                aria-invalid={invalid(ci) || undefined}
                onChange={(e) =>
                  setChoices(q.choices.map((x, i) => (i === ci ? { ...x, en: e.target.value } : x)))
                }
              />
              <div className="flex shrink-0 items-center gap-1">
                <IconButton
                  label={t(`نقل ${label} للأعلى`, `Move ${label} up`)}
                  onClick={() => move(ci, -1)}
                  disabled={disabled || isOther || ci === 0}
                >
                  <ArrowUp />
                </IconButton>
                <IconButton
                  label={t(`نقل ${label} للأسفل`, `Move ${label} down`)}
                  onClick={() => move(ci, 1)}
                  disabled={disabled || isOther || ci >= movable - 1}
                >
                  <ArrowDown />
                </IconButton>
                <IconButton
                  label={t(`حذف ${label}`, `Delete ${label}`)}
                  onClick={() =>
                    isOther ? setOther(false) : setChoices(q.choices.filter((_, i) => i !== ci))
                  }
                  disabled={disabled || q.choices.length <= 2}
                  danger
                >
                  <Trash2 />
                </IconButton>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || q.choices.length >= LIMITS.choices}
          onClick={add}
        >
          <Plus className="h-4 w-4" />
          {t("إضافة خيار", "Add a choice")}
        </Button>
        <div className="min-w-[240px] flex-1 sm:flex-none">
          <ToggleRow
            id={`fb-other-${q.id}`}
            label={t("خيار «أمر آخر» مع مربع نص", "“Other” with a text box")}
            checked={hasOther}
            disabled={disabled || (!hasOther && q.choices.length >= LIMITS.choices)}
            onChange={setOther}
          />
        </div>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid h-8 w-8 place-items-center rounded-lg text-[var(--cx-muted)] transition-colors hover:bg-[var(--cx-raise-2)] disabled:pointer-events-none disabled:opacity-35 [&_svg]:h-4 [&_svg]:w-4 ${danger ? "hover:text-[var(--cx-red)]" : "hover:text-[var(--cx-ink)]"}`}
    >
      {children}
    </button>
  );
}

function problemText(p: FormProblem, t: (ar: string, en: string) => string): string {
  switch (p.code) {
    case "no_steps":
      return t("أضف خطوة واحدة على الأقل.", "Add at least one step.");
    case "too_many_steps":
      return t(`لا تزيد الخطوات عن ${LIMITS.steps}.`, `No more than ${LIMITS.steps} steps.`);
    case "no_questions":
      return t("أضف سؤالاً واحداً على الأقل.", "Add at least one question.");
    case "too_many_questions":
      return t(
        `لا تزيد الأسئلة عن ${LIMITS.questions}.`,
        `No more than ${LIMITS.questions} questions.`,
      );
    case "step_title":
      return t(
        "اكتب عنوان الخطوة بالعربية والإنجليزية.",
        "Give the step a title in Arabic and English.",
      );
    case "empty_step":
      return t(
        "لا أسئلة في هذه الخطوة. أضف سؤالاً أو احذف الخطوة.",
        "This step has no questions. Add one or delete the step.",
      );
    case "question_text":
      return t("اكتب السؤال بالعربية والإنجليزية.", "Write the question in Arabic and English.");
    case "too_few_choices":
      return t(
        "يحتاج سؤال الاختيار إلى خيارين على الأقل.",
        "A choice question needs at least 2 choices.",
      );
    case "too_many_choices":
      return t(`لا تزيد الخيارات عن ${LIMITS.choices}.`, `No more than ${LIMITS.choices} choices.`);
    case "choice_text":
      return t("اكتب كل خيار بالعربية والإنجليزية.", "Write every choice in Arabic and English.");
    case "other_last":
      return t("يجب أن يكون «أمر آخر» الخيار الأخير.", "“Other” must be the last choice.");
    case "duplicate_question":
    case "reserved_question_id":
    case "duplicate_choice":
      return t(
        "تكرّر معرّف داخلي. احذف هذا العنصر وأضفه من جديد.",
        "An internal id repeats. Delete this item and add it again.",
      );
  }
}
