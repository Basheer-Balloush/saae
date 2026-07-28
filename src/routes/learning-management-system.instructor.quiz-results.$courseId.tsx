import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/learning-management-system/instructor/quiz-results/$courseId")({
  head: () => ({ meta: [{ title: "LMS · Quiz Results" }] }),
  component: QuizResultsPage,
});

type Quiz = { id: string; title: string; passing_score: number };
type Attempt = {
  id: string;
  quiz_id: string;
  student_id: string;
  score: number;
  passed: boolean;
  attempt_number: number;
  submitted_at: string;
};
type Profile = { user_id: string; full_name: string | null };

function QuizResultsPage() {
  const { courseId } = Route.useParams();
  const { user, loading: authLoading } = useLmsAuth();
  const { lang } = useLang();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<{ title_ar: string; title_en: string | null } | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [selectedQuiz, setSelectedQuiz] = useState<string>("all");

  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      setLoading(true);
      const { data: c } = await supabase.from("lms_courses").select("title_ar,title_en").eq("id", courseId).maybeSingle();
      setCourse(c as { title_ar: string; title_en: string | null } | null);

      const { data: qs } = await supabase.from("lms_quizzes")
        .select("id,title,passing_score").eq("course_id", courseId).order("created_at");
      const qList = (qs as Quiz[]) ?? [];
      setQuizzes(qList);

      if (qList.length === 0) { setAttempts([]); setLoading(false); return; }

      const { data: att } = await supabase.from("lms_quiz_attempts")
        .select("id,quiz_id,student_id,score,passed,attempt_number,submitted_at")
        .in("quiz_id", qList.map((q) => q.id))
        .order("submitted_at", { ascending: false });
      const attList = (att as Attempt[]) ?? [];
      setAttempts(attList);

      const studentIds = Array.from(new Set(attList.map((a) => a.student_id)));
      if (studentIds.length) {
        const { data: profs } = await supabase.from("lms_user_profiles")
          .select("user_id,full_name").in("user_id", studentIds);
        const map: Record<string, string> = {};
        for (const p of (profs as Profile[]) ?? []) map[p.user_id] = p.full_name ?? "";
        setProfiles(map);
      }
      setLoading(false);
    })();
  }, [courseId, user, authLoading]);

  const filtered = useMemo(
    () => selectedQuiz === "all" ? attempts : attempts.filter((a) => a.quiz_id === selectedQuiz),
    [attempts, selectedQuiz],
  );

  const title = course ? (lang === "ar" ? course.title_ar : (course.title_en || course.title_ar)) : "";
  const quizTitle = (id: string) => quizzes.find((q) => q.id === id)?.title ?? "—";

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Link to="/learning-management-system/instructor/courses/$id" params={{ id: courseId }}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-3.5 w-3.5" />
            {lang === "ar" ? "العودة إلى الدورة" : "Back to course"}
          </Link>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-foreground">
            {lang === "ar" ? "نتائج الاختبارات" : "Quiz results"}
          </h1>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
        {quizzes.length > 1 && (
          <Select value={selectedQuiz} onValueChange={setSelectedQuiz}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{lang === "ar" ? "كل الاختبارات" : "All quizzes"}</SelectItem>
              {quizzes.map((q) => (<SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>))}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? (
        <div className="mt-16 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mx-2" />{lang === "ar" ? "جارٍ التحميل..." : "Loading..."}</div>
      ) : quizzes.length === 0 ? (
        <p className="mt-16 text-center text-muted-foreground">
          {lang === "ar" ? "لا توجد اختبارات لهذه الدورة." : "No quizzes for this course."}
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-16 text-center text-muted-foreground">
          {lang === "ar" ? "لا توجد محاولات بعد." : "No attempts yet."}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-start">{lang === "ar" ? "الطالب" : "Student"}</th>
                <th className="px-3 py-2 text-start">{lang === "ar" ? "الاختبار" : "Quiz"}</th>
                <th className="px-3 py-2 text-center">{lang === "ar" ? "المحاولة" : "Attempt #"}</th>
                <th className="px-3 py-2 text-center">{lang === "ar" ? "النتيجة" : "Score"}</th>
                <th className="px-3 py-2 text-center">{lang === "ar" ? "الحالة" : "Status"}</th>
                <th className="px-3 py-2 text-start">{lang === "ar" ? "التاريخ" : "Submitted"}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="px-3 py-2">{profiles[a.student_id] || a.student_id.slice(0, 8)}</td>
                  <td className="px-3 py-2">{quizTitle(a.quiz_id)}</td>
                  <td className="px-3 py-2 text-center">{a.attempt_number}</td>
                  <td className="px-3 py-2 text-center font-mono">{Number(a.score).toFixed(1)}%</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${a.passed ? "bg-emerald-500/15 text-emerald-600" : "bg-destructive/15 text-destructive"}`}>
                      {a.passed ? (lang === "ar" ? "ناجح" : "Passed") : (lang === "ar" ? "راسب" : "Failed")}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">{new Date(a.submitted_at).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
