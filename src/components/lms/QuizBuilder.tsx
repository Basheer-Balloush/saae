import { useEffect, useState } from "react";
import { toUserMessage } from "@/lib/safe-error";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Quiz = { id: string; title: string; pass_score: number; version: number; max_attempts: number; cooldown_minutes: number };
type Question = { id: string; question: string; choices: unknown; correct_index: number; display_order: number };

export function QuizBuilder({ courseId }: { courseId: string }) {
  const { lang } = useLang();
  const tr = lmsT[lang];
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const { data: q } = await supabase.from("lms_quizzes")
      .select("id,title,pass_score,version,max_attempts,cooldown_minutes").eq("course_id", courseId).maybeSingle();
    setQuiz(q as Quiz | null);
    if (q) {
      const { data: qs } = await supabase.from("lms_quiz_questions")
        .select("id,question,choices,correct_index,display_order").eq("quiz_id", q.id).order("display_order");
      setQuestions((qs as Question[]) ?? []);
    }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [courseId]);

  const createQuiz = async () => {
    setCreating(true);
    const { data, error } = await supabase.from("lms_quizzes")
      .insert({ course_id: courseId, title: lang === "ar" ? "الاختبار النهائي" : "Final test", pass_score: 60 })
      .select("*").maybeSingle();
    setCreating(false);
    if (error) { toast.error(toUserMessage(error)); return; }
    setQuiz(data as Quiz);
  };

  const saveQuiz = async (patch: Partial<Quiz>) => {
    if (!quiz) return;
    const next = { ...quiz, ...patch };
    setQuiz(next);
    await supabase.from("lms_quizzes").update(patch).eq("id", quiz.id);
  };

  const addQuestion = async () => {
    if (!quiz) return;
    const { data, error } = await supabase.from("lms_quiz_questions").insert({
      quiz_id: quiz.id,
      question: lang === "ar" ? "سؤال جديد" : "New question",
      choices: ["A", "B", "C", "D"],
      correct_index: 0,
      display_order: questions.length,
    }).select("*").maybeSingle();
    if (error) { toast.error(toUserMessage(error)); return; }
    if (data) setQuestions([...questions, data as Question]);
  };

  const updateQ = async (qid: string, patch: { question?: string; choices?: string[]; correct_index?: number }) => {
    setQuestions(questions.map((q) => q.id === qid ? { ...q, ...patch } : q));
    await supabase.from("lms_quiz_questions").update(patch as never).eq("id", qid);
  };

  const deleteQ = async (qid: string) => {
    if (!confirm(lang === "ar" ? "حذف؟" : "Delete?")) return;
    await supabase.from("lms_quiz_questions").delete().eq("id", qid);
    setQuestions(questions.filter((q) => q.id !== qid));
  };

  if (loading) return null;

  if (!quiz) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-bold text-foreground">{tr.finalTest}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{tr.noTestYet}</p>
        <Button className="mt-3" onClick={createQuiz} disabled={creating}>
          {creating && <Loader2 className="h-4 w-4 animate-spin mx-2" />}
          <Plus className="h-4 w-4 mx-1" />{tr.finalTest}
        </Button>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-foreground">{tr.finalTest}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {lang === "ar" ? `النسخة الحالية: ${quiz.version}` : `Current version: ${quiz.version}`}
          </p>
        </div>
        <Button size="sm" onClick={addQuestion}><Plus className="h-4 w-4 mx-1" />{tr.addQuestion}</Button>
      </div>
      <p className="text-xs rounded-md bg-muted/40 px-3 py-2 text-muted-foreground">
        {lang === "ar"
          ? "أي تعديل على الأسئلة يزيد رقم النسخة، ومحاولات المتدرّبين السابقة تبقى مصحّحة على النسخة التي أدّوها."
          : "Editing any question bumps the version; existing learner attempts stay graded against the version they took."}
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div><Label>{lang === "ar" ? "العنوان" : "Title"}</Label>
          <Input value={quiz.title} onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
            onBlur={() => saveQuiz({ title: quiz.title })} /></div>
        <div><Label>{tr.passScore} (%)</Label>
          <Input type="number" min={0} max={100} value={quiz.pass_score}
            onChange={(e) => setQuiz({ ...quiz, pass_score: parseInt(e.target.value) || 0 })}
            onBlur={() => saveQuiz({ pass_score: quiz.pass_score })} /></div>
        <div><Label>{lang === "ar" ? "الحد الأقصى للمحاولات" : "Max attempts"}</Label>
          <Input type="number" min={1} max={20} value={quiz.max_attempts}
            onChange={(e) => setQuiz({ ...quiz, max_attempts: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)) })}
            onBlur={() => saveQuiz({ max_attempts: quiz.max_attempts })} /></div>
        <div><Label>{lang === "ar" ? "فترة الانتظار (دقائق)" : "Cooldown (minutes)"}</Label>
          <Input type="number" min={0} max={43200} value={quiz.cooldown_minutes}
            onChange={(e) => setQuiz({ ...quiz, cooldown_minutes: Math.max(0, parseInt(e.target.value) || 0) })}
            onBlur={() => saveQuiz({ cooldown_minutes: quiz.cooldown_minutes })} /></div>
      </div>


      <div className="space-y-3">
        {questions.length === 0 && <p className="text-sm text-muted-foreground">{lang === "ar" ? "لا توجد أسئلة بعد" : "No questions yet"}</p>}
        {questions.map((q, i) => {
          const choices = Array.isArray(q.choices) ? (q.choices as string[]) : [];
          return (
            <div key={q.id} className="rounded-xl border border-border p-3 space-y-2">
              <div className="flex items-start gap-2">
                <span className="font-bold text-muted-foreground">{i + 1}.</span>
                <Textarea rows={1} value={q.question}
                  onChange={(e) => setQuestions(questions.map((x) => x.id === q.id ? { ...x, question: e.target.value } : x))}
                  onBlur={() => updateQ(q.id, { question: q.question })} className="flex-1" />
                <Button size="sm" variant="ghost" onClick={() => deleteQ(q.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
              <div className="space-y-1.5 ps-6">
                {choices.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input type="radio" name={`correct-${q.id}`} checked={q.correct_index === idx}
                      onChange={() => updateQ(q.id, { correct_index: idx })} />
                    <Input value={c} onChange={(e) => {
                      const next = [...choices]; next[idx] = e.target.value;
                      setQuestions(questions.map((x) => x.id === q.id ? { ...x, choices: next } : x));
                    }} onBlur={() => updateQ(q.id, { choices })} className="flex-1 h-8" />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">{tr.correctAnswer}: <b>{String.fromCharCode(65 + q.correct_index)}</b></p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
