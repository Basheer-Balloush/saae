import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toUserMessage } from "@/lib/safe-error";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Award, Loader2, CheckCircle2, XCircle, ArrowRight, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { QuizMenu, type QuizListItem } from "@/components/lms/quiz/QuizMenu";
import { QuizAttempt } from "@/components/lms/quiz/QuizAttempt";
import { getUnansweredQuestions } from "@/lib/quiz-validation";
import { LMS_SKIN_LINKS } from "@/components/lms-skin/skin";
import { sendCertificateEmail } from "@/lib/certificate-email.functions";

export const Route = createFileRoute("/learning-management-system/student/quiz/$courseId")({
  head: () => ({
    meta: [{ title: "LMS · Quizzes" }],
    links: [...LMS_SKIN_LINKS, { rel: "stylesheet", href: "/lms/css/quiz.css" }],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    quiz: typeof search.quiz === "string" ? search.quiz : undefined,
    review: search.review === "1" || search.review === true ? true : undefined,
  }),
  component: QuizPage,
});

type QuizMeta = {
  id: string;
  title: string;
  pass_score: number;
  version: number;
  max_attempts: number;
  cooldown_minutes: number;
};
type Question = { question_key: string; question: string; choices: unknown; display_order: number };
type LoadedState = {
  quiz: QuizMeta;
  questions: Question[];
  attempts_used: number;
  attempts_remaining: number;
  next_attempt_at: string | null;
  last_passed: boolean;
  has_passed: boolean;
  can_attempt: boolean;
};
type Result = {
  score: number;
  passed: boolean;
  total: number;
  correct: number;
  attempt_number: number;
  attempts_remaining: number;
  next_attempt_at: string | null;
  certificate_id: string | null;
  quiz_version: number;
};
type ReviewQuestion = Question & {
  correct_index: number;
  selected_index: number | null;
  is_correct: boolean;
};
type ReviewData =
  | { has_attempt: false }
  | {
      has_attempt: true;
      quiz: { id: string; title: string; pass_score: number; max_attempts: number };
      questions: ReviewQuestion[];
      score: number;
      passed: boolean;
      total: number;
      correct: number;
      attempt_number: number;
      attempts_used: number;
      submitted_at: string;
    };

