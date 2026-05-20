import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toUserMessage } from "@/lib/safe-error";
import { useEffect, useState } from "react";
import { Award, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/learning-management-system/student/quiz/$courseId")({
  head: () => ({ meta: [{ title: "LMS · Final test" }] }),
  component: QuizPage,
});

type Quiz = { id: string; title: string; pass_score: number };
type Question = { id: string; question: string; choices: unknown; display_order: number };
type Result = { score: number; passed: boolean; total: number; correct: number; certificate_id: string | null };

function QuizPage() {
  const { courseId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useLmsAuth();
  const { lang } = useLang();
  const tr = lmsT[lang];
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [progress, setProgress] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: q } = await supabase.from("lms_quizzes").select("id,title,pass_score").eq("course_id", courseId).maybeSingle();
      setQuiz(q as Quiz | null);
      if (q) {
        const { data: qs } = await supabase.rpc("lms_get_quiz_questions" as never, { _quiz_id: q.id } as never);
        setQuestions(((qs as unknown) as Question[]) ?? []);
      }
      const { data: e } = await supabase.from("lms_enrollments").select("progress").eq("course_id", courseId).eq("student_id", user.id).maybeSingle();
      setProgress(Number(e?.progress ?? 0));
      setLoading(false);
    })();
  }, [courseId, user]);

  const onSubmit = async () => {
    if (!quiz) return;
    const answerArr = questions.map((_, i) => answers[i] ?? -1);
    setSubmitting(true);
    const { data, error } = await supabase.rpc("lms_submit_quiz" as never, { _quiz_id: quiz.id, _answers: answerArr } as never);
    setSubmitting(false);
    if (error) { toast.error(toUserMessage(error)); return; }
    setResult(data as Result);
  };

  if (loading) return <p className="text-center py-20 text-muted-foreground">{tr.loading}</p>;
  if (!quiz) {
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
          {result.certificate_id && (
            <Link to="/learning-management-system/certificate/$id" params={{ id: result.certificate_id }}>
              <Button className="mt-6"><Award className="h-4 w-4 mx-1" />{tr.viewCertificate}</Button>
            </Link>
          )}
          {result.passed && !result.certificate_id && progress < 100 && (
            <p className="mt-4 text-sm text-muted-foreground">{tr.mustCompleteFirst}</p>
          )}
          {!result.passed && (
            <Button variant="outline" className="mt-6" onClick={() => { setResult(null); setAnswers({}); }}>{tr.retakeTest}</Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-foreground">{quiz.title || tr.finalTest}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{tr.passScore}: {quiz.pass_score}%</p>

      <div className="mt-6 space-y-5">
        {questions.map((q, i) => {
          const choices = Array.isArray(q.choices) ? (q.choices as string[]) : [];
          return (
            <div key={q.id} className="rounded-xl border border-border bg-card p-5">
              <div className="font-semibold text-foreground">{i + 1}. {q.question}</div>
              <div className="mt-3 space-y-2">
                {choices.map((c, idx) => (
                  <label key={idx} className="flex items-center gap-2 cursor-pointer rounded-lg border border-border px-3 py-2 hover:border-primary">
                    <input type="radio" name={`q-${i}`} checked={answers[i] === idx} onChange={() => setAnswers({ ...answers, [i]: idx })} />
                    <span className="text-sm">{c}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Button className="mt-6 w-full" size="lg" onClick={onSubmit} disabled={submitting || questions.length === 0}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin mx-2" />}
        {tr.submitTest}
      </Button>
    </div>
  );
}
