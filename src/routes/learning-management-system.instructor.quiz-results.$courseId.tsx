import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InstructorPageHeader } from "@/components/lms-skin/InstructorWorkspace";

export const Route = createFileRoute("/learning-management-system/instructor/quiz-results/$courseId")({
  head: () => ({ meta: [{ title: "LMS · Quiz Results" }] }),
  component: QuizResultsPage,
});

type Quiz = { id: string; title: string; pass_score: number };
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
  const [course, setCourse] = useState<{ title_ar: string; title_en: string | null; delivery_mode: string | null } | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [selectedQuiz, setSelectedQuiz] = useState<string>("all");

  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      setLoading(true);
      const { data: c } = await supabase.from("lms_courses").select("title_ar,title_en,delivery_mode").eq("id", courseId).maybeSingle();
      setCourse(c as { title_ar: string; title_en: string | null; delivery_mode: string | null } | null);

      const { data: qs } = await supabase.from("lms_quizzes")
        .select("id,title,pass_score").eq("course_id", courseId).order("created_at");
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
    <div className="id-page">
      <InstructorPageHeader
        back={
          <Link to="/learning-management-system/instructor/courses/$id" params={{ id: courseId }} className="id-back">
            <ArrowLeft aria-hidden="true" />
            {lang === "ar" ? "العودة إلى الدورة" : "Back to course"}
          </Link>
        }
        title={lang === "ar" ? "نتائج الاختبارات" : "Quiz results"}
        meta={
          <p className="id-meta-row">
            <span>{title}</span>
            {course && (
              <span className="id-co-taught">
                {course.delivery_mode === "online"
                  ? (lang === "ar" ? "أونلاين" : "Online")
                  : (lang === "ar" ? "حضوري" : "In-person")}
              </span>
            )}
          </p>
        }
        actions={
          quizzes.length > 1 && (
            <Select value={selectedQuiz} onValueChange={setSelectedQuiz}>
              <SelectTrigger className="w-56" aria-label={lang === "ar" ? "الاختبار" : "Quiz"}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{lang === "ar" ? "كل الاختبارات" : "All quizzes"}</SelectItem>
                {quizzes.map((q) => (<SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>))}
              </SelectContent>
            </Select>
          )
        }
      />

      {loading ? (
        <p className="id-empty" role="status"><Loader2 aria-hidden="true" className="id-spinner" />{lang === "ar" ? "جارٍ التحميل..." : "Loading..."}</p>
      ) : quizzes.length === 0 ? (
        <p className="id-empty">
          {lang === "ar" ? "لا توجد اختبارات لهذه الدورة." : "No quizzes for this course."}
        </p>
      ) : filtered.length === 0 ? (
        <p className="id-empty">
          {lang === "ar" ? "لا توجد محاولات بعد." : "No attempts yet."}
        </p>
      ) : (
        <div className="id-panel id-table-wrap">
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
                    <span className={`id-status ${a.passed ? "id-status-published" : "id-status-rejected"}`}>
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