function QuizPage() {
  const { courseId } = Route.useParams();
  const { quiz: selectedQuizId, review: reviewParam } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useLmsAuth();
  const { lang } = useLang();
  const tr = lmsT[lang];
  const ar = lang === "ar";

  const [list, setList] = useState<QuizListItem[] | null>(null);
  const [listError, setListError] = useState(false);
  const [state, setState] = useState<LoadedState | null>(null);
  const [review, setReview] = useState<ReviewData | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const submitInFlight = useRef(false);
  const [result, setResult] = useState<Result | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [listKey, setListKey] = useState(0);

  const sendCertEmail = useServerFn(sendCertificateEmail);

  // Quiz title always comes from the linked session (or section) — never a generic name.
  const quizName = useCallback(
    (q: { session_title?: string | null; section_title?: string | null; title: string }) =>
      q.session_title || q.section_title || q.title,
    [],
  );

  // Load the course quiz list (always, so statuses stay fresh after submissions)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setListError(false);
      const { data, error } = await supabase.rpc(
        "lms_list_course_quizzes" as never,
        { _course_id: courseId } as never,
      );
      if (cancelled) return;
      if (error) {
        setListError(true);
        setList([]);
        return;
      }
      setList((data as unknown as QuizListItem[]) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId, user, reloadKey, listKey]);

  // Load the selected quiz: attempt state + saved attempt (for review)
  useEffect(() => {
    if (!user) return;
    if (!selectedQuizId) {
      setState(null);
      setReview(null);
      setResult(null);
      setShowReview(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(false);
      setResult(null);
      setShowReview(false);
      setAnswers({});
      const [attemptRes, reviewRes] = await Promise.all([
        supabase.rpc("lms_get_quiz_for_attempt" as never, { _quiz_id: selectedQuizId } as never),
        supabase.rpc("lms_get_quiz_review" as never, { _quiz_id: selectedQuizId } as never),
      ]);
      if (cancelled) return;
      if (attemptRes.error) {
        console.error("quiz load failed", attemptRes.error);
        setLoadError(true);
        setLoading(false);
        return;
      }
      setState(attemptRes.data as unknown as LoadedState);
      setReview(reviewRes.error ? null : (reviewRes.data as unknown as ReviewData));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedQuizId, user, reloadKey]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const cooldownRemainingMs = useMemo(() => {
    if (!state?.next_attempt_at) return 0;
    const target = new Date(state.next_attempt_at).getTime();
    return Math.max(0, target - now);
  }, [state?.next_attempt_at, now]);

  const cooldownActive = cooldownRemainingMs > 0;

  const goToCourse = () =>
    navigate({ to: "/learning-management-system/courses/$id", params: { id: courseId } });

  const goToList = () =>
    navigate({
      to: "/learning-management-system/student/quiz/$courseId",
      params: { courseId },
      search: { quiz: undefined, review: undefined },
    });

  const backToCourse = (
    <Button variant="outline" className="mt-4" onClick={goToCourse}>
      <ArrowRight className="h-4 w-4 mx-1 rtl:rotate-180" />
      {tr.backToCourse}
    </Button>
  );

  const onSubmit = async () => {
    if (
      !state ||
      submitInFlight.current ||
      !state.can_attempt ||
      cooldownActive ||
      !state.questions.length
    )
      return;
    if (getUnansweredQuestions(state.questions, answers).length) return;
    submitInFlight.current = true;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc(
        "lms_submit_quiz_v2" as never,
        { _quiz_id: state.quiz.id, _answers: answers } as never,
      );
      if (error) {
        // Surface the real reason instead of a blanket failure message.
        console.error("quiz submit failed", error);
        const msg = [
          (error as { message?: string }).message,
          (error as { details?: string }).details,
          (error as { hint?: string }).hint,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (msg.includes("incomplete_answers") || msg.includes("invalid_answers")) {
          toast.error(
            ar
              ? "يرجى الإجابة عن جميع الأسئلة. إذا تغيّر الاختبار، أعد تحميله قبل المحاولة."
              : "Please answer every question. If the quiz changed, reload it before trying again.",
          );
        } else if (msg.includes("already_passed")) {
          toast.error(tr.quizLockedPassed);
          setReloadKey((k) => k + 1);
        } else if (msg.includes("attempts_exhausted")) {
          toast.error(tr.quizLockedAttempts);
          setReloadKey((k) => k + 1);
        } else if (msg.includes("cooldown_active")) {
          toast.error(tr.quizCooldown);
        } else if (msg.includes("not enrolled")) {
          toast.error(tr.quizNotEnrolled);
        } else if (msg.includes("quiz not found")) {
          toast.error(tr.quizLoadError);
        } else if (msg.includes("unauthenticated")) {
          toast.error(
            ar
              ? "انتهت الجلسة، يرجى تسجيل الدخول مجدداً."
              : "Your session expired — please sign in again.",
          );
        } else {
          toast.error(toUserMessage(error));
        }
        return;
      }
      setResult(data as Result);
      // Refresh list statuses and the saved-attempt review data WITHOUT remounting
      // the attempt loader (that would wipe the freshly shown result).
      setListKey((k) => k + 1);
      void (async () => {
        const [attemptRes, reviewRes] = await Promise.all([
          supabase.rpc("lms_get_quiz_for_attempt" as never, { _quiz_id: state.quiz.id } as never),
          supabase.rpc("lms_get_quiz_review" as never, { _quiz_id: state.quiz.id } as never),
        ]);
        if (!attemptRes.error) setState(attemptRes.data as unknown as LoadedState);
        if (!reviewRes.error) setReview(reviewRes.data as unknown as ReviewData);
      })();
      if ((data as Result | null)?.certificate_id) {
        sendCertEmail({ data: { courseId, lang } }).catch((e) =>
          console.error("cert email failed", e),
        );
      }
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      submitInFlight.current = false;
      setSubmitting(false);
    }
  };

  // ---------- Quiz list view ----------
  if (!selectedQuizId) {
    if (!list)
      return (
        <div className="quiz-page page-shell quiz-empty" role="status">
          <Loader2 className="animate-spin" />
          <p>{tr.loading}</p>
        </div>
      );
    if (listError)
      return (
        <section className="quiz-page page-shell quiz-empty" dir={ar ? "rtl" : "ltr"}>
          <h1>{tr.quizLoadError}</h1>
          <div className="quiz-card-actions">
            <Button onClick={() => setListKey((k) => k + 1)}>{tr.retry}</Button>
            {backToCourse}
          </div>
        </section>
      );
    return <QuizMenu list={list} courseId={courseId} ar={ar} onBack={goToCourse} />;
  }

  // ---------- Selected quiz views ----------
  const selectedMeta = list?.find((q) => q.id === selectedQuizId);
  const title = selectedMeta ? quizName(selectedMeta) : state?.quiz.title || tr.quizzes;

  const quizzesLink = (
    <Button variant="outline" onClick={goToList}>
      {tr.backToQuizzes}
    </Button>
  );

  if (loading) {
    return (
      <p className="quiz-page page-shell quiz-empty" role="status">
        <Loader2 className="inline h-5 w-5 animate-spin mx-2" />
        {tr.loading}
      </p>
    );
  }

  if (loadError || !state) {
    return (
      <div className="quiz-page page-shell quiz-empty" dir={ar ? "rtl" : "ltr"}>
        <p className="text-muted-foreground">{tr.quizLoadError}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => setReloadKey((k) => k + 1)}>{tr.retry}</Button>
          {quizzesLink}
        </div>
      </div>
    );
  }

  const canAttempt = state.can_attempt && !cooldownActive;
  const reviewData = review && review.has_attempt ? review : null;
  // Read-only review is forced whenever the student may not attempt again.
  const mustReview = !state.can_attempt;
  const wantsReview = !!reviewParam || showReview || mustReview;

  const reviewView = reviewData && (
    <div className="quiz-page page-shell quiz-review" dir={ar ? "rtl" : "ltr"}>
      <Button variant="ghost" size="sm" className="mb-3 -mx-2" onClick={goToList}>
        <ArrowRight className="h-4 w-4 mx-1 rtl:rotate-180" />
        {tr.quizzes}
      </Button>
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            reviewData.passed
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {reviewData.passed ? tr.quizStatusPassed : tr.quizStatusFailed}
        </span>
        <span className="text-sm text-muted-foreground">
          {tr.score}:{" "}
          <b>
            {reviewData.correct} / {reviewData.total}
          </b>{" "}
          ({Math.round(reviewData.score)}%)
        </span>
        <span className="text-sm text-muted-foreground">
          {tr.attemptsLabel}: {reviewData.attempts_used} / {state.quiz.max_attempts}
        </span>
      </div>

      <div className="mt-6 space-y-5">
        {reviewData.questions.map((q, i) => {
          const choices = Array.isArray(q.choices) ? (q.choices as string[]) : [];
          return (
            <div
              key={q.question_key}
              className={`quiz-question quiz-review-question ${
                q.is_correct ? "border-emerald-500/50" : "border-destructive/50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="quiz-review-prompt">
                  {i + 1}. {q.question}
                </div>
                <span
                  className={`shrink-0 inline-flex items-center gap-1 text-xs font-semibold ${
                    q.is_correct ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                  }`}
                >
                  {q.is_correct ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  {q.is_correct ? tr.answerCorrect : tr.answerIncorrect}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {choices.map((c, idx) => {
                  const isCorrect = idx === q.correct_index;
                  const isSelected = idx === q.selected_index;
                  return (
                    <div
                      key={idx}
                      className={`quiz-review-option flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                        isCorrect
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                          : isSelected
                            ? "border-destructive bg-destructive/10"
                            : "border-border"
                      }`}
                    >
                      <span className="flex-1">{c}</span>
                      {isSelected && (
                        <span className="text-xs text-muted-foreground">{tr.yourAnswer}</span>
                      )}
                      {isCorrect && (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          {tr.correctAnswer}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {q.selected_index === null && (
                <p className="mt-2 text-xs text-muted-foreground">{tr.notAnswered}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {quizzesLink}
        {canAttempt && (
          <Button
            onClick={() => {
              setShowReview(false);
              navigate({
                to: "/learning-management-system/student/quiz/$courseId",
                params: { courseId },
                search: { quiz: selectedQuizId, review: undefined },
              });
              setReloadKey((k) => k + 1);
            }}
          >
            {tr.retakeQuiz}
          </Button>
        )}
        <Button variant="outline" onClick={goToCourse}>
          {tr.backToCourse}
        </Button>
      </div>
    </div>
  );

  // ---------- Post-submission result ----------
  if (result) {
    return (
      <div className="quiz-page page-shell quiz-result-wrap" dir={ar ? "rtl" : "ltr"}>
        <div className={`quiz-result${result.passed ? " is-passed" : ""}`}>
          {result.passed ? (
            <>
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
              <h2 className="mt-3 text-2xl font-bold text-foreground">{tr.testPassed}</h2>
            </>
          ) : (
            <>
              <XCircle className="mx-auto h-14 w-14 text-destructive" />
              <h2 className="mt-3 text-2xl font-bold text-foreground">{tr.testFailed}</h2>
            </>
          )}
          <p className="mt-1 text-sm text-muted-foreground">{title}</p>
          <div
            className="quiz-score-orbit"
            style={{
              background: `conic-gradient(${result.passed ? "#a8cf7e" : "#77e0e8"} ${Math.min(100, Math.max(0, result.score))}%, rgba(184,232,240,.12) 0)`,
            }}
          >
            <div>
              <strong>
                {Math.round(result.score)}
                <small>%</small>
              </strong>
              <span>{tr.yourScore}</span>
            </div>
          </div>
          <p className="quiz-result-detail">
            {ar
              ? `${result.correct} إجابات صحيحة من أصل ${result.total}`
              : `${result.correct} correct answers out of ${result.total}`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {tr.attemptsLabel}: {result.attempt_number} / {state.quiz.max_attempts}
          </p>
          {result.certificate_id && (
            <Link
              to="/learning-management-system/certificate/$id"
              params={{ id: result.certificate_id }}
            >
              <Button className="mt-6">
                <Award className="h-4 w-4 mx-1" />
                {tr.viewCertificate}
              </Button>
            </Link>
          )}
          {result.passed && !result.certificate_id && (
            <p className="mt-4 text-sm text-muted-foreground">{tr.mustCompleteFirst}</p>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                setShowReview(true);
              }}
            >
              {tr.reviewAnswers}
            </Button>
            {!result.passed && result.attempts_remaining > 0 && (
              <Button
                onClick={() => {
                  setResult(null);
                  setShowReview(false);
                  setReloadKey((k) => k + 1);
                }}
              >
                {tr.retakeQuiz}
              </Button>
            )}
            {quizzesLink}
            <Button variant="ghost" onClick={goToCourse}>
              {tr.backToCourse}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Review mode (read-only) ----------
  if (wantsReview && reviewData) return reviewView;

  // Locked with nothing to review (shouldn't normally happen)
  if (mustReview) {
    return (
      <div className="quiz-page page-shell quiz-empty" dir={ar ? "rtl" : "ltr"}>
        <Lock className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-3 text-muted-foreground">
          {state.has_passed ? tr.quizLockedPassed : tr.quizLockedAttempts}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{tr.noAttemptToReview}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {quizzesLink}
          <Button onClick={goToCourse}>{tr.backToCourse}</Button>
        </div>
      </div>
    );
  }

  if (state.questions.length === 0) {
    return (
      <div className="quiz-page page-shell quiz-empty" dir={ar ? "rtl" : "ltr"}>
        <h2 className="text-xl font-bold text-foreground">{tr.quizNotReady}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{tr.quizNotReadyHint}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
            {tr.retry}
          </Button>
          {quizzesLink}
        </div>
      </div>
    );
  }

  const cooldownMinutes = Math.ceil(cooldownRemainingMs / 60000);

  // ---------- Answering mode ----------
  return (
    <QuizAttempt
      key={`${selectedQuizId}-${reloadKey}`}
      title={title}
      questions={state.questions}
      answers={answers}
      onAnswer={(key, index) => setAnswers((current) => ({ ...current, [key]: index }))}
      onSubmit={onSubmit}
      onBack={goToList}
      onReview={reviewData ? () => setShowReview(true) : undefined}
      passScore={state.quiz.pass_score}
      attemptsUsed={state.attempts_used}
      maxAttempts={state.quiz.max_attempts}
      cooldownMinutes={cooldownMinutes}
      canAttempt={canAttempt}
      submitting={submitting}
      ar={ar}
    />
  );
}
