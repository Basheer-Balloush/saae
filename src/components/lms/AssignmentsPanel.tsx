import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardList, CheckCircle2, Clock, Award } from "lucide-react";
import { FileUploader } from "./FileUploader";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import type { Lang } from "@/lib/translations";

type Assignment = {
  id: string;
  course_id: string;
  lesson_id: string | null;
  title_ar: string;
  title_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  brief_file_path: string | null;
  max_grade: number;
  due_date: string | null;
};

type Submission = {
  id: string;
  assignment_id: string;
  file_path: string;
  submitted_at: string;
  grade: number | null;
  feedback: string | null;
};

interface Props {
  lessonId: string;
  user: User | null;
  lang: Lang;
}

const t = (lang: Lang, ar: string, en: string) => (lang === "ar" ? ar : en);
const pick = (lang: Lang, ar: string | null | undefined, en: string | null | undefined, fb = "") =>
  lang === "en" ? (en || ar || fb) : (ar || en || fb);

export function AssignmentsPanel({ lessonId, user, lang }: Props) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subsByA, setSubsByA] = useState<Record<string, Submission>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: aData, error } = await supabase
      .from("lms_assignments")
      .select("id,course_id,lesson_id,title_ar,title_en,description_ar,description_en,brief_file_path,max_grade,due_date")
      .eq("lesson_id", lessonId)
      .order("created_at", { ascending: true });
    if (error) { toast.error(error.message); setLoading(false); return; }
    const list = (aData as Assignment[]) ?? [];
    setAssignments(list);
    if (list.length) {
      const { data: sData } = await supabase
        .from("lms_submissions")
        .select("id,assignment_id,file_path,submitted_at,grade,feedback")
        .eq("student_id", user.id)
        .in("assignment_id", list.map((a) => a.id));
      const map: Record<string, Submission> = {};
      ((sData as Submission[]) ?? []).forEach((s) => { map[s.assignment_id] = s; });
      setSubsByA(map);
    } else {
      setSubsByA({});
    }
    setLoading(false);
  }, [lessonId, user]);

  useEffect(() => { load(); }, [load]);

  const onSubmissionUploaded = async (assignment: Assignment, filePath: string) => {
    if (!user) return;
    const existing = subsByA[assignment.id];
    if (existing) {
      const { error } = await supabase
        .from("lms_submissions")
        .update({
          file_path: filePath,
          submitted_at: new Date().toISOString(),
          // Reset grade on resubmission
          grade: null,
          feedback: null,
          graded_by: null,
          graded_at: null,
        })
        .eq("id", existing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("lms_submissions").insert({
        assignment_id: assignment.id,
        student_id: user.id,
        file_path: filePath,
      });
      if (error) { toast.error(error.message); return; }
    }
    load();
  };

  if (!user) return null;
  if (loading) return null;
  if (assignments.length === 0) return null;

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-6" dir={lang === "ar" ? "rtl" : "ltr"}>
      <h3 className="font-bold text-foreground flex items-center gap-2">
        <ClipboardList className="h-4 w-4" />
        {t(lang, "الوظائف", "Assignments")}
      </h3>
      <ul className="mt-4 space-y-4">
        {assignments.map((a) => {
          const title = pick(lang, a.title_ar, a.title_en, "Assignment");
          const desc = pick(lang, a.description_ar, a.description_en, "");
          const sub = subsByA[a.id];
          const graded = sub && sub.grade !== null;
          const overdue = a.due_date && new Date(a.due_date) < new Date() && !sub;
          return (
            <li key={a.id} className="rounded-xl border border-border bg-background p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground">{title}</h4>
                  {desc && <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{desc}</p>}
                  {a.due_date && (
                    <p className={"mt-1.5 text-xs inline-flex items-center gap-1 " + (overdue ? "text-destructive" : "text-muted-foreground")}>
                      <Clock className="h-3 w-3" />
                      {t(lang, "الاستحقاق", "Due")}: {new Date(a.due_date).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="text-xs">
                  {graded ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t(lang, "تم التقييم", "Graded")}
                    </span>
                  ) : sub ? (
                    <span className="inline-flex items-center gap-1 text-primary font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t(lang, "مُسلّم — بانتظار التقييم", "Submitted — awaiting grade")}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{t(lang, "لم يُسلّم بعد", "Not submitted")}</span>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                {a.brief_file_path && (
                  <FileUploader
                    bucket="lms-assignments"
                    pathPrefix="readonly"
                    currentPath={a.brief_file_path}
                    onUploaded={() => {}}
                    disabled
                    label={t(lang, "ملف الوظيفة", "Brief file")}
                  />
                )}
              </div>

              <div className="mt-3 border-t border-border pt-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  {sub ? t(lang, "تسليمك", "Your submission") : t(lang, "ارفع تسليمك", "Upload your submission")}
                </p>
                <FileUploader
                  bucket="lms-assignments"
                  pathPrefix={`submissions/${a.id}/${user.id}`}
                  currentPath={sub?.file_path ?? null}
                  onUploaded={(p) => onSubmissionUploaded(a, p)}
                  label={sub ? t(lang, "إعادة الرفع", "Re-upload") : t(lang, "رفع الملف", "Upload file")}
                />
                {sub && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t(lang, "تم التسليم في", "Submitted at")}: {new Date(sub.submitted_at).toLocaleString()}
                  </p>
                )}
              </div>

              {graded && (
                <div className="mt-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3">
                  <p className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Award className="h-4 w-4 text-emerald-600" />
                    {t(lang, "الدرجة", "Grade")}: {sub!.grade}/{a.max_grade}
                  </p>
                  {sub!.feedback && (
                    <p className="mt-1.5 text-sm text-foreground whitespace-pre-wrap">
                      <span className="font-semibold">{t(lang, "تعليق المدرّب", "Instructor feedback")}: </span>
                      {sub!.feedback}
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
