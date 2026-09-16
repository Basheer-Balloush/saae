import { useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleHelp,
  ListChecks,
  Loader2,
  Send,
  TimerReset,
} from "lucide-react";
import { getUnansweredQuestions, isQuestionAnswered } from "@/lib/quiz-validation";

export type QuizQuestion = {
  question_key: string;
  question: string;
  choices: unknown;
  display_order: number;
};
type Props = {
  title: string;
  questions: QuizQuestion[];
  answers: Record<string, number>;
  onAnswer: (key: string, index: number) => void;
  onSubmit: () => void;
  onBack: () => void;
  onReview?: () => void;
  passScore: number;
  attemptsUsed: number;
  maxAttempts: number;
  cooldownMinutes: number;
  canAttempt: boolean;
  submitting: boolean;
  ar: boolean;
};

export function QuizAttempt({
  title,
  questions,
  answers,
  onAnswer,
  onSubmit,
  onBack,
  onReview,
  passScore,
  attemptsUsed,
  maxAttempts,
  cooldownMinutes,
  canAttempt,
  submitting,
  ar,
}: Props) {
  const [showMissing, setShowMissing] = useState(false);
  const questionNodes = useRef(new Map<string, HTMLFieldSetElement>());
  const missing = getUnansweredQuestions(questions, answers);
  const answered = questions.length - missing.length;
  const progress = questions.length ? Math.round((answered / questions.length) * 100) : 0;
  const disabled = submitting || !canAttempt;

  function goToQuestion(key: string) {
    const node = questionNodes.current.get(key);
    if (!node) return;
    node.focus({ preventScroll: true });
    node.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }

  function submit() {
    if (disabled || questions.length === 0) return;
    setShowMissing(true);
    if (missing.length) {
      // Wait for the error description to be mounted before moving keyboard focus.
      requestAnimationFrame(() => goToQuestion(missing[0].question_key));
      return;
    }
    onSubmit();
  }

  return (
    <section className="quiz-page page-shell" dir={ar ? "rtl" : "ltr"}>
      <button type="button" className="quiz-back" onClick={onBack} disabled={submitting}>
        <ArrowRight aria-hidden="true" />
        {ar ? "العودة إلى الاختبارات" : "Back to quizzes"}
      </button>
      <header className="quiz-heading">
        <p className="quiz-eyebrow">
          <ListChecks size={18} aria-hidden="true" />
          {ar ? "اختبار الدورة" : "COURSE QUIZ"}
        </p>
        <h1>{title}</h1>
        <div className="quiz-facts">
          <span>
            {ar ? "درجة النجاح" : "Passing score"} <b>{passScore}%</b>
          </span>
          <span>
            {ar ? "المحاولة" : "Attempt"}{" "}
            <b>
              {Math.min(attemptsUsed + 1, maxAttempts)} / {maxAttempts}
            </b>
          </span>
          {onReview && (
            <button
              className="quiz-text-button"
              type="button"
              onClick={onReview}
              disabled={submitting}
            >
              {ar ? "مراجعة المحاولة السابقة" : "Review previous attempt"}
            </button>
          )}
        </div>
      </header>
      {cooldownMinutes > 0 && (
        <p className="quiz-notice">
          <TimerReset aria-hidden="true" size={20} />
          {ar
            ? `يمكن إعادة المحاولة بعد ${cooldownMinutes} دقيقة`
            : `Next attempt available in ${cooldownMinutes} min`}
        </p>
      )}
      <div className="quiz-workspace">
        <aside
          className="quiz-sidebar"
          aria-label={ar ? "تقدّم الاختبار والتنقل" : "Quiz progress and navigation"}
        >
          <div className="quiz-progress-head">
            <span>{ar ? "تقدّمك" : "Your progress"}</span>
            <b>{progress}%</b>
          </div>
          <progress
            className="quiz-progress"
            value={answered}
            max={questions.length || 1}
            aria-label={ar ? "الأسئلة المُجابة" : "Answered questions"}
          />
          <p className="quiz-progress-copy" aria-live="polite">
            {ar
              ? `أجبت عن ${answered} من ${questions.length} سؤالاً`
              : `${answered} of ${questions.length} questions answered`}
          </p>
          <p className="quiz-progress-copy quiz-draft-note">
            {ar
              ? "تُحفظ إجاباتك على هذا الجهاز حتى ترسل الاختبار."
              : "Your answers are saved on this device until you submit."}
          </p>
          <nav
            className="quiz-question-nav"
            aria-label={ar ? "انتقل إلى سؤال" : "Jump to a question"}
          >
            {questions.map((question, i) => {
              const done = isQuestionAnswered(question, answers);
              return (
                <button
                  key={question.question_key}
                  type="button"
                  className={`${done ? "is-answered" : showMissing ? "is-missing" : ""}`}
                  onClick={() => goToQuestion(question.question_key)}
                  aria-label={
                    ar
                      ? `السؤال ${i + 1}، ${done ? "تمت الإجابة" : "لم تتم الإجابة"}`
                      : `Question ${i + 1}, ${done ? "answered" : "unanswered"}`
                  }
                >
                  {i + 1}
                  {done && <Check size={11} aria-hidden="true" />}
                </button>
              );
            })}
          </nav>
          <div className="quiz-nav-legend">
            <span>
              <CheckCircle2 size={16} aria-hidden="true" />
              {ar ? "تمت الإجابة" : "Answered"}
            </span>
            <span>
              <CircleHelp size={16} aria-hidden="true" />
              {ar ? "بانتظار الإجابة" : "Unanswered"}
            </span>
          </div>
          <p className="quiz-sidebar-note">
            {ar
              ? "أجب عن جميع الأسئلة قبل إرسال الاختبار. يمكنك العودة إلى أي سؤال لتعديل إجابتك."
              : "Answer every question before submitting. You can revisit any question to change your answer."}
          </p>
        </aside>
        <div className="quiz-questions">
          {questions.map((question, i) => {
            const done = isQuestionAnswered(question, answers);
            const invalid = showMissing && !done;
            const choices = Array.isArray(question.choices) ? (question.choices as string[]) : [];
            return (
              <fieldset
                key={question.question_key}
                ref={(node) => {
                  if (node) questionNodes.current.set(question.question_key, node);
                  else questionNodes.current.delete(question.question_key);
                }}
                tabIndex={-1}
                className={`quiz-question${invalid ? " is-missing" : ""}${done ? " is-answered" : ""}`}
                aria-describedby={invalid ? `quiz-error-${i}` : undefined}
                aria-invalid={invalid || undefined}
                disabled={disabled}
              >
                <legend className="sr-only">
                  {ar
                    ? `السؤال ${i + 1}: ${question.question}`
                    : `Question ${i + 1}: ${question.question}`}
                </legend>
                <div className="quiz-question-top">
                  <span className="quiz-question-number">
                    {ar ? `السؤال ${i + 1}` : `QUESTION ${String(i + 1).padStart(2, "0")}`}
                  </span>
                  <span className="quiz-answer-state">
                    {done ? (
                      <>
                        <CheckCircle2 size={16} aria-hidden="true" />
                        {ar ? "تمت الإجابة" : "Answered"}
                      </>
                    ) : ar ? (
                      "اختر إجابة واحدة"
                    ) : (
                      "Choose one answer"
                    )}
                  </span>
                </div>
                <h2>{question.question}</h2>
                <div className="quiz-options">
                  {choices.map((choice, index) => (
                    <label
                      key={index}
                      className={`quiz-option${answers[question.question_key] === index ? " is-selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name={`quiz-${question.question_key}`}
                        value={index}
                        checked={answers[question.question_key] === index}
                        onChange={() => onAnswer(question.question_key, index)}
                      />
                      <span className="quiz-option-letter" aria-hidden="true">
                        {ar
                          ? (["أ", "ب", "ج", "د", "هـ", "و"][index] ?? index + 1)
                          : index < 26
                            ? String.fromCharCode(65 + index)
                            : index + 1}
                      </span>
                      <span className="quiz-option-text">{choice}</span>
                      <span className="quiz-option-check" aria-hidden="true">
                        {answers[question.question_key] === index && <Check size={16} />}
                      </span>
                    </label>
                  ))}
                </div>
                {invalid && (
                  <p id={`quiz-error-${i}`} className="quiz-question-error">
                    {ar
                      ? "اختر إجابة لهذا السؤال قبل الإرسال."
                      : "Choose an answer for this question before submitting."}
                  </p>
                )}
              </fieldset>
            );
          })}
          <div className="quiz-submit-panel">
            <div aria-live="polite" aria-atomic="true">
              <h2>
                {missing.length
                  ? ar
                    ? "راجع إجاباتك"
                    : "Review your answers"
                  : ar
                    ? "أجبت عن جميع الأسئلة"
                    : "Every question answered"}
              </h2>
              <p className={showMissing && missing.length ? "quiz-question-error" : ""}>
                {missing.length
                  ? ar
                    ? `تبقّى ${missing.length} سؤالاً. عند الإرسال سننقلك إلى أول سؤال لم تُجب عنه.`
                    : `${missing.length} unanswered. Submit will take you to the first one.`
                  : ar
                    ? "يمكنك الآن إرسال الاختبار للاطّلاع على نتيجتك."
                    : "You’re ready to submit and see your result."}
              </p>
            </div>
            <button
              type="button"
              className="quiz-button quiz-button-primary"
              onClick={submit}
              disabled={disabled || questions.length === 0}
            >
              {submitting ? (
                <Loader2 className="animate-spin" size={18} aria-hidden="true" />
              ) : (
                <Send size={18} aria-hidden="true" />
              )}
              {submitting
                ? ar
                  ? "جارٍ الإرسال…"
                  : "Submitting…"
                : ar
                  ? "إرسال الاختبار"
                  : "Submit quiz"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
