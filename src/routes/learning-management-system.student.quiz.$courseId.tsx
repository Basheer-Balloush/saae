import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toUserMessage } from "@/lib/safe-error";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, Loader2, CheckCircle2, XCircle, TimerReset, ArrowRight, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { sendCertificateEmail } from "@/lib/certificate-email.functions";

export const Route = createFileRoute("/learning-management-system/student/quiz/$courseId")({
  head: () => ({ meta: [{ title: "LMS · Quizzes" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    quiz: typeof search.quiz === "string" ? search.quiz : undefined,
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
type QuizListItem = {
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

function QuizPage() {
  const { courseId } = Route.useParams();
  const { quiz: selectedQuizId } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useLmsAuth();
  const { lang } = useLang();
  const tr = lmsT[lang];
  const ar = lang === "ar";

  const [list, setList] = useState<QuizListItem[] | null>(null);
  const [listError, setListError] = useState(false);
  const [state, setState] = useState<LoadedState | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

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
      if (error) { setListError(true); setList([]); return; }
      setList((data as unknown as QuizListItem[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, [courseId, user, reloadKey]);

  // Load the selected quiz for attempting
  useEffect(() => {
    if (!user) return;
    if (!selectedQuizId) { setState(null); setResult(null); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(false);
      setResult(null);
      setAnswers({});
      const { data, error } = await supabase.rpc(
        "lms_get_quiz_for_attempt" as never,
        { _quiz_id: selectedQuizId } as never,
      );
      if (cancelled) return;
      if (error) { setLoadError(true); setLoading(false); return; }
      setState(data as unknown as LoadedState);
      setLoading(false);
    })();
    return () => { cancelled = true; };
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
  const attemptsExhausted = !!state && state.attempts_remaining <= 0;

  const goToCourse = () =>
    navigate({ to: "/learning-management-system/courses/$id", params: { id: courseId } });

  const backToCourse = (
    <Button variant="outline" className="mt-4" onClick={goToCourse}>
      <ArrowRight className="h-4 w-4 mx-1 rtl:rotate-180" />
      {tr.backToCourse}
    </Button>
  );

  const onSubmit = async () => {
    if (!state) return;
    setSubmitting(true);
    const { data, error } = await supabase.rpc(
      "lms_submit_quiz_v2" as never,
      { _quiz_id: state.quiz.id, _answers: answers } as never,
    );
    setSubmitting(false);
    if (error) {
      const msg = String((error as { message?: string }).message ?? "");
      if (msg.includes("already_passed")) {
        toast.error(tr.quizLockedPassed);
        setReloadKey((k) => k + 1);
      } else if (msg.includes("attempts_exhausted")) {
        toast.error(tr.quizLockedAttempts);
        setReloadKey((k) => k + 1);
      } else if (msg.includes("cooldown_active")) {
        toast.error(ar ? "لم تنتهِ فترة الانتظار بعد" : "Cooldown is still active");
      } else {
        toast.error(toUserMessage(error));
      }
      return;
    }
    setResult(data as Result);
    setReloadKey((k) => k + 1); // refresh list statuses
    if ((data as Result | null)?.certificate_id) {
      sendCertEmail({ data: { courseId, lang } }).catch((e) => console.error("cert email failed", e));
    }
  };

  const scoreText = (q: QuizListItem) => {
    if (q.attempts_used === 0 || q.last_score === null) return "--";
    const total = q.last_total ?? q.question_count;
    if (total > 0) {
      const correct = q.last_correct ?? Math.round(((q.last_score ?? 0) / 100) * total);
      return `${correct} / ${total}`;
    }
    return `${Math.round(q.last_score ?? 0)}%`;
  };

  // ---------- Quiz list view ----------
  if (!selectedQuizId) {
    if (!list) {
      return (
        <p className="text-center py-20 text-muted-foreground">
          <Loader2 className="inline h-5 w-5 animate-spin mx-2" />
          {tr.loading}
        </p>
      );
    }
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-foreground">{tr.quizzes}</h1>
        {listError && <p className="mt-4 text-sm text-muted-foreground">{tr.quizLoadError}</p>}
        {!listError && list.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">{tr.noTestYet}</p>
        )}
        <div className="mt-6 grid gap-4">
          {list.map((q) => {
            const taken = q.attempts_used > 0 && q.last_score !== null;
            const passed = !!q.has_passed;
            const exhausted = !passed && q.attempts_used >= q.max_attempts;
            const locked = passed || exhausted;
            return (
              <div key={q.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-foreground">{quizName(q)}</h2>
                    <span
                      className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        !taken
                          ? "bg-muted text-muted-foreground"
                          : passed
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {!taken ? tr.quizStatusNotTaken : passed ? tr.quizStatusPassed : tr.quizStatusFailed}
                    </span>
                  </div>
                  {passed ? (
                    <Link
                      to="/learning-management-system/student/quiz/$courseId"
                      params={{ courseId }}
                      search={{ quiz: q.id }}
                    >
                      <Button size="sm" variant="outline">{tr.viewResult}</Button>
                    </Link>
                  ) : exhausted ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Lock className="h-3.5 w-3.5" />
                      {tr.quizLockedAttempts}
                    </span>
                  ) : (
                    <Link
                      to="/learning-management-system/student/quiz/$courseId"
                      params={{ courseId }}
                      search={{ quiz: q.id }}
                    >
                      <Button size="sm">{taken ? tr.retakeQuiz : tr.startQuiz}</Button>
                    </Link>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                  <span>{tr.score}: {scoreText(q)}</span>
                  <span>{tr.attemptsLabel}: {q.attempts_used} / {q.max_attempts}</span>
                </div>
                {locked && passed && (
                  <p className="mt-2 text-xs text-muted-foreground">{tr.quizLockedPassed}</p>
                )}
              </div>
            );
          })}
        </div>
        <div>{backToCourse}</div>
      </div>
    );
  }

  // ---------- Selected quiz views ----------
  const selectedMeta = list?.find((q) => q.id === selectedQuizId);
  const title = selectedMeta ? quizName(selectedMeta) : state?.quiz.title || tr.quizzes;

  const quizzesLink = (
    <Link to="/learning-management-system/student/quiz/$courseId" params={{ courseId }} search={{ quiz: undefined }}>
      <Button variant="outline">{tr.quizzes}</Button>
    </Link>
  );

  if (loading) {
    return (
      <p className="text-center py-20 text-muted-foreground">
        <Loader2 className="inline h-5 w-5 animate-spin mx-2" />
        {tr.loading}
      </p>
    );
  }

  if (loadError || !state) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <p className="text-muted-foreground">{tr.quizLoadError}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => setReloadKey((k) => k + 1)}>{tr.retry}</Button>
          {quizzesLink}
        </div>
      </div>
    );
  }

  // Locked: already passed, or attempts used up — show the saved result, never the questions.
  const alreadyPassed = state.last_passed || !!selectedMeta?.has_passed;
  if (!result && (alreadyPassed || attemptsExhausted)) {
    return (
      <div className="mx-auto max-w-xl px-6 py-12">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          {alreadyPassed ? (
            <>
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
              <h2 className="mt-3 text-2xl font-bold text-foreground">{tr.quizStatusPassed}</h2>
            </>
          ) : (
            <>
              <XCircle className="mx-auto h-14 w-14 text-destructive" />
              <h2 className="mt-3 text-2xl font-bold text-foreground">{tr.quizStatusFailed}</h2>
            </>
          )}
          <p className="mt-1 text-sm text-muted-foreground">{title}</p>
          {selectedMeta && (
            <p className="mt-3 text-lg">
              {tr.score}: <b>{scoreText(selectedMeta)}</b>
              {selectedMeta.last_score !== null && ` (${Math.round(selectedMeta.last_score)}%)`}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {tr.attemptsLabel}: {state.attempts_used} / {state.quiz.max_attempts}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {alreadyPassed ? tr.quizLockedPassed : tr.quizLockedAttempts}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {quizzesLink}
            <Button onClick={goToCourse}>{tr.backToCourse}</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!result && state.questions.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <h2 className="text-xl font-bold text-foreground">{tr.quizNotReady}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{tr.quizNotReadyHint}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)}>{tr.retry}</Button>
          {quizzesLink}
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="mx-auto max-w-xl px-6 py-12">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
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
          <p className="mt-3 text-lg">{tr.yourScore}: <b>{result.correct} / {result.total}</b> ({Math.round(result.score)}%)</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {tr.attemptsLabel}: {result.attempt_number} / {state.quiz.max_attempts}
          </p>
          {result.certificate_id && (
            <Link to="/learning-management-system/certificate/$id" params={{ id: result.certificate_id }}>
              <Button className="mt-6"><Award className="h-4 w-4 mx-1" />{tr.viewCertificate}</Button>
            </Link>
          )}
          {result.passed && !result.certificate_id && (
            <p className="mt-4 text-sm text-muted-foreground">{tr.mustCompleteFirst}</p>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {quizzesLink}
            <Button onClick={goToCourse}>{tr.backToCourse}</Button>
          </div>
        </div>
      </div>
    );
  }

  const cooldownMinutes = Math.ceil(cooldownRemainingMs / 60000);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <Link to="/learning-management-system/student/quiz/$courseId" params={{ courseId }} search={{ quiz: undefined }}>
        <Button variant="ghost" size="sm" className="mb-3 -mx-2">
          <ArrowRight className="h-4 w-4 mx-1 rtl:rotate-180" />
          {tr.quizzes}
        </Button>
      </Link>
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>

      <p className="mt-1 text-sm text-muted-foreground">
        {tr.passScore}: {state.quiz.pass_score}% · {tr.attemptsLabel}: {state.attempts_used} / {state.quiz.max_attempts}
      </p>

      {cooldownActive && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-3 text-sm">
          <TimerReset className="h-4 w-4" />
          {ar
            ? `يمكن إعادة المحاولة بعد ${cooldownMinutes} دقيقة`
            : `Next attempt available in ${cooldownMinutes} min`}
        </div>
      )}

      <div className="mt-6 space-y-5">
        {state.questions.map((q, i) => {
          const choices = Array.isArray(q.choices) ? (q.choices as string[]) : [];
          return (
            <div key={q.question_key} className="rounded-xl border border-border bg-card p-5">
              <div className="font-semibold text-foreground">{i + 1}. {q.question}</div>
              <div className="mt-3 space-y-2">
                {choices.map((c, idx) => (
                  <label key={idx} className="flex items-center gap-2 cursor-pointer rounded-lg border border-border px-3 py-2 hover:border-primary">
                    <input
                      type="radio"
                      name={`q-${q.question_key}`}
                      checked={answers[q.question_key] === idx}
                      onChange={() => setAnswers({ ...answers, [q.question_key]: idx })}
                      disabled={cooldownActive}
                    />
                    <span className="text-sm">{c}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Button
        className="mt-6 w-full"
        size="lg"
        onClick={onSubmit}
        disabled={submitting || state.questions.length === 0 || cooldownActive}
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin mx-2" />}
        {tr.submitTest}
      </Button>
    </div>
  );
}
