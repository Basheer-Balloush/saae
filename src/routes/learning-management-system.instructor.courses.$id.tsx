import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toUserMessage } from "@/lib/safe-error";
import { useEffect, useState } from "react";
import { Plus, Trash2, Save, Send, Loader2, Image as ImageIcon, ClipboardList, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { QuizBuilder } from "@/components/lms/QuizBuilder";
import { CourseFormBuilder } from "@/components/lms/CourseFormBuilder";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/learning-management-system/instructor/courses/$id")({
  head: () => ({ meta: [{ title: "LMS · Edit course" }] }),
  component: CourseBuilder,
});

type Course = {
  id: string; title_ar: string; title_en: string | null;
  description_ar: string | null; description_en: string | null;
  cover_url: string | null; level: string; price: number; is_free: boolean;
  status: string; category_id: string | null; instructor_id: string;
  enrollment_open: boolean; max_students: number | null;
};
type Section = { id: string; title: string; display_order: number };
type Lesson = { id: string; section_id: string; title: string; video_url: string | null; content_md: string | null; is_preview: boolean; duration_seconds: number; display_order: number };
type Category = { id: string; name_ar: string; name_en: string | null };

function CourseBuilder() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useLmsAuth();
  const { lang } = useLang();
  const tr = lmsT[lang];
  const [course, setCourse] = useState<Course | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  // In-app dialog state replacing native prompt()/confirm()
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [sectionTitleDraft, setSectionTitleDraft] = useState("");
  const [lessonDialog, setLessonDialog] = useState<{ open: boolean; sectionId: string | null; title: string }>({ open: false, sectionId: null, title: "" });
  const [confirmDelete, setConfirmDelete] = useState<
    | { type: "section"; id: string }
    | { type: "lesson"; id: string }
    | null
  >(null);

  const load = async () => {
    const [{ data: c }, { data: cats }] = await Promise.all([
      supabase.from("lms_courses").select("*").eq("id", id).maybeSingle(),
      supabase.from("lms_categories").select("id,name_ar,name_en").order("display_order"),
    ]);
    setCourse(c as Course | null);
    setCategories((cats as Category[]) ?? []);
    if (c) {
      const { data: secs } = await supabase.from("lms_sections").select("id,title,display_order").eq("course_id", id).order("display_order");
      const sList = (secs as Section[]) ?? [];
      setSections(sList);
      if (sList.length) {
        const { data: lss } = await supabase.from("lms_lessons")
          .select("id,section_id,title,video_url,content_md,is_preview,duration_seconds,display_order")
          .in("section_id", sList.map((s) => s.id)).order("display_order");
        setLessons((lss as Lesson[]) ?? []);
      }
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  if (!course) return <p className="text-center py-20 text-muted-foreground">{tr.loading}</p>;

  const update = (patch: Partial<Course>) => setCourse({ ...course, ...patch });

  const saveCourse = async () => {
    setSaving(true);
    const { error } = await supabase.from("lms_courses").update({
      title_ar: course.title_ar, title_en: course.title_en,
      description_ar: course.description_ar, description_en: course.description_en,
      level: course.level as "beginner" | "intermediate" | "advanced", price: course.price, is_free: course.is_free,
      category_id: course.category_id, cover_url: course.cover_url,
      enrollment_open: course.enrollment_open, max_students: course.max_students,
    }).eq("id", course.id);
    setSaving(false);
    if (error) { toast.error(toUserMessage(error)); return; }
    toast.success(lang === "ar" ? "تم الحفظ" : "Saved");
  };

  const submitForReview = async () => {
    const { error } = await supabase.from("lms_courses").update({ status: "pending" }).eq("id", course.id);
    if (error) { toast.error(toUserMessage(error)); return; }
    setCourse({ ...course, status: "pending" });
    toast.success(lang === "ar" ? "تم الإرسال للمراجعة" : "Submitted for review");
  };

  const uploadCover = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const path = `${user.id}/${course.id}/cover-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("lms-media").upload(path, file, { upsert: true });
    if (error) { setUploading(false); toast.error(toUserMessage(error)); return; }
    const { data: pub } = supabase.storage.from("lms-media").getPublicUrl(path);
    update({ cover_url: pub.publicUrl });
    await supabase.from("lms_courses").update({ cover_url: pub.publicUrl }).eq("id", course.id);
    setUploading(false);
    toast.success(lang === "ar" ? "تم رفع الغلاف" : "Cover uploaded");
  };

  const addSection = async () => {
    const title = prompt(lang === "ar" ? "عنوان القسم" : "Section title");
    if (!title) return;
    const { data, error } = await supabase.from("lms_sections")
      .insert({ course_id: course.id, title, display_order: sections.length })
      .select("*").maybeSingle();
    if (error) { toast.error(toUserMessage(error)); return; }
    if (data) setSections([...sections, data as Section]);
  };

  const deleteSection = async (sid: string) => {
    if (!confirm(lang === "ar" ? "حذف القسم؟" : "Delete section?")) return;
    const { error } = await supabase.from("lms_sections").delete().eq("id", sid);
    if (error) { toast.error(toUserMessage(error)); return; }
    setSections(sections.filter((s) => s.id !== sid));
    setLessons(lessons.filter((l) => l.section_id !== sid));
  };

  const addLesson = async (sid: string) => {
    const title = prompt(lang === "ar" ? "عنوان الدرس" : "Lesson title");
    if (!title) return;
    const order = lessons.filter((l) => l.section_id === sid).length;
    const { data, error } = await supabase.from("lms_lessons")
      .insert({ section_id: sid, title, display_order: order })
      .select("*").maybeSingle();
    if (error) { toast.error(toUserMessage(error)); return; }
    if (data) setLessons([...lessons, data as Lesson]);
  };

  const updateLesson = async (lid: string, patch: Partial<Lesson>) => {
    setLessons(lessons.map((l) => l.id === lid ? { ...l, ...patch } : l));
    await supabase.from("lms_lessons").update(patch).eq("id", lid);
  };

  const deleteLesson = async (lid: string) => {
    if (!confirm(lang === "ar" ? "حذف الدرس؟" : "Delete lesson?")) return;
    await supabase.from("lms_lessons").delete().eq("id", lid);
    setLessons(lessons.filter((l) => l.id !== lid));
  };

  const uploadVideo = async (lesson: Lesson, file: File) => {
    if (!user) return;
    const path = `${user.id}/${course.id}/${lesson.id}-${Date.now()}.${file.name.split(".").pop()}`;
    toast.info(lang === "ar" ? "جاري رفع الفيديو..." : "Uploading video...");
    const { error } = await supabase.storage.from("lms-private").upload(path, file, { upsert: true });
    if (error) { toast.error(toUserMessage(error)); return; }
    // Store the storage path with prefix; the player resolves a fresh short-lived signed URL on demand
    await updateLesson(lesson.id, { video_url: `private:${path}` });
    toast.success(lang === "ar" ? "تم رفع الفيديو" : "Video uploaded");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <button onClick={() => navigate({ to: "/learning-management-system/instructor" })} className="text-xs text-muted-foreground hover:text-primary">
            ← {lang === "ar" ? "كل الدورات" : "All courses"}
          </button>
          <h1 className="mt-1 text-2xl font-bold text-foreground">{lang === "ar" ? "تحرير الدورة" : "Edit course"}</h1>
          <span className="text-xs text-muted-foreground">{lang === "ar" ? "الحالة" : "Status"}: <b>{course.status}</b></span>
        </div>
        <div className="flex gap-2">
          <Button onClick={saveCourse} variant="outline" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mx-1" /> : <Save className="h-4 w-4 mx-1" />}
            {lang === "ar" ? "حفظ" : "Save"}
          </Button>
          {course.status === "draft" && (
            <Button onClick={submitForReview}><Send className="h-4 w-4 mx-1" />{lang === "ar" ? "إرسال للمراجعة" : "Submit"}</Button>
          )}
        </div>
      </div>

      {/* Details */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h2 className="font-bold text-foreground">{lang === "ar" ? "المعلومات الأساسية" : "Basic info"}</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>{lang === "ar" ? "العنوان (عربي)" : "Title (AR)"}</Label>
            <Input value={course.title_ar} onChange={(e) => update({ title_ar: e.target.value })} /></div>
          <div><Label>{lang === "ar" ? "العنوان (إنجليزي)" : "Title (EN)"}</Label>
            <Input value={course.title_en ?? ""} onChange={(e) => update({ title_en: e.target.value })} /></div>
        </div>
        <div><Label>{lang === "ar" ? "الوصف (عربي)" : "Description (AR)"}</Label>
          <Textarea rows={3} value={course.description_ar ?? ""} onChange={(e) => update({ description_ar: e.target.value })} /></div>
        <div><Label>{lang === "ar" ? "الوصف (إنجليزي)" : "Description (EN)"}</Label>
          <Textarea rows={3} value={course.description_en ?? ""} onChange={(e) => update({ description_en: e.target.value })} /></div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div><Label>{tr.filterCategory}</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={course.category_id ?? ""} onChange={(e) => update({ category_id: e.target.value || null })}>
              <option value="">--</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{lang === "ar" ? c.name_ar : c.name_en || c.name_ar}</option>)}
            </select>
          </div>
          <div><Label>{tr.filterLevel}</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={course.level} onChange={(e) => update({ level: e.target.value })}>
              <option value="beginner">{tr.beginner}</option>
              <option value="intermediate">{tr.intermediate}</option>
              <option value="advanced">{tr.advanced}</option>
            </select>
          </div>
          <div><Label>{tr.filterPrice}</Label>
            <div className="flex items-center gap-2 h-10">
              <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={course.is_free} onChange={(e) => update({ is_free: e.target.checked })} />{tr.free}</label>
              {!course.is_free && <Input type="number" min={0} step={0.01} value={course.price} onChange={(e) => update({ price: parseFloat(e.target.value) || 0 })} className="h-8" />}
            </div>
          </div>
        </div>

        <div>
          <Label>{lang === "ar" ? "صورة الغلاف" : "Cover image"}</Label>
          <div className="flex items-center gap-3 mt-1">
            {course.cover_url ? (
              <img src={course.cover_url} alt="" className="h-20 w-32 object-cover rounded-lg border border-border" />
            ) : (
              <div className="h-20 w-32 rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground">
                <ImageIcon className="h-6 w-6" />
              </div>
            )}
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background text-sm cursor-pointer hover:bg-muted">
              <span>{lang === "ar" ? "اختر صورة" : "Choose image"}</span>
              <input type="file" accept="image/*" disabled={uploading} className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(f); }} />
            </label>
          </div>
        </div>
      </section>

      {/* Enrollment management */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-bold text-foreground">{lang === "ar" ? "إدارة التسجيل" : "Enrollment management"}</h2>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="cursor-pointer" htmlFor="enroll-open">{lang === "ar" ? "التسجيل مفتوح" : "Enrollment open"}</Label>
            <p className="text-xs text-muted-foreground">{lang === "ar" ? "أغلق التسجيل لمنع طلبات جديدة" : "Close enrollment to stop new requests."}</p>
          </div>
          <input
            id="enroll-open"
            type="checkbox"
            className="h-5 w-5"
            checked={course.enrollment_open}
            onChange={(e) => update({ enrollment_open: e.target.checked })}
          />
        </div>
        <div>
          <Label>{lang === "ar" ? "الحد الأقصى لعدد الطلاب (اتركه فارغاً = غير محدود)" : "Max students (empty = unlimited)"}</Label>
          <Input
            type="number"
            min={1}
            value={course.max_students ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              update({ max_students: v === "" ? null : Math.max(1, parseInt(v) || 0) });
            }}
            placeholder={lang === "ar" ? "غير محدود" : "Unlimited"}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {lang === "ar" ? "اضغط حفظ بالأعلى لتطبيق التغييرات." : "Click Save above to apply changes."}
        </p>
      </section>
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-foreground">{tr.syllabus}</h2>
          <Button size="sm" onClick={addSection}><Plus className="h-4 w-4 mx-1" />{lang === "ar" ? "قسم" : "Section"}</Button>
        </div>
        <div className="mt-4 space-y-4">
          {sections.length === 0 && <p className="text-sm text-muted-foreground">{lang === "ar" ? "لا توجد أقسام بعد" : "No sections yet"}</p>}
          {sections.map((s) => (
            <div key={s.id} className="rounded-xl border border-border">
              <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-muted/40">
                <span className="font-semibold text-foreground">{s.title}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => addLesson(s.id)}><Plus className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteSection(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
              <ul className="divide-y divide-border">
                {lessons.filter((l) => l.section_id === s.id).map((l) => (
                  <li key={l.id} className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input value={l.title} onChange={(e) => setLessons(lessons.map((x) => x.id === l.id ? { ...x, title: e.target.value } : x))}
                        onBlur={() => updateLesson(l.id, { title: l.title })} className="flex-1" />
                      <label className="text-xs flex items-center gap-1">
                        <input type="checkbox" checked={l.is_preview} onChange={(e) => updateLesson(l.id, { is_preview: e.target.checked })} />
                        {lang === "ar" ? "معاينة" : "Preview"}
                      </label>
                      <Button size="sm" variant="ghost" onClick={() => deleteLesson(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <label className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-input bg-background cursor-pointer hover:bg-muted">
                        <span>{lang === "ar" ? "اختر فيديو" : "Choose video"}</span>
                        <input type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadVideo(l, f); }} />
                      </label>
                      {l.video_url && <span className="text-emerald-600">✓ {lang === "ar" ? "تم رفع الفيديو" : "video"}</span>}
                    </div>
                    <Textarea rows={2} placeholder={lang === "ar" ? "محتوى الدرس (Markdown)" : "Lesson content (Markdown)"}
                      value={l.content_md ?? ""}
                      onChange={(e) => setLessons(lessons.map((x) => x.id === l.id ? { ...x, content_md: e.target.value } : x))}
                      onBlur={() => updateLesson(l.id, { content_md: l.content_md })} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6">
        <Link to="/learning-management-system/instructor/assignments/$courseId" params={{ courseId: course.id }}>
          <Button variant="outline">
            <ClipboardList className="h-4 w-4 mx-1" />
            {lang === "ar" ? "إدارة الوظائف" : "Manage Assignments"}
          </Button>
        </Link>
      </div>

      <QuizBuilder courseId={course.id} />

      <CourseFormBuilder courseId={course.id} />
    </div>
  );
}
