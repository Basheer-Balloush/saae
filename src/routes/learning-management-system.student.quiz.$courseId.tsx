import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toUserMessage } from "@/lib/safe-error";
import { useEffect, useMemo, useState } from "react";
import { Award, Loader2, CheckCircle2, XCircle, TimerReset } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { sendCertificateEmail } from "@/lib/certificate-email.functions";

export const Route = createFileRoute("/learning-management-system/student/quiz/$courseId")({
  head: () => ({ meta: [{ title: "LMS · Final test" }] }),
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

function QuizPage() {
  const { courseId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useLmsAuth();
  const { lang } = useLang();
  const tr = lmsT[lang];
  const [state, setState] = useState<LoadedState | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [noQuiz, setNoQuiz] = useState(false);

  const sendCertEmail = useServerFn(sendCertificateEmail);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: q } = await supabase
        .from("lms_quizzes")
        .select("id")
        .eq("course_id", courseId)
        .maybeSingle();
      if (!q) { setNoQuiz(true); setLoading(false); return; }
      const { data, error } = await supabase.rpc(
        "lms_get_quiz_for_attempt" as never,
        { _quiz_id: (q as { id: string }).id } as never,
      );
      if (error) { toast.error(toUserMessage(error)); setLoading(false); return; }
      setState(data as unknown as LoadedState);
      setLoading(false);
    })();
  }, [courseId, user]);

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
      if (msg.includes("attempts_exhausted")) {
        toast.error(lang === "ar" ? "استنفدت كل المحاولات" : "You have used all attempts");
      } else if (msg.includes("cooldown_active")) {
        toast.error(lang === "ar" ? "لم تنتهِ فترة الانتظار بعد" : "Cooldown is still active");
      } else {
        toast.error(toUserMessage(error));
      }
      return;
    }
    setResult(data as Result);
    if ((data as Result | null)?.certificate_id) {
      sendCertEmail({ data: { courseId, lang } }).catch((e) => console.error("cert email failed", e));
    }
  };

  if (loading) return <p className="text-center py-20 text-muted-foreground">{tr.loading}</p>;
  if (noQuiz || !state) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <p className="text-muted-foreground">{tr.noTestYet}</p>
        <Button className="mt-4" onClick={() => navigate({ to: "/learning-management-system/student" })}>{tr.myCourses}</Button>
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
          <p className="mt-3 text-lg">{tr.yourScore}: <b>{Math.round(result.score)}%</b> ({result.correct}/{result.total})</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {lang === "ar"
              ? `المحاولة ${result.attempt_number} · المتبقّي ${result.attempts_remaining}`
              : `Attempt ${result.attempt_number} · ${result.attempts_remaining} left`}
          </p>
          {result.certificate_id && (
            <Link to="/learning-management-system/certificate/$id" params={{ id: result.certificate_id }}>
              <Button className="mt-6"><Award className="h-4 w-4 mx-1" />{tr.viewCertificate}</Button>
            </Link>
          )}
          {result.passed && !result.certificate_id && (
            <p className="mt-4 text-sm text-muted-foreground">{tr.mustCompleteFirst}</p>
          )}
          {!result.passed && result.attempts_remaining > 0 && (
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => {
                setResult(null); setAnswers({});
                // refresh attempt state
                setLoading(true);
                supabase.rpc("lms_get_quiz_for_attempt" as never, { _quiz_id: state.quiz.id } as never).then(({ data }) => {
                  if (data) setState(data as unknown as LoadedState);
                  setLoading(false);
                });
              }}
            >
              {tr.retakeTest}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const cooldownMinutes = Math.ceil(cooldownRemainingMs / 60000);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-foreground">{state.quiz.title || tr.finalTest}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {tr.passScore}: {state.quiz.pass_score}% ·{" "}
        {lang === "ar"
          ? `المتبقّي ${state.attempts_remaining} من ${state.quiz.max_attempts}`
          : `${state.attempts_remaining} of ${state.quiz.max_attempts} attempts left`}
      </p>

      {attemptsExhausted && (
        <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {lang === "ar" ? "استنفدت كل المحاولات المتاحة." : "You have used all available attempts."}
        </div>
      )}
      {!attemptsExhausted && cooldownActive && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-3 text-sm">
          <TimerReset className="h-4 w-4" />
          {lang === "ar"
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
                      disabled={attemptsExhausted || cooldownActive}
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
        disabled={submitting || state.questions.length === 0 || attemptsExhausted || cooldownActive}
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin mx-2" />}
        {tr.submitTest}
      </Button>
    </div>
  );
}
