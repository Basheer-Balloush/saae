import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, Loader2, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileUploader } from "@/components/lms/FileUploader";
import { toast } from "sonner";
import type { Lang } from "@/lib/translations";

export const Route = createFileRoute("/learning-management-system/instructor/assignments/$courseId")({
  head: () => ({ meta: [{ title: "LMS · Manage Assignments" }] }),
  component: InstructorAssignments,
});

type Section = { id: string; title_ar: string | null; title_en: string | null; display_order: number };
type Lesson = { id: string; section_id: string; title_ar: string | null; title_en: string | null; display_order: number };
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
  created_at: string;
};
type Submission = {
  id: string;
  assignment_id: string;
  student_id: string;
  file_path: string;
  submitted_at: string;
  grade: number | null;
  feedback: string | null;
  graded_at: string | null;
};

const t = (lang: Lang, ar: string, en: string) => (lang === "ar" ? ar : en);
const pick = (lang: Lang, ar: string | null | undefined, en: string | null | undefined, fb = "") =>
  lang === "en" ? (en || ar || fb) : (ar || en || fb);

function InstructorAssignments() {
  const { courseId } = Route.useParams();
  const { user, role, loading: authLoading } = useLmsAuth();
  const { lang } = useLang();
  const navigate = useNavigate();
  const isRtl = lang === "ar";

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    lesson_id: "",
    title_ar: "",
    title_en: "",
    description_ar: "",
    description_en: "",
    max_grade: "100",
    due_date: "",
  });

  // Check authorization (own course or admin)
  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      const { data } = await supabase.from("lms_courses").select("instructor_id").eq("id", courseId).maybeSingle();
      const ownsCourse = data && (data as { instructor_id: string }).instructor_id === user.id;
      setAuthorized(role === "lms_admin" || !!ownsCourse);
    })();
  }, [authLoading, user, role, courseId]);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: secs }, { data: lss }, { data: as }] = await Promise.all([
      supabase.from("lms_sections").select("id,title_ar,title_en,display_order").eq("course_id", courseId).order("display_order"),
      supabase.from("lms_lessons").select("id,section_id,title_ar,title_en,display_order"),
      supabase.from("lms_assignments").select("*").eq("course_id", courseId).order("created_at"),
    ]);
    const secList = (secs as Section[]) ?? [];
    setSections(secList);
    const lessList = ((lss as Lesson[]) ?? []).filter((l) => secList.some((s) => s.id === l.section_id));
    setLessons(lessList);
    setAssignments((as as Assignment[]) ?? []);
    setLoading(false);
  }, [courseId]);

  useEffect(() => { if (authorized) load(); }, [authorized, load]);

  const handleCreate = async () => {
    if (!user) return;
    if (!form.title_ar.trim() && !form.title_en.trim()) {
      toast.error(t(lang, "العنوان مطلوب", "Title required"));
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("lms_assignments").insert({
      course_id: courseId,
      lesson_id: form.lesson_id || null,
      title_ar: form.title_ar.trim() || form.title_en.trim(),
      title_en: form.title_en.trim() || null,
      description_ar: form.description_ar.trim() || null,
      description_en: form.description_en.trim() || null,
      max_grade: parseInt(form.max_grade, 10) || 100,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      created_by: user.id,
    });
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t(lang, "تم إنشاء الوظيفة", "Assignment created"));
    setForm({ lesson_id: "", title_ar: "", title_en: "", description_ar: "", description_en: "", max_grade: "100", due_date: "" });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t(lang, "حذف هذه الوظيفة وكل تسليماتها؟", "Delete this assignment and all submissions?"))) return;
    const { error } = await supabase.from("lms_assignments").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const handleBriefUploaded = async (assignmentId: string, path: string) => {
    const { error } = await supabase.from("lms_assignments").update({ brief_file_path: path }).eq("id", assignmentId);
    if (error) { toast.error(error.message); return; }
    load();
  };

  if (authLoading || authorized === null) {
    return <p className="text-center py-20 text-muted-foreground">{t(lang, "جاري التحميل...", "Loading...")}</p>;
  }
  if (!authorized) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">{t(lang, "غير مصرّح", "Unauthorized")}</p>
        <Button className="mt-4" onClick={() => navigate({ to: "/learning-management-system/instructor" })}>
          {t(lang, "العودة", "Go back")}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Link to="/learning-management-system/instructor/courses/$id" params={{ id: courseId }} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            {t(lang, "العودة للدورة", "Back to course")}
          </Link>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            {t(lang, "إدارة الوظائف", "Manage Assignments")}
          </h1>
        </div>
      </div>

      {/* Create form */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-bold text-foreground flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {t(lang, "إضافة وظيفة جديدة", "Add New Assignment")}
        </h2>
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div>
            <Label>{t(lang, "العنوان بالعربي", "Title (Arabic)")}</Label>
            <Input value={form.title_ar} onChange={(e) => setForm({ ...form, title_ar: e.target.value })} maxLength={200} />
          </div>
          <div>
            <Label>{t(lang, "العنوان بالإنكليزي", "Title (English)")}</Label>
            <Input value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} maxLength={200} />
          </div>
          <div className="sm:col-span-2">
            <Label>{t(lang, "الدرس (اختياري)", "Lesson (optional)")}</Label>
            <select
              value={form.lesson_id}
              onChange={(e) => setForm({ ...form, lesson_id: e.target.value })}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="">{t(lang, "بدون درس محدد", "No specific lesson")}</option>
              {sections.map((s) => (
                <optgroup key={s.id} label={pick(lang, s.title_ar, s.title_en, "")}>
                  {lessons.filter((l) => l.section_id === s.id).map((l) => (
                    <option key={l.id} value={l.id}>{pick(lang, l.title_ar, l.title_en, "")}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <Label>{t(lang, "الوصف بالعربي", "Description (Arabic)")}</Label>
            <Textarea rows={3} value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} maxLength={2000} />
          </div>
          <div>
            <Label>{t(lang, "الوصف بالإنكليزي", "Description (English)")}</Label>
            <Textarea rows={3} value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} maxLength={2000} />
          </div>
          <div>
            <Label>{t(lang, "الدرجة العظمى", "Max grade")}</Label>
            <Input type="number" min="1" max="1000" value={form.max_grade} onChange={(e) => setForm({ ...form, max_grade: e.target.value })} />
          </div>
          <div>
            <Label>{t(lang, "موعد التسليم (اختياري)", "Due date (optional)")}</Label>
            <Input type="datetime-local" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
        </div>
        <Button className="mt-4" onClick={handleCreate} disabled={creating}>
          {creating && <Loader2 className="h-4 w-4 mx-1 animate-spin" />}
          {t(lang, "إنشاء", "Create")}
        </Button>
      </div>

      {/* Assignments list */}
      <div className="mt-6 space-y-3">
        {loading ? (
          <p className="text-center text-muted-foreground">{t(lang, "جاري التحميل...", "Loading...")}</p>
        ) : assignments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">{t(lang, "لا توجد وظائف بعد", "No assignments yet")}</p>
        ) : (
          assignments.map((a) => (
            <AssignmentRow
              key={a.id}
              assignment={a}
              lang={lang}
              onDelete={() => handleDelete(a.id)}
              onBriefUploaded={(p) => handleBriefUploaded(a.id, p)}
              onBriefRemoved={() => handleBriefUploaded(a.id, null as unknown as string)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function AssignmentRow({
  assignment,
  lang,
  onDelete,
  onBriefUploaded,
  onBriefRemoved,
}: {
  assignment: Assignment;
  lang: Lang;
  onDelete: () => void;
  onBriefUploaded: (path: string) => void;
  onBriefRemoved: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [loadingSubs, setLoadingSubs] = useState(false);

  const loadSubs = useCallback(async () => {
    setLoadingSubs(true);
    const { data, error } = await supabase
      .from("lms_submissions")
      .select("*")
      .eq("assignment_id", assignment.id)
      .order("submitted_at", { ascending: false });
    if (error) { toast.error(error.message); setLoadingSubs(false); return; }
    const list = (data as Submission[]) ?? [];
    setSubs(list);
    // Best-effort student name lookup from instructors table or user metadata
    if (list.length) {
      const ids = Array.from(new Set(list.map((s) => s.student_id)));
      const { data: profs } = await supabase
        .from("lms_instructors")
        .select("user_id,full_name")
        .in("user_id", ids);
      const map: Record<string, string> = {};
      ((profs as { user_id: string; full_name: string }[]) ?? []).forEach((p) => { map[p.user_id] = p.full_name; });
      setStudentNames(map);
    }
    setLoadingSubs(false);
  }, [assignment.id]);

  useEffect(() => { if (expanded) loadSubs(); }, [expanded, loadSubs]);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground">{pick(lang, assignment.title_ar, assignment.title_en, "Assignment")}</h3>
          {(assignment.description_ar || assignment.description_en) && (
            <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
              {pick(lang, assignment.description_ar, assignment.description_en, "")}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>{t(lang, "الدرجة العظمى", "Max grade")}: {assignment.max_grade}</span>
            {assignment.due_date && <span>{t(lang, "الاستحقاق", "Due")}: {new Date(assignment.due_date).toLocaleString()}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setExpanded((v) => !v)}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {t(lang, "التسليمات", "Submissions")}
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{t(lang, "ملف الوظيفة:", "Brief file:")}</span>
        <FileUploader
          bucket="lms-assignments"
          pathPrefix={`brief/${assignment.id}`}
          currentPath={assignment.brief_file_path}
          onUploaded={onBriefUploaded}
          onRemoved={onBriefRemoved}
          label={assignment.brief_file_path ? t(lang, "استبدال", "Replace") : t(lang, "رفع", "Upload")}
        />
      </div>

      {expanded && (
        <div className="mt-4 border-t border-border pt-4">
          {loadingSubs ? (
            <p className="text-sm text-muted-foreground">{t(lang, "جاري التحميل...", "Loading...")}</p>
          ) : subs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t(lang, "لا توجد تسليمات بعد", "No submissions yet")}</p>
          ) : (
            <ul className="space-y-3">
              {subs.map((s) => (
                <SubmissionRow
                  key={s.id}
                  submission={s}
                  studentName={studentNames[s.student_id]}
                  maxGrade={assignment.max_grade}
                  lang={lang}
                  onChanged={loadSubs}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function SubmissionRow({
  submission,
  studentName,
  maxGrade,
  lang,
  onChanged,
}: {
  submission: Submission;
  studentName: string | undefined;
  maxGrade: number;
  lang: Lang;
  onChanged: () => void;
}) {
  const { user } = useLmsAuth();
  const [grade, setGrade] = useState(submission.grade?.toString() ?? "");
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    const { data, error } = await supabase.storage.from("lms-assignments").createSignedUrl(submission.file_path, 60 * 10);
    setDownloading(false);
    if (error) { toast.error(error.message); return; }
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const handleSave = async () => {
    if (!user) return;
    const g = grade.trim() === "" ? null : Number(grade);
    if (g !== null && (isNaN(g) || g < 0 || g > maxGrade)) {
      toast.error(t(lang, `الدرجة يجب أن تكون بين 0 و ${maxGrade}`, `Grade must be between 0 and ${maxGrade}`));
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("lms_submissions")
      .update({
        grade: g,
        feedback: feedback.trim() || null,
        graded_by: user.id,
        graded_at: new Date().toISOString(),
      })
      .eq("id", submission.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t(lang, "تم حفظ التقييم", "Grade saved"));
    onChanged();
  };

  return (
    <li className="rounded-xl border border-border bg-background p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <p className="font-semibold text-foreground">
            {studentName || `${t(lang, "طالب", "Student")} ${submission.student_id.slice(0, 8)}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {t(lang, "تم التسليم", "Submitted")}: {new Date(submission.submitted_at).toLocaleString()}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handleDownload} disabled={downloading}>
          {downloading && <Loader2 className="h-3.5 w-3.5 mx-1 animate-spin" />}
          {t(lang, "تنزيل الملف", "Download file")}
        </Button>
      </div>
      <div className="mt-3 grid sm:grid-cols-[120px_1fr_auto] gap-2 items-start">
        <div>
          <Label className="text-xs">{t(lang, "الدرجة", "Grade")} (/{maxGrade})</Label>
          <Input type="number" min="0" max={maxGrade} value={grade} onChange={(e) => setGrade(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">{t(lang, "تعليق", "Feedback")}</Label>
          <Textarea rows={2} value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={2000} />
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving} className="sm:mt-5">
          {saving && <Loader2 className="h-4 w-4 mx-1 animate-spin" />}
          {t(lang, "حفظ التقييم", "Save grade")}
        </Button>
      </div>
      {submission.graded_at && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {t(lang, "آخر تقييم", "Last graded")}: {new Date(submission.graded_at).toLocaleString()}
        </p>
      )}
    </li>
  );
}
