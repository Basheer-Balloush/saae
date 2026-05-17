import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, MessageSquare, GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import type { Lang } from "@/lib/translations";

type Question = { id: string; lesson_id: string; student_id: string; body: string; created_at: string };
type Answer = { id: string; question_id: string; author_id: string; body: string; is_instructor_answer: boolean; created_at: string };

interface Props {
  lessonId: string;
  user: User | null;
  isInstructor: boolean;
  lang: Lang;
}

const t = (lang: Lang, ar: string, en: string) => (lang === "ar" ? ar : en);

export function QAPanel({ lessonId, user, isInstructor, lang }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answersByQ, setAnswersByQ] = useState<Record<string, Answer[]>>({});
  const [loading, setLoading] = useState(true);
  const [newQ, setNewQ] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data: qs, error } = await supabase
      .from("lms_questions")
      .select("id,lesson_id,student_id,body,created_at")
      .eq("lesson_id", lessonId)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const qList = (qs as Question[]) ?? [];
    setQuestions(qList);
    if (qList.length) {
      const { data: as } = await supabase
        .from("lms_answers")
        .select("id,question_id,author_id,body,is_instructor_answer,created_at")
        .in("question_id", qList.map((q) => q.id))
        .order("created_at", { ascending: true });
      const grouped: Record<string, Answer[]> = {};
      ((as as Answer[]) ?? []).forEach((a) => {
        grouped[a.question_id] = grouped[a.question_id] || [];
        grouped[a.question_id].push(a);
      });
      setAnswersByQ(grouped);
    } else {
      setAnswersByQ({});
    }
    setLoading(false);
  }, [lessonId]);

  useEffect(() => { load(); }, [load]);

  const postQuestion = async () => {
    if (!user || !newQ.trim()) return;
    setPosting(true);
    const { error } = await supabase.from("lms_questions").insert({
      lesson_id: lessonId,
      student_id: user.id,
      body: newQ.trim(),
    });
    setPosting(false);
    if (error) { toast.error(error.message); return; }
    setNewQ("");
    load();
  };

  const postAnswer = async (questionId: string) => {
    const body = (replyDraft[questionId] ?? "").trim();
    if (!user || !body) return;
    const { error } = await supabase.from("lms_answers").insert({
      question_id: questionId,
      author_id: user.id,
      body,
      is_instructor_answer: isInstructor,
    });
    if (error) { toast.error(error.message); return; }
    setReplyDraft((d) => ({ ...d, [questionId]: "" }));
    load();
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm(t(lang, "حذف هذا السؤال؟", "Delete this question?"))) return;
    const { error } = await supabase.from("lms_questions").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const deleteAnswer = async (id: string) => {
    if (!confirm(t(lang, "حذف هذا الرد؟", "Delete this answer?"))) return;
    const { error } = await supabase.from("lms_answers").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <div className="mt-8 rounded-2xl border border-border bg-card p-4 sm:p-6" dir={lang === "ar" ? "rtl" : "ltr"}>
      <h3 className="font-bold text-foreground flex items-center gap-2">
        <MessageSquare className="h-4 w-4" />
        {t(lang, "الأسئلة والأجوبة", "Q&A")}
      </h3>

      {user && (
        <div className="mt-4 space-y-2">
          <Textarea
            value={newQ}
            onChange={(e) => setNewQ(e.target.value)}
            placeholder={t(lang, "اطرح سؤالك على هذا الدرس...", "Ask a question about this lesson...")}
            rows={2}
            maxLength={2000}
          />
          <Button size="sm" onClick={postQuestion} disabled={posting || !newQ.trim()}>
            {posting && <Loader2 className="h-4 w-4 mx-1 animate-spin" />}
            {t(lang, "أرسل السؤال", "Post Question")}
          </Button>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">{t(lang, "جاري التحميل...", "Loading...‎")}</p>
        ) : questions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t(lang, "لا توجد أسئلة بعد. كن أول من يسأل!", "No questions yet. Be the first to ask!")}</p>
        ) : (
          questions.map((q) => {
            const answers = answersByQ[q.id] ?? [];
            const canDeleteQ = user && (user.id === q.student_id || isInstructor);
            return (
              <div key={q.id} className="rounded-xl border border-border bg-background p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-foreground whitespace-pre-wrap flex-1">{q.body}</p>
                  {canDeleteQ && (
                    <button onClick={() => deleteQuestion(q.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{new Date(q.created_at).toLocaleString()}</p>

                {answers.length > 0 && (
                  <ul className="mt-3 space-y-2 ms-3 ps-3 border-s border-border">
                    {answers.map((a) => {
                      const canDeleteA = user && (user.id === a.author_id || isInstructor);
                      return (
                        <li key={a.id} className="text-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              {a.is_instructor_answer && (
                                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded mb-1">
                                  <GraduationCap className="h-3 w-3" />
                                  {t(lang, "مدرّب", "Instructor")}
                                </span>
                              )}
                              <p className="text-foreground whitespace-pre-wrap">{a.body}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">{new Date(a.created_at).toLocaleString()}</p>
                            </div>
                            {canDeleteA && (
                              <button onClick={() => deleteAnswer(a.id)} className="text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {user && (
                  <div className="mt-3 flex gap-2 items-start">
                    <Textarea
                      value={replyDraft[q.id] ?? ""}
                      onChange={(e) => setReplyDraft((d) => ({ ...d, [q.id]: e.target.value }))}
                      placeholder={t(lang, "أكتب رداً...", "Write a reply...")}
                      rows={1}
                      maxLength={2000}
                      className="text-sm flex-1 min-h-[36px]"
                    />
                    <Button size="sm" variant="outline" onClick={() => postAnswer(q.id)} disabled={!(replyDraft[q.id] ?? "").trim()}>
                      {t(lang, "رد", "Reply")}
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
