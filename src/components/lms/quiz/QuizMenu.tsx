import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  Lock,
  RotateCcw,
} from "lucide-react";

export type QuizListItem = {
  id: string;
  title: string;
  pass_score: number;
  max_attempts: number;
  created_at: string;
  session_title: string | null;
  section_title: string | null;
  question_count: number;
  last_score: number | null;
  last_passed: boolean | null;
  last_correct: number | null;
  last_total: number | null;
  attempts_used: number;
  has_passed: boolean;
};
type Props = { list: QuizListItem[]; courseId: string; ar: boolean; onBack: () => void };

export function QuizMenu({ list, courseId, ar, onBack }: Props) {
  const passed = list.filter((q) => q.has_passed).length;
  const available = list.filter(
    (q) => !q.has_passed && q.attempts_used < q.max_attempts && q.question_count > 0,
  ).length;
  return (
    <section className="quiz-page page-shell" dir={ar ? "rtl" : "ltr"}>
      <button type="button" className="quiz-back" onClick={onBack}>
        <ArrowRight aria-hidden="true" />
        {ar ? "العودة إلى الدورة" : "Back to course"}
      </button>
      <header className="quiz-menu-heading">
        <div className="quiz-heading">
          <p className="quiz-eyebrow">
            <ClipboardList size={18} aria-hidden="true" />
            {ar ? "منصة التعلّم" : "LEARNING PLATFORM"}
          </p>
          <h1>{ar ? "اختبارات الدورة" : "Course quizzes"}</h1>
          <p className="quiz-intro">
            {ar
              ? "اختر اختبارك، أكمل إجاباتك، وتابع تقدّمك."
              : "Choose a quiz, complete your answers, and track your progress."}
          </p>
        </div>
        <dl className="quiz-menu-summary">
          <div>
            <dt>{ar ? "الاختبارات" : "Quizzes"}</dt>
            <dd>{list.length}</dd>
          </div>
          <div>
            <dt>{ar ? "اجتزتها" : "Passed"}</dt>
            <dd>{passed}</dd>
          </div>
          <div>
            <dt>{ar ? "متبقية" : "To attempt"}</dt>
            <dd>{available}</dd>
          </div>
        </dl>
      </header>
      {list.length === 0 ? (
        <div className="quiz-empty">
          <ClipboardList size={36} aria-hidden="true" />
          <h2>{ar ? "لا توجد اختبارات بعد" : "No quizzes yet"}</h2>
          <p>
            {ar
              ? "ستظهر اختبارات الدورة هنا عندما يضيفها المدرّب."
              : "Your course quizzes will appear here when your instructor adds them."}
          </p>
        </div>
      ) : (
        <div className="quiz-menu-grid">
          {list.map((q, index) => {
            const taken = q.attempts_used > 0 && q.last_score !== null;
            const exhausted = !q.has_passed && q.attempts_used >= q.max_attempts;
            const canAttempt = !q.has_passed && !exhausted && q.question_count > 0;
            const status = q.has_passed
              ? ar
                ? "اجتزت الاختبار"
                : "Passed"
              : exhausted
                ? ar
                  ? "اكتملت المحاولات"
                  : "Attempts used"
                : taken
                  ? ar
                    ? "حاول مجدداً"
                    : "Try again"
                  : ar
                    ? "لم تبدأ بعد"
                    : "Not started";
            return (
              <article key={q.id} className={`quiz-menu-card${q.has_passed ? " is-passed" : ""}`}>
                <div className="quiz-card-top">
                  <span className="quiz-card-index" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={`quiz-status${q.has_passed ? " is-passed" : exhausted ? " is-locked" : ""}`}
                  >
                    {q.has_passed ? (
                      <CheckCircle2 size={15} aria-hidden="true" />
                    ) : exhausted ? (
                      <Lock size={15} aria-hidden="true" />
                    ) : null}
                    {status}
                  </span>
                </div>
                <h2>{q.session_title || q.section_title || q.title}</h2>
                <dl className="quiz-card-facts">
                  <div>
                    <dt>{ar ? "الأسئلة" : "Questions"}</dt>
                    <dd>{q.question_count}</dd>
                  </div>
                  <div>
                    <dt>{ar ? "درجة النجاح" : "Passing score"}</dt>
                    <dd>{q.pass_score}%</dd>
                  </div>
                  <div>
                    <dt>{ar ? "المحاولات" : "Attempts"}</dt>
                    <dd>
                      {q.attempts_used} / {q.max_attempts}
                    </dd>
                  </div>
                </dl>
                {taken && (
                  <div className="quiz-last-score">
                    <span>{ar ? "نتيجة آخر محاولة" : "Latest score"}</span>
                    <b>
                      {Math.round(q.last_score!)}%
                      {q.last_correct !== null && q.last_total !== null && (
                        <small>
                          {" "}
                          · {q.last_correct} / {q.last_total}
                        </small>
                      )}
                    </b>
                  </div>
                )}
                <div className="quiz-card-actions">
                  {canAttempt && (
                    <Link
                      className="quiz-button quiz-button-primary"
                      to="/learning-management-system/student/quiz/$courseId"
                      params={{ courseId }}
                      search={{ quiz: q.id, review: undefined }}
                    >
                      {taken ? (
                        <RotateCcw size={17} aria-hidden="true" />
                      ) : (
                        <ArrowUpRight size={18} aria-hidden="true" />
                      )}
                      {taken
                        ? ar
                          ? "إعادة الاختبار"
                          : "Retake quiz"
                        : ar
                          ? "ابدأ الاختبار"
                          : "Start quiz"}
                    </Link>
                  )}
                  {taken && (
                    <Link
                      className="quiz-button quiz-button-secondary"
                      to="/learning-management-system/student/quiz/$courseId"
                      params={{ courseId }}
                      search={{ quiz: q.id, review: true }}
                    >
                      {ar ? "مراجعة الإجابات" : "Review answers"}
                    </Link>
                  )}
                  {!taken && q.question_count === 0 && (
                    <p className="quiz-muted">
                      {ar ? "الاختبار قيد الإعداد" : "Questions are being prepared"}
                    </p>
                  )}
                </div>
                {q.has_passed && (
                  <p className="quiz-card-note">
                    {ar
                      ? "اجتزت هذا الاختبار. يمكنك مراجعة إجاباتك في أي وقت."
                      : "Quiz passed. You can revisit your answers at any time."}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
