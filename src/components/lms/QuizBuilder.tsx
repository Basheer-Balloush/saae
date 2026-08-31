import { useCallback, useEffect, useState } from "react";
import { toUserMessage } from "@/lib/safe-error";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { confirmDialog } from "@/hooks/useConfirm";

type Quiz = {
  id: string;
  title: string;
  pass_score: number;
  version: number;
  max_attempts: number;
  cooldown_minutes: number;
  ams_session_id: string | null;
  lms_section_id: string | null;
};
type Question = { id: string; question: string; choices: unknown; correct_index: number; display_order: number };
type Session = { id: string; title: string; session_date: string };
type Section = { id: string; title: string; title_ar: string | null; title_en: string | null; display_order: number };

const NO_SESSION = "__none__";
const NO_SECTION = "__none__";

export function QuizBuilder({ courseId }: { courseId: string }) {
  const { lang } = useLang();
  const tr = lmsT[lang];
  const ar = lang === "ar";
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const quiz = quizzes.find((q) => q.id === activeId) ?? null;

  const loadQuestions = useCallback(async (quizId: string) => {
    const { data: qs } = await supabase
      .from("lms_quiz_questions")
      .select("id,question,choices,correct_index,display_order")
      .eq("quiz_id", quizId)
      .order("display_order");
    setQuestions((qs as Question[]) ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("lms_quizzes")
        .select("id,title,pass_score,version,max_attempts,cooldown_minutes,ams_session_id,lms_section_id")
        .eq("course_id", courseId)
        .order("created_at");
      if (cancelled) return;
      const list = (data as Quiz[]) ?? [];
      setQuizzes(list);
      setActiveId(list[0]?.id ?? null);
      if (list[0]) await loadQuestions(list[0].id);

      // Sessions come from the linked attendance (AMS) course, when one exists.
      const { data: amsCourse } = await supabase
        .from("ams_courses")
        .select("id")
        .eq("lms_course_id", courseId)
        .maybeSingle();
      if (cancelled) return;
      if (amsCourse) {
        const { data: sess } = await supabase
          .from("ams_sessions")
          .select("id,title,session_date")
          .eq("course_id", (amsCourse as { id: string }).id)
          .order("session_date");
        if (!cancelled) setSessions((sess as Session[]) ?? []);
      }
      const { data: secs } = await supabase
        .from("lms_sections")
        .select("id,title,title_ar,title_en,display_order")
        .eq("course_id", courseId)
        .order("display_order");
      if (!cancelled) setSections((secs as Section[]) ?? []);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [courseId, loadQuestions]);

  const selectQuiz = async (id: string) => {
    setActiveId(id);
    setQuestions([]);
    await loadQuestions(id);
  };

  const createQuiz = async () => {
    setCreating(true);
    const index = quizzes.length + 1;
    const { data, error } = await supabase.from("lms_quizzes")
      .insert({
        course_id: courseId,
        title: ar ? `اختبار ${index}` : `Quiz ${index}`,
        pass_score: 60,
      })
      .select("id,title,pass_score,version,max_attempts,cooldown_minutes,ams_session_id,lms_section_id").maybeSingle();
    setCreating(false);
    if (error) { toast.error(toUserMessage(error)); return; }
    const created = data as Quiz;
    setQuizzes([...quizzes, created]);
    setActiveId(created.id);
    setQuestions([]);
  };

  const saveQuiz = async (patch: Partial<Quiz>) => {
    if (!quiz) return;
    setQuizzes(quizzes.map((q) => q.id === quiz.id ? { ...q, ...patch } : q));
    const { error } = await supabase.from("lms_quizzes").update(patch as never).eq("id", quiz.id);
    if (error) toast.error(toUserMessage(error));
  };

  const patchLocal = (patch: Partial<Quiz>) => {
    if (!quiz) return;
    setQuizzes(quizzes.map((q) => q.id === quiz.id ? { ...q, ...patch } : q));
  };

  const deleteQuiz = async () => {
    if (!quiz) return;
    if (!(await confirmDialog({
      title: ar ? "حذف الاختبار وكل أسئلته ومحاولاته؟" : "Delete this quiz with its questions and attempts?",
      destructive: true,
    }))) return;
    const { error } = await supabase.from("lms_quizzes").delete().eq("id", quiz.id);
    if (error) { toast.error(toUserMessage(error)); return; }
    const rest = quizzes.filter((q) => q.id !== quiz.id);
    setQuizzes(rest);
    setActiveId(rest[0]?.id ?? null);
    setQuestions([]);
    if (rest[0]) await loadQuestions(rest[0].id);
  };

  const addQuestion = async () => {
    if (!quiz) return;
    const { data, error } = await supabase.from("lms_quiz_questions").insert({
      quiz_id: quiz.id,
      question: ar ? "سؤال جديد" : "New question",
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
    if (!(await confirmDialog({ title: ar ? "حذف؟" : "Delete?", destructive: true }))) return;
    await supabase.from("lms_quiz_questions").delete().eq("id", qid);
    setQuestions(questions.filter((q) => q.id !== qid));
  };

  const sectionName = (s: Section) =>
    (ar ? (s.title_ar || s.title) : (s.title_en || s.title)) || s.title;

  const sectionLabel = (id: string | null) => {
    if (!id) return ar ? "غير مرتبط بقسم" : "No section";
    const s = sections.find((x) => x.id === id);
    return s ? sectionName(s) : (ar ? "قسم محذوف" : "Deleted section");
  };

  const sessionLabel = (id: string | null) => {
    if (!id) return ar ? "غير مرتبط بجلسة" : "Not linked to a session";
    const s = sessions.find((x) => x.id === id);
    return s ? `${s.session_date} · ${s.title}` : (ar ? "جلسة محذوفة" : "Deleted session");
  };

  if (loading) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-bold text-foreground">{ar ? "الاختبارات" : "Quizzes"}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {ar
              ? "أنشئ أي عدد من الاختبارات، وسمِّ كل اختبار كما تشاء، واربطه بالقسم أو جلسة الحضور الخاصة به."
              : "Create as many quizzes as you need, name each one freely, and link it to its section or attendance session."}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={createQuiz} disabled={creating}>
          {creating ? <Loader2 className="h-4 w-4 animate-spin mx-1" /> : <Plus className="h-4 w-4 mx-1" />}
          {ar ? "اختبار جديد" : "New quiz"}
        </Button>
      </div>

      {quizzes.length === 0 && <p className="text-sm text-muted-foreground">{tr.noTestYet}</p>}

      {quizzes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {quizzes.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => selectQuiz(q.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                q.id === activeId
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              {q.title || (ar ? "اختبار" : "Quiz")}
              <span className="opacity-70">
                {" · "}{q.lms_section_id ? sectionLabel(q.lms_section_id) : sessionLabel(q.ams_session_id)}
              </span>
            </button>
          ))}
        </div>
      )}

      {quiz && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {ar ? `النسخة الحالية: ${quiz.version}` : `Current version: ${quiz.version}`}
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={addQuestion}><Plus className="h-4 w-4 mx-1" />{tr.addQuestion}</Button>
              <Button size="sm" variant="outline" onClick={deleteQuiz} className="text-destructive border-destructive/40">
                <Trash2 className="h-4 w-4 mx-1" />{ar ? "حذف الاختبار" : "Delete quiz"}
              </Button>
            </div>
          </div>

          <p className="text-xs rounded-md bg-muted/40 px-3 py-2 text-muted-foreground">
            {ar
              ? "أي تعديل على الأسئلة يزيد رقم النسخة، ومحاولات المتدرّبين السابقة تبقى مصحّحة على النسخة التي أدّوها."
              : "Editing any question bumps the version; existing learner attempts stay graded against the version they took."}
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div><Label>{ar ? "العنوان" : "Title"}</Label>
              <Input value={quiz.title} onChange={(e) => patchLocal({ title: e.target.value })}
                onBlur={() => saveQuiz({ title: quiz.title })} /></div>
            <div><Label>{tr.passScore} (%)</Label>
              <Input type="number" min={0} max={100} value={quiz.pass_score}
                onChange={(e) => patchLocal({ pass_score: parseInt(e.target.value) || 0 })}
                onBlur={() => saveQuiz({ pass_score: quiz.pass_score })} /></div>
            <div><Label>{ar ? "الحد الأقصى للمحاولات" : "Max attempts"}</Label>
              <Input type="number" min={1} max={20} value={quiz.max_attempts}
                onChange={(e) => patchLocal({ max_attempts: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)) })}
                onBlur={() => saveQuiz({ max_attempts: quiz.max_attempts })} /></div>
            <div><Label>{ar ? "فترة الانتظار (دقائق)" : "Cooldown (minutes)"}</Label>
              <Input type="number" min={0} max={43200} value={quiz.cooldown_minutes}
                onChange={(e) => patchLocal({ cooldown_minutes: Math.max(0, parseInt(e.target.value) || 0) })}
                onBlur={() => saveQuiz({ cooldown_minutes: quiz.cooldown_minutes })} /></div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>{ar ? "القسم المرتبط" : "Linked section"}</Label>
              {sections.length === 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {ar ? "لا توجد أقسام في هذه الدورة بعد." : "This course has no sections yet."}
                </p>
              ) : (
                <Select
                  value={quiz.lms_section_id ?? NO_SECTION}
                  onValueChange={(v) => saveQuiz({ lms_section_id: v === NO_SECTION ? null : v })}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SECTION}>{ar ? "غير مرتبط بقسم" : "No section"}</SelectItem>
                    {sections.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{sectionName(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
            <Label>{ar ? "الجلسة المرتبطة" : "Linked session"}</Label>
            {sessions.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {ar
                  ? "لا توجد جلسات حضور لهذه الدورة بعد — أنشئ الجلسات في نظام الحضور لربط الاختبارات بها."
                  : "No attendance sessions for this course yet — create sessions in the attendance system to link quizzes."}
              </p>
            ) : (
              <Select
                value={quiz.ams_session_id ?? NO_SESSION}
                onValueChange={(v) => saveQuiz({ ams_session_id: v === NO_SESSION ? null : v })}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SESSION}>{ar ? "غير مرتبط بجلسة" : "Not linked to a session"}</SelectItem>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.session_date} · {s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            </div>
          </div>

          <div className="space-y-3">
            {questions.length === 0 && <p className="text-sm text-muted-foreground">{ar ? "لا توجد أسئلة بعد" : "No questions yet"}</p>}
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
        </>
      )}
    </section>
  );
}
