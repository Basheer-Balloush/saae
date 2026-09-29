import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Award, CheckCircle2, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { LMS_SKIN_LINKS } from "@/components/lms-skin/skin";
import {
  getCourseFeedback,
  saveCourseFeedbackDraft,
  submitCourseFeedback,
  type CourseFeedbackView,
} from "@/lib/course-feedback.functions";
import {
  allQuestions,
  missingInStep,
  otherKey,
  OTHER_ID,
  OTHER_TEXT_MAX,
  type ChoiceQuestion,
  type TextQuestion,
} from "@/lib/course-feedback-survey";

export const Route = createFileRoute("/learning-management-system/student/feedback/$courseId")({
  head: () => ({
    meta: [{ title: "Course feedback — SAAE Training and Learning Platform" }],
    links: [...LMS_SKIN_LINKS, { rel: "stylesheet", href: "/lms/css/feedback.css" }],
  }),
  component: CourseFeedback,
});

const DRAFT_DELAY_MS = 1500;
type SaveState = "idle" | "saving" | "saved" | "failed";

function CourseFeedback() {
  const { courseId } = Route.useParams();
  const { lang } = useLang();
  const ar = lang === "ar";
  const load = useServerFn(getCourseFeedback);
  const saveDraft = useServerFn(saveCourseFeedbackDraft);
  const submit = useServerFn(submitCourseFeedback);

  const [view, setView] = useState<CourseFeedbackView | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [showMissing, setShowMissing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{
    certificateId: string | null;
    waitingFor: "payment" | "account" | null;
  } | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  const dirty = useRef(false);
  const latest = useRef({ answers, notes, lang });
  latest.current = { answers, notes, lang };

  useEffect(() => {
    let active = true;
    setLoadError(false);
    load({ data: { courseId } })
      .then((v) => {
        if (!active) return;
        setView(v);
        setAnswers(v.answers ?? {});
        setNotes(v.notes ?? {});
        // Continue a saved draft at its first unanswered step.
        const first = v.form.steps.findIndex(
          (s) => missingInStep(s, v.answers ?? {}, v.notes ?? {}).length > 0,
        );
        setStepIndex(first === -1 ? Math.max(0, v.form.steps.length - 1) : first);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [courseId, load, reloadKey]);

  const steps = useMemo(() => view?.form.steps ?? [], [view?.form]);
  const step = steps[stepIndex];
  const numberOf = useMemo(() => {
    const map = new Map<string, number>();
    steps.flatMap((s) => s.questions).forEach((q, i) => map.set(q.id, i + 1));
    return map;
  }, [steps]);

  const flushDraft = useCallback(async () => {
    if (!dirty.current || !view || view.state !== "open") return;
    dirty.current = false;
    setSaveState("saving");
    try {
      const { answers: a, notes: n, lang: l } = latest.current;
      await saveDraft({ data: { courseId, answers: a, notes: n, lang: l } });
      setSaveState("saved");
    } catch {
      dirty.current = true;
      setSaveState("failed");
    }
  }, [courseId, saveDraft, view]);

  // Save the draft a moment after the learner stops changing answers.
  useEffect(() => {
    if (!dirty.current) return;
    const timer = window.setTimeout(() => void flushDraft(), DRAFT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [answers, notes, flushDraft]);

  const setAnswer = (id: string, value: string) => {
    dirty.current = true;
    setAnswers((a) => ({ ...a, [id]: value }));
  };
  const setNote = (key: string, value: string) => {
    dirty.current = true;
    setNotes((n) => ({ ...n, [key]: value }));
  };

  const missing = step ? missingInStep(step, answers, notes) : [];

  const goToStep = (i: number) => {
    setShowMissing(false);
    setStepIndex(i);
    void flushDraft();
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const next = () => {
    if (missing.length) {
      setShowMissing(true);
      document.getElementById(`q-${missing[0]}`)?.focus();
      return;
    }
    goToStep(stepIndex + 1);
  };

  const send = async () => {
    if (missing.length) {
      setShowMissing(true);
      document.getElementById(`q-${missing[0]}`)?.focus();
      return;
    }
    const firstIncomplete = steps.findIndex((s) => missingInStep(s, answers, notes).length > 0);
    if (firstIncomplete !== -1) {
      goToStep(firstIncomplete);
      setShowMissing(true);
      return;
    }
    setSubmitting(true);
    try {
      const res = await submit({
        data: {
          courseId,
          answers,
          notes,
          lang,
          formId: view?.formId ?? "",
          formVersion: view?.formVersion ?? 0,
        },
      });
      dirty.current = false;
      setDone({ certificateId: res.certificateId, waitingFor: res.waitingFor });
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("form_changed")) {
        // An admin changed the form: load it again; answers that still fit stay.
        await flushDraft();
        toast.message(
          ar
            ? "حُدّث نموذج التقييم للتو. راجع الأسئلة ثم أرسل مجدداً."
            : "The feedback form was just updated. Check the questions and send again.",
        );
        setView(null);
        setReloadKey((k) => k + 1);
        return;
      }
      toast.error(
        msg.includes("invalid_feedback")
          ? ar
            ? "بعض الإجابات غير مكتملة أو غير صالحة. راجع الأسئلة المحدّدة ثم أرسل مجدداً."
            : "Some answers are missing or not valid. Check the marked questions and send again."
          : ar
            ? "تعذّر إرسال التقييم. إجاباتك محفوظة في هذه الصفحة، حاول مجدداً بعد قليل."
            : "Your feedback could not be sent. Your answers are still on this page; try again in a moment.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const courseTitle = view
    ? ar
      ? view.courseTitle.ar || view.courseTitle.en || ""
      : view.courseTitle.en || view.courseTitle.ar
    : "";

  const shell = (children: ReactNode) => (
    <div className="feedback-page page-shell" dir={ar ? "rtl" : "ltr"} ref={topRef}>
      <nav className="course-crumbs" aria-label={ar ? "مسار التنقل" : "Breadcrumb"}>
        <Link to="/learning-management-system/student">{ar ? "دوراتي" : "My courses"}</Link>
        {courseTitle ? (
          <>
            <span aria-hidden="true">/</span>
            <span>{courseTitle}</span>
          </>
        ) : null}
      </nav>
      {children}
    </div>
  );

  if (loadError) {
    return shell(
      <div className="state-box" role="alert">
        <p>
          {ar
            ? "تعذّر تحميل نموذج التقييم. تحقّق من اتصالك ثم أعد المحاولة."
            : "The feedback form could not be loaded. Check your connection and try again."}
        </p>
        <button
          type="button"
          className="action action-secondary"
          onClick={() => setReloadKey((k) => k + 1)}
        >
          {ar ? "أعد المحاولة" : "Try again"}
        </button>
      </div>,
    );
  }

  if (!view) {
    return shell(
      <p className="state-box" role="status">
        {ar ? "جارٍ التحميل…" : "Loading…"}
      </p>,
    );
  }

  const certificateId = done?.certificateId ?? view.certificateId;
  const waitingFor = certificateId ? null : (done?.waitingFor ?? view.waitingFor);
  const waitingForPayment = waitingFor === "payment";

  if (done || view.state === "submitted") {
    return shell(
      <section className="feedback-done" aria-labelledby="feedback-done-h">
        <CheckCircle2 aria-hidden="true" />
        <h1 id="feedback-done-h">
          {ar ? "شكراً لك! وصلنا تقييمك." : "Thank you. Your feedback is in."}
        </h1>
        <p>
          {certificateId
            ? ar
              ? "أكملت جميع متطلبات الدورة، وشهادتك جاهزة."
              : "You have met every requirement of the course, and your certificate is ready."
            : waitingFor === "account"
              ? ar
                ? "أكملت الدورة! أنشئ حسابك لتصدر شهادتك باسمك، وتبقى فيه كل دوراتك وتقدّمك."
                : "You have finished the course. Create your account and your certificate is issued in your name; it keeps all your courses and progress."
              : waitingForPayment
                ? ar
                  ? "أكملت الدورة، وتصدر شهادتك فور اكتمال الدفع. تواصل مع فريق المنصة لإتمامه."
                  : "You have finished the course. Your certificate is issued as soon as the payment is complete; contact the platform team to finish it."
                : ar
                  ? "ستظهر شهادتك هنا حين تكتمل بقية متطلبات الدورة."
                  : "Your certificate appears here once the course’s other requirements are met."}
        </p>
        <div className="feedback-done-actions">
          {certificateId ? (
            <Link
              to="/learning-management-system/certificate/$id"
              params={{ id: certificateId }}
              className="action action-primary"
            >
              {ar ? "الحصول على الشهادة" : "Get certificate"}
            </Link>
          ) : waitingFor === "account" ? (
            <Link to="/learning-management-system/signup" className="action action-primary">
              {ar ? "إنشاء حسابي" : "Create my account"}
            </Link>
          ) : null}
          <Link to="/learning-management-system/student" className="action action-secondary">
            {ar ? "العودة إلى دوراتي" : "Back to my courses"}
          </Link>
        </div>
      </section>,
    );
  }

  if (view.state !== "open") {
    const blocked: Record<Exclude<CourseFeedbackView["state"], "open" | "submitted">, string> = {
      lessons_incomplete: ar
        ? "يُفتح تقييم الدورة بعد إكمال جميع الدروس."
        : "The course feedback opens once you have completed every lesson.",
      quiz_required: ar
        ? "يُفتح تقييم الدورة بعد اجتياز اختبار الدورة."
        : "The course feedback opens once you have passed the course quiz.",
      onsite: ar
        ? "لا تحتاج الدورات الحضورية إلى هذا التقييم."
        : "In-person courses do not use this feedback form.",
      disabled: ar ? "لا تطلب هذه الدورة تقييماً." : "This course does not ask for feedback.",
      not_enrolled: ar ? "لست مسجّلاً في هذه الدورة." : "You are not enrolled in this course.",
      unavailable: ar
        ? "التقييم غير متاح لهذه الدورة الآن."
        : "Feedback is not available for this course right now.",
    };
    return shell(
      <div className="state-box">
        <p>{blocked[view.state]}</p>
        {view.state === "lessons_incomplete" ? (
          <Link
            to="/learning-management-system/student/player/$courseId"
            params={{ courseId }}
            className="action action-primary"
          >
            {ar ? "تابع الدروس" : "Continue the lessons"}
          </Link>
        ) : view.state === "quiz_required" ? (
          <Link
            to="/learning-management-system/student/quiz/$courseId"
            params={{ courseId }}
            search={{ quiz: undefined, review: undefined }}
            className="action action-primary"
          >
            {ar ? "إلى الاختبار" : "Go to the quiz"}
          </Link>
        ) : (
          <Link to="/learning-management-system/student" className="action action-secondary">
            {ar ? "العودة إلى دوراتي" : "Back to my courses"}
          </Link>
        )}
      </div>,
    );
  }

  const last = stepIndex === steps.length - 1;
  const questions = allQuestions(view.form);
  const requiredCount = questions.filter((q) => q.required).length;
  const saveNote =
    saveState === "saving"
      ? ar
        ? "جارٍ حفظ المسودة…"
        : "Saving your draft…"
      : saveState === "saved"
        ? ar
          ? "حُفظت المسودة، يمكنك المتابعة لاحقاً من أي جهاز."
          : "Draft saved. You can finish later, on any device."
        : saveState === "failed"
          ? ar
            ? "تعذّر حفظ المسودة. إجاباتك باقية في هذه الصفحة."
            : "The draft could not be saved. Your answers are still on this page."
          : "";

  return shell(
    <>
      <header className="feedback-head">
        <p className="feedback-eyebrow">
          <MessageSquareText aria-hidden="true" />
          {ar ? "الخطوة الأخيرة قبل الشهادة" : "The last step before your certificate"}
        </p>
        <h1>{ar ? "كيف كانت الدورة؟" : "How was the course?"}</h1>
        <p className="feedback-intro">
          {ar
            ? "لا توجد إجابة صحيحة أو خاطئة، وإجاباتك لا تؤثّر في شهادتك."
            : "There are no right or wrong answers, and your answers do not affect your certificate."}
        </p>
        <p className="feedback-meta">
          {ar
            ? `عدد الأسئلة: ${questions.length} · المطلوب منها: ${requiredCount} · الخطوات: ${steps.length}`
            : `${questions.length} questions · ${requiredCount} required · ${steps.length} ${steps.length === 1 ? "step" : "steps"}`}
        </p>
        <p className="feedback-privacy">
          {ar
            ? "يطّلع فريق المنصة على إجاباتك مع اسمك، ولا يطّلع عليها المدرّب."
            : "The platform team sees your answers with your name. Instructors do not see them."}
        </p>
      </header>

      <ol className="feedback-steps" aria-label={ar ? "خطوات التقييم" : "Feedback steps"}>
        {steps.map((s, i) => (
          <li
            key={s.id}
            className={cn(i === stepIndex && "is-current", i < stepIndex && "is-past")}
            aria-current={i === stepIndex ? "step" : undefined}
          >
            <span className="feedback-step-num">{i + 1}</span>
            <span>{ar ? s.title.ar : s.title.en}</span>
          </li>
        ))}
      </ol>
      <div
        className="feedback-progress"
        role="progressbar"
        aria-label={ar ? "التقدّم في التقييم" : "Feedback progress"}
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={stepIndex + 1}
        aria-valuetext={
          ar
            ? `الخطوة ${stepIndex + 1} من ${steps.length}`
            : `Step ${stepIndex + 1} of ${steps.length}`
        }
      >
        <span style={{ inlineSize: `${((stepIndex + 1) / steps.length) * 100}%` }} />
      </div>

      <form
        className="feedback-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (last) void send();
          else next();
        }}
      >
        <h2 className="feedback-step-title">
          {ar
            ? `الخطوة ${stepIndex + 1} من ${steps.length}: `
            : `Step ${stepIndex + 1} of ${steps.length}: `}
          {ar ? step.title.ar : step.title.en}
        </h2>

        {showMissing && missing.length ? (
          <p className="feedback-alert" role="alert">
            {ar
              ? `أجب عن الأسئلة المحدّدة للمتابعة (${missing.length}).`
              : `Answer the marked questions to continue (${missing.length}).`}
          </p>
        ) : null}

        {step.questions.map((q) =>
          q.kind === "choice" ? (
            <ChoiceField
              key={q.id}
              q={q}
              n={numberOf.get(q.id) ?? 0}
              ar={ar}
              value={answers[q.id]}
              other={notes[otherKey(q.id)] ?? ""}
              missing={showMissing && missing.includes(q.id)}
              onChange={(v) => setAnswer(q.id, v)}
              onOther={(v) => setNote(otherKey(q.id), v)}
            />
          ) : (
            <TextField
              key={q.id}
              q={q}
              n={numberOf.get(q.id) ?? 0}
              ar={ar}
              value={notes[q.id] ?? ""}
              missing={showMissing && missing.includes(q.id)}
              onChange={(v) => setNote(q.id, v)}
            />
          ),
        )}

        <div className="feedback-actions">
          <p className="feedback-save" role="status" aria-live="polite">
            {saveNote}
          </p>
          <div className="feedback-buttons">
            {stepIndex > 0 ? (
              <button type="button" className="lms-reset" onClick={() => goToStep(stepIndex - 1)}>
                {ar ? "السابق" : "Back"}
              </button>
            ) : null}
            <button type="submit" className="action action-primary" disabled={submitting}>
              {last
                ? submitting
                  ? ar
                    ? "جارٍ الإرسال…"
                    : "Sending…"
                  : ar
                    ? "إرسال التقييم"
                    : "Send feedback"
                : ar
                  ? "التالي"
                  : "Next"}
            </button>
          </div>
        </div>
      </form>

      {view.certificateId ? (
        <p className="feedback-cert-note">
          <Award aria-hidden="true" />
          {ar ? "شهادتك صادرة مسبقاً، ويمكنك " : "Your certificate is already issued; you can "}
          <Link
            to="/learning-management-system/certificate/$id"
            params={{ id: view.certificateId }}
          >
            {ar ? "عرضها الآن" : "view it now"}
          </Link>
          .
        </p>
      ) : null}
    </>,
  );
}

function ChoiceField(props: {
  q: ChoiceQuestion;
  n: number;
  ar: boolean;
  value: string | undefined;
  other: string;
  missing: boolean;
  onChange: (value: string) => void;
  onOther: (value: string) => void;
}) {
  const { q, n, ar, value, other, missing, onChange, onOther } = props;
  const scale = q.choices.length <= 6 && !q.otherText;
  return (
    <fieldset
      className={cn("feedback-q", missing && "is-missing")}
      aria-invalid={missing || undefined}
    >
      <legend id={`q-${q.id}`} tabIndex={-1}>
        <span className="feedback-q-num">{n}</span>
        <span>{(ar ? q.ar : q.en) || q.ar}</span>
        {q.required ? null : <small>{ar ? "اختياري" : "Optional"}</small>}
      </legend>
      <div className={cn("feedback-choices", scale ? "is-scale" : "is-list")}>
        {q.choices.map((c) => {
          const id = `q-${q.id}-${c.id}`;
          return (
            <label
              key={c.id}
              htmlFor={id}
              className={cn("feedback-choice", value === c.id && "is-selected")}
            >
              <input
                id={id}
                type="radio"
                name={q.id}
                value={c.id}
                checked={value === c.id}
                onChange={() => onChange(c.id)}
              />
              <span>{(ar ? c.ar : c.en) || c.ar}</span>
            </label>
          );
        })}
      </div>
      {q.otherText && value === OTHER_ID ? (
        <div className="field feedback-other">
          <label htmlFor={`q-${q.id}-other-text`}>
            {ar ? "وضّح (اختياري)" : "Tell us more (optional)"}
          </label>
          <input
            id={`q-${q.id}-other-text`}
            type="text"
            maxLength={OTHER_TEXT_MAX}
            value={other}
            onChange={(e) => onOther(e.target.value)}
          />
        </div>
      ) : null}
      {missing ? (
        <p className="feedback-q-error">{ar ? "اختر إجابة واحدة." : "Choose one answer."}</p>
      ) : null}
    </fieldset>
  );
}

function TextField(props: {
  q: TextQuestion;
  n: number;
  ar: boolean;
  value: string;
  missing: boolean;
  onChange: (value: string) => void;
}) {
  const { q, n, ar, value, missing, onChange } = props;
  const id = `q-${q.id}`;
  const length = [...value].length;
  return (
    <div className={cn("field feedback-q feedback-text", missing && "is-missing")}>
      <label htmlFor={id}>
        <span className="feedback-q-num">{n}</span>
        <span>{(ar ? q.ar : q.en) || q.ar}</span>
        {q.required ? null : <small>{ar ? "اختياري" : "Optional"}</small>}
      </label>
      <textarea
        id={id}
        rows={4}
        maxLength={q.max}
        value={value}
        required={q.required}
        aria-invalid={missing || undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="hint feedback-count" aria-live="off">
        {length} / {q.max}
      </p>
      {missing ? (
        <p className="feedback-q-error">{ar ? "اكتب إجابتك." : "Write your answer."}</p>
      ) : null}
    </div>
  );
}
