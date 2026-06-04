import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toUserMessage } from "@/lib/safe-error";
import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Send, Loader2, Image as ImageIcon, ClipboardList, ArrowRight, FileText, Check } from "lucide-react";
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
import { EnrollmentResponseViewer } from "@/components/lms/EnrollmentResponseViewer";
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
  id: string; slug: string | null; title_ar: string; title_en: string | null;
  description_ar: string | null; description_en: string | null;
  cover_url: string | null; level: string; price: number; is_free: boolean;
  status: string; category_id: string | null; instructor_id: string;
  enrollment_open: boolean; enrollment_deadline: string | null; max_students: number | null; students_count: number;
  start_date: string | null; end_date: string | null;
  schedule_days: string[] | null;
  schedule_time_from: string | null; schedule_time_to: string | null;
  location_ar: string | null; location_en: string | null;
  duration_hours: number | null;
};
type Section = { id: string; title: string; display_order: number };
type LessonAttachment = { name: string; url: string };
type Lesson = { id: string; section_id: string; title: string; video_url: string | null; content_md: string | null; is_preview: boolean; duration_seconds: number; display_order: number; attachments: LessonAttachment[] | null };
type Category = { id: string; name_ar: string; name_en: string | null };

function CourseBuilder() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, role } = useLmsAuth();
  const isAdmin = role === "lms_admin";
  const { lang } = useLang();
  const tr = lmsT[lang];
  const [course, setCourse] = useState<Course | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
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
  const [confirmDeleteCourse, setConfirmDeleteCourse] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState(false);
  const [enrollReqs, setEnrollReqs] = useState<Array<{ id: string; user_id: string; status: string; payment_method: string; notes: string | null; created_at: string }>>([]);
  const [viewing, setViewing] = useState<{ requestId: string; courseId: string } | null>(null);

  const load = async () => {
    const [{ data: c }, { data: cats }, { data: links }] = await Promise.all([
      supabase.from("lms_courses").select("*").eq("id", id).maybeSingle(),
      supabase.from("lms_categories").select("id,name_ar,name_en").order("display_order"),
      supabase.from("lms_course_categories").select("category_id").eq("course_id", id),
    ]);
    setCourse(c as Course | null);
    setCategories((cats as Category[]) ?? []);
    setSelectedCategoryIds(((links as { category_id: string }[]) ?? []).map((l) => l.category_id));
    if (c) {
      const { data: secs } = await supabase.from("lms_sections").select("id,title,display_order").eq("course_id", id).order("display_order");
      const sList = (secs as Section[]) ?? [];
      setSections(sList);
      if (sList.length) {
        const { data: lss } = await supabase.from("lms_lessons")
          .select("id,section_id,title,video_url,content_md,is_preview,duration_seconds,display_order,attachments")
          .in("section_id", sList.map((s) => s.id)).order("display_order");
        setLessons((lss as Lesson[]) ?? []);
      }
    }
    const { data: reqs } = await supabase
      .from("lms_enrollment_requests")
      .select("id,user_id,status,payment_method,notes,created_at")
      .eq("course_id", id)
      .order("created_at", { ascending: false });
    setEnrollReqs((reqs as Array<{ id: string; user_id: string; status: string; payment_method: string; notes: string | null; created_at: string }>) ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  if (!course) return <p className="text-center py-20 text-muted-foreground">{tr.loading}</p>;

  const update = (patch: Partial<Course>) => setCourse({ ...course, ...patch });

  const saveCourse = async () => {
    // Validate slug locally
    const slugVal = (course.slug ?? "").trim();
    if (slugVal && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugVal)) {
      toast.error(lang === "ar" ? "الرابط يجب أن يحتوي فقط على أحرف إنجليزية صغيرة وأرقام وشرطات" : "Slug may only contain lowercase letters, digits, and hyphens");
      return;
    }
    if (slugVal && (slugVal.length < 3 || slugVal.length > 60)) {
      toast.error(lang === "ar" ? "طول الرابط يجب أن يكون بين 3 و 60 حرفاً" : "Slug must be between 3 and 60 characters");
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      title_ar: course.title_ar, title_en: course.title_en,
      description_ar: course.description_ar, description_en: course.description_en,
      level: course.level as "beginner" | "intermediate" | "advanced",
      cover_url: course.cover_url,
      enrollment_open: course.enrollment_open, enrollment_deadline: course.enrollment_deadline, max_students: course.max_students,
      start_date: course.start_date, end_date: course.end_date,
      schedule_days: course.schedule_days, schedule_time_from: course.schedule_time_from, schedule_time_to: course.schedule_time_to,
      location_ar: course.location_ar, location_en: course.location_en,
      duration_hours: course.duration_hours,
      slug: slugVal || null,
    };
    payload.price = course.is_free ? 0 : course.price;
    payload.is_free = course.is_free;
    const { error } = await supabase.from("lms_courses").update(payload as never).eq("id", course.id);
    if (error) {
      setSaving(false);
      const msg = toUserMessage(error);
      if (/duplicate|unique|slug/i.test(msg)) {
        toast.error(lang === "ar" ? "هذا الرابط مستخدم من قِبل دورة أخرى" : "This slug is already used by another course");
      } else {
        toast.error(msg);
      }
      return;
    }
    // Sync many-to-many categories
    const { data: existing } = await supabase
      .from("lms_course_categories").select("category_id").eq("course_id", course.id);
    const existingIds = new Set(((existing as { category_id: string }[]) ?? []).map((r) => r.category_id));
    const selectedSet = new Set(selectedCategoryIds);
    const toAdd = selectedCategoryIds.filter((cid) => !existingIds.has(cid));
    const toRemove = [...existingIds].filter((cid) => !selectedSet.has(cid));
    if (toRemove.length) {
      await supabase.from("lms_course_categories")
        .delete().eq("course_id", course.id).in("category_id", toRemove);
    }
    if (toAdd.length) {
      const { error: insErr } = await supabase.from("lms_course_categories")
        .insert(toAdd.map((cid) => ({ course_id: course.id, category_id: cid })));
      if (insErr) {
        setSaving(false);
        toast.error(toUserMessage(insErr));
        return;
      }
    }
    setSaving(false);
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

  const openAddSection = () => {
    setSectionTitleDraft("");
    setSectionDialogOpen(true);
  };

  const confirmAddSection = async () => {
    const title = sectionTitleDraft.trim();
    if (!title) {
      toast.error(lang === "ar" ? "أدخل عنوان القسم" : "Enter a section title");
      return;
    }
    const { data, error } = await supabase.from("lms_sections")
      .insert({ course_id: course.id, title, display_order: sections.length })
      .select("*").maybeSingle();
    if (error) { toast.error(toUserMessage(error)); return; }
    if (data) setSections([...sections, data as Section]);
    setSectionDialogOpen(false);
  };

  const doDeleteSection = async (sid: string) => {
    const { error } = await supabase.from("lms_sections").delete().eq("id", sid);
    if (error) { toast.error(toUserMessage(error)); return; }
    setSections(sections.filter((s) => s.id !== sid));
    setLessons(lessons.filter((l) => l.section_id !== sid));
  };

  const openAddLesson = (sid: string) => {
    setLessonDialog({ open: true, sectionId: sid, title: "" });
  };

  const confirmAddLesson = async () => {
    const sid = lessonDialog.sectionId;
    const title = lessonDialog.title.trim();
    if (!sid || !title) {
      toast.error(lang === "ar" ? "أدخل عنوان الدرس" : "Enter a lesson title");
      return;
    }
    const order = lessons.filter((l) => l.section_id === sid).length;
    const { data, error } = await supabase.from("lms_lessons")
      .insert({ section_id: sid, title, display_order: order })
      .select("*").maybeSingle();
    if (error) { toast.error(toUserMessage(error)); return; }
    if (data) setLessons([...lessons, data as Lesson]);
    setLessonDialog({ open: false, sectionId: null, title: "" });
  };

  const updateLesson = async (lid: string, patch: Partial<Lesson>) => {
    setLessons(lessons.map((l) => l.id === lid ? { ...l, ...patch } : l));
    await supabase.from("lms_lessons").update(patch).eq("id", lid);
  };

  const doDeleteLesson = async (lid: string) => {
    await supabase.from("lms_lessons").delete().eq("id", lid);
    setLessons(lessons.filter((l) => l.id !== lid));
  };

  const runConfirmedDelete = async () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === "section") await doDeleteSection(confirmDelete.id);
    else await doDeleteLesson(confirmDelete.id);
    setConfirmDelete(null);
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

  const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;
  const uploadAttachments = async (lesson: Lesson, files: FileList | null) => {
    if (!user || !files || files.length === 0) return;
    const current = Array.isArray(lesson.attachments) ? lesson.attachments : [];
    const next = [...current];
    toast.info(lang === "ar" ? "جاري رفع المرفقات..." : "Uploading attachments...");
    for (const file of Array.from(files)) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        toast.error(`${file.name}: ${lang === "ar" ? "الحجم أكبر من 50 ميجابايت" : "larger than 50MB"}`);
        continue;
      }
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${user.id}/${course.id}/attachments/${lesson.id}/${Date.now()}-${safe}`;
      const { error } = await supabase.storage.from("lms-media").upload(path, file, { upsert: true, contentType: file.type || undefined });
      if (error) { toast.error(`${file.name}: ${toUserMessage(error)}`); continue; }
      const { data: pub } = supabase.storage.from("lms-media").getPublicUrl(path);
      next.push({ name: file.name, url: pub.publicUrl });
    }
    await updateLesson(lesson.id, { attachments: next });
    toast.success(lang === "ar" ? "تم رفع المرفقات" : "Attachments uploaded");
  };

  const removeAttachment = async (lesson: Lesson, idx: number) => {
    const current = Array.isArray(lesson.attachments) ? lesson.attachments : [];
    const next = current.filter((_, i) => i !== idx);
    await updateLesson(lesson.id, { attachments: next });
  };

  const deleteWholeCourse = async () => {
    setDeletingCourse(true);
    const { error } = await supabase.rpc("lms_delete_course", { _course_id: course.id });
    setDeletingCourse(false);
    if (error) { toast.error(toUserMessage(error)); return; }
    toast.success(lang === "ar" ? "تم حذف الدورة" : "Course deleted");
    navigate({ to: "/learning-management-system/instructor" });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-8">
      {/* Header bar */}
      <div className="rounded-2xl border border-border bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-sm px-4 sm:px-5 py-4">
        <button
          onClick={() => navigate({ to: "/learning-management-system/instructor" })}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
          {lang === "ar" ? "كل الدورات" : "All courses"}
        </button>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground truncate">
              {lang === "ar" ? "تحرير الدورة" : "Edit course"}
            </h1>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{lang === "ar" ? "الحالة" : "Status"}:</span>
              <span className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 font-semibold text-foreground">
                {course.status}
              </span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap">
            <Button onClick={saveCourse} variant="outline" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mx-1" /> : <Save className="h-4 w-4 mx-1" />}
              {lang === "ar" ? "حفظ" : "Save"}
            </Button>
            {course.status === "draft" && (
              <Button onClick={submitForReview}><Send className="h-4 w-4 mx-1" />{lang === "ar" ? "إرسال للمراجعة" : "Submit"}</Button>
            )}
            <Button variant="destructive" onClick={() => setConfirmDeleteCourse(true)} disabled={deletingCourse}>
              <Trash2 className="h-4 w-4 mx-1" />
              {lang === "ar" ? "حذف الدورة" : "Delete course"}
            </Button>
          </div>
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

        <div>
          <Label>{lang === "ar" ? "الرابط المخصّص للدورة (Slug)" : "Custom course URL (Slug)"}</Label>
          <Input
            value={course.slug ?? ""}
            onChange={(e) => update({ slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") })}
            placeholder="my-course-name"
            dir="ltr"
            className="font-mono"
          />
          <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
            aisyria.org/learning-management-system/courses/<span className="font-semibold text-foreground">{course.slug || "..."}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {lang === "ar"
              ? "أحرف إنجليزية صغيرة وأرقام وشرطات فقط (3–60 حرفاً). يجب أن يكون فريداً."
              : "Lowercase letters, digits, and hyphens only (3–60 chars). Must be unique."}
          </p>
        </div>


        <div className="space-y-2">
          <Label>{tr.filterCategory}</Label>
          <p className="text-xs text-muted-foreground">
            {lang === "ar" ? "يمكنك اختيار أكثر من فئة للدورة" : "You can select multiple categories for this course"}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-md border border-input bg-background p-3 max-h-56 overflow-auto">
            {categories.length === 0 && (
              <p className="text-xs text-muted-foreground col-span-full">
                {lang === "ar" ? "لا توجد فئات متاحة" : "No categories available"}
              </p>
            )}
            {categories.map((c) => {
              const checked = selectedCategoryIds.includes(c.id);
              return (
                <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer rounded px-2 py-1 hover:bg-accent">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setSelectedCategoryIds((prev) =>
                        e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id),
                      );
                    }}
                  />
                  <span>{lang === "ar" ? c.name_ar : c.name_en || c.name_ar}</span>
                </label>
              );
            })}
          </div>
          {selectedCategoryIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedCategoryIds.map((cid) => {
                const cat = categories.find((c) => c.id === cid);
                if (!cat) return null;
                return (
                  <span key={cid} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5">
                    {lang === "ar" ? cat.name_ar : cat.name_en || cat.name_ar}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">

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
              <label className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={course.is_free}
                  onChange={(e) => update({ is_free: e.target.checked })} />{tr.free}
              </label>
              {!course.is_free && (
                <Input type="number" min={0} step={0.01} value={course.price}
                  onChange={(e) => update({ price: parseFloat(e.target.value) || 0 })} className="h-8" />
              )}
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
          <Label>{lang === "ar" ? "آخر موعد للتسجيل (اختياري)" : "Enrollment deadline (optional)"}</Label>
          <Input
            type="datetime-local"
            value={(() => {
              if (!course.enrollment_deadline) return "";
              const d = new Date(course.enrollment_deadline);
              const off = d.getTimezoneOffset() * 60000;
              return new Date(d.getTime() - off).toISOString().slice(0, 16);
            })()}
            onChange={(e) => {
              const v = e.target.value;
              update({ enrollment_deadline: v ? new Date(v).toISOString() : null });
            }}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {lang === "ar" ? "بعد هذا التاريخ لن يتمكن الطلاب من التسجيل." : "After this date students cannot enroll."}
          </p>
        </div>
        <div>
          <Label>{lang === "ar" ? "الحد الأقصى للطلاب (اختياري)" : "Max students (optional)"}</Label>
          <Input
            type="number"
            min={0}
            value={course.max_students ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              update({ max_students: v === "" ? null : Math.max(0, parseInt(v, 10) || 0) });
            }}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {lang === "ar"
              ? `المسجلون حالياً: ${course.students_count}. اتركه فارغاً لعدم وجود حد.`
              : `Currently enrolled: ${course.students_count}. Leave empty for no limit.`}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {lang === "ar" ? "اضغط حفظ بالأعلى لتطبيق التغييرات." : "Click Save above to apply changes."}
        </p>
      </section>

      {/* Schedule & location */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-bold text-foreground">{lang === "ar" ? "التاريخ والوقت والمكان" : "Schedule & location"}</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>{lang === "ar" ? "تاريخ البداية" : "Start date"}</Label>
            <Input
              type="date"
              value={course.start_date ? new Date(course.start_date).toISOString().slice(0, 10) : ""}
              onChange={(e) => update({ start_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
            />
          </div>
          <div>
            <Label>{lang === "ar" ? "تاريخ النهاية" : "End date"}</Label>
            <Input
              type="date"
              value={course.end_date ? new Date(course.end_date).toISOString().slice(0, 10) : ""}
              onChange={(e) => update({ end_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
            />
          </div>
          <div>
            <Label>{lang === "ar" ? "وقت البداية" : "Start time"}</Label>
            <Input
              type="time"
              value={course.schedule_time_from ?? ""}
              onChange={(e) => update({ schedule_time_from: e.target.value || null })}
            />
          </div>
          <div>
            <Label>{lang === "ar" ? "وقت النهاية" : "End time"}</Label>
            <Input
              type="time"
              value={course.schedule_time_to ?? ""}
              onChange={(e) => update({ schedule_time_to: e.target.value || null })}
            />
          </div>
        </div>
        <div>
          <Label>{lang === "ar" ? "أيام الأسبوع" : "Days of week"}</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["sat","sun","mon","tue","wed","thu","fri"] as const).map((d) => {
              const labels: Record<string, { ar: string; en: string }> = {
                sat: { ar: "السبت", en: "Sat" }, sun: { ar: "الأحد", en: "Sun" },
                mon: { ar: "الإثنين", en: "Mon" }, tue: { ar: "الثلاثاء", en: "Tue" },
                wed: { ar: "الأربعاء", en: "Wed" }, thu: { ar: "الخميس", en: "Thu" },
                fri: { ar: "الجمعة", en: "Fri" },
              };
              const sel = (course.schedule_days ?? []).includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    const curr = course.schedule_days ?? [];
                    update({ schedule_days: sel ? curr.filter((x) => x !== d) : [...curr, d] });
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    sel ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input hover:bg-muted"
                  }`}
                >
                  {lang === "ar" ? labels[d].ar : labels[d].en}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>{lang === "ar" ? "المكان (عربي)" : "Location (Arabic)"}</Label>
            <Input
              value={course.location_ar ?? ""}
              onChange={(e) => update({ location_ar: e.target.value || null })}
              placeholder={lang === "ar" ? "مثال: دمشق - أونلاين عبر Zoom" : "مثال: دمشق - أونلاين عبر Zoom"}
            />
          </div>
          <div>
            <Label>{lang === "ar" ? "المكان (إنجليزي)" : "Location (English)"}</Label>
            <Input
              value={course.location_en ?? ""}
              onChange={(e) => update({ location_en: e.target.value || null })}
              placeholder="e.g. Damascus / Online via Zoom"
            />
          </div>
          <div>
            <Label>{lang === "ar" ? "مدة الدورة (بالساعات)" : "Course duration (hours)"}</Label>
            <Input
              type="number"
              min={0}
              step="0.5"
              value={course.duration_hours ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                update({ duration_hours: v === "" ? null : Math.max(0, parseFloat(v) || 0) });
              }}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {lang === "ar" ? "اضغط حفظ بالأعلى لتطبيق التغييرات." : "Click Save above to apply changes."}
        </p>
      </section>



      {/* Enrollment requests (form answers) */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h2 className="font-bold text-foreground">{lang === "ar" ? "طلبات التسجيل وبياناتها" : "Enrollment requests & form data"}</h2>
        {enrollReqs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{lang === "ar" ? "لا توجد طلبات بعد." : "No requests yet."}</p>
        ) : (
          <ul className="divide-y divide-border">
            {enrollReqs.map((r) => (
              <li key={r.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-mono text-muted-foreground truncate max-w-[260px]">{r.user_id}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    <span className={`inline-block rounded-full px-2 py-0.5 me-1 ${
                      r.status === "pending" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" :
                      r.status === "approved" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" :
                      r.status === "rejected" ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {lang === "ar" ? ({ pending: "قيد المراجعة", approved: "موافَق", rejected: "مرفوض", cancelled: "ملغى" } as Record<string, string>)[r.status] ?? r.status : r.status}
                    </span>
                    {new Date(r.created_at).toLocaleDateString(lang === "ar" ? "ar" : "en")}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setViewing({ requestId: r.id, courseId: course.id })}>
                  <FileText className="h-4 w-4 mx-1" />
                  {lang === "ar" ? "عرض بيانات التسجيل" : "View form answers"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-foreground">{tr.syllabus}</h2>
          <Button size="sm" onClick={openAddSection}><Plus className="h-4 w-4 mx-1" />{lang === "ar" ? "قسم" : "Section"}</Button>
        </div>
        <div className="mt-4 space-y-4">
          {sections.length === 0 && <p className="text-sm text-muted-foreground">{lang === "ar" ? "لا توجد أقسام بعد" : "No sections yet"}</p>}
          {sections.map((s) => (
            <div key={s.id} className="rounded-xl border border-border">
              <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-muted/40">
                <span className="font-semibold text-foreground">{s.title}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openAddLesson(s.id)}><Plus className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete({ type: "section", id: s.id })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDelete({ type: "lesson", id: l.id })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs">
                        <label className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-input bg-background cursor-pointer hover:bg-muted">
                          <Plus className="h-3.5 w-3.5" />
                          <span>{lang === "ar" ? "أضف مرفقات" : "Add attachments"}</span>
                          <input type="file" multiple className="hidden" onChange={(e) => { uploadAttachments(l, e.target.files); e.target.value = ""; }} />
                        </label>
                        <span className="text-muted-foreground">{lang === "ar" ? "PDF / صور / مستندات — حتى 50 ميجابايت لكل ملف" : "PDF / images / docs — up to 50MB each"}</span>
                      </div>
                      {Array.isArray(l.attachments) && l.attachments.length > 0 && (
                        <ul className="flex flex-wrap gap-1.5">
                          {l.attachments.map((a, i) => (
                            <li key={i} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs">
                              <a href={a.url} target="_blank" rel="noreferrer" className="truncate max-w-[200px] text-foreground hover:text-primary">{a.name}</a>
                              <button type="button" onClick={() => removeAttachment(l, i)} className="text-muted-foreground hover:text-destructive" aria-label="remove">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
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

      {/* Add Section dialog */}
      <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{lang === "ar" ? "إضافة قسم" : "Add section"}</DialogTitle>
            <DialogDescription>
              {lang === "ar" ? "أدخل عنوان القسم الجديد." : "Enter a title for the new section."}
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={sectionTitleDraft}
            onChange={(e) => setSectionTitleDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmAddSection(); } }}
            placeholder={lang === "ar" ? "مثال: مقدمة" : "e.g. Introduction"}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSectionDialogOpen(false)}>
              {lang === "ar" ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={confirmAddSection}>{lang === "ar" ? "إضافة" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Lesson dialog */}
      <Dialog
        open={lessonDialog.open}
        onOpenChange={(open) => setLessonDialog((s) => ({ ...s, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{lang === "ar" ? "إضافة درس" : "Add lesson"}</DialogTitle>
            <DialogDescription>
              {lang === "ar" ? "أدخل عنوان الدرس الجديد." : "Enter a title for the new lesson."}
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={lessonDialog.title}
            onChange={(e) => setLessonDialog((s) => ({ ...s, title: e.target.value }))}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmAddLesson(); } }}
            placeholder={lang === "ar" ? "مثال: الدرس الأول" : "e.g. Lesson 1"}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setLessonDialog({ open: false, sectionId: null, title: "" })}>
              {lang === "ar" ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={confirmAddLesson}>{lang === "ar" ? "إضافة" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDelete?.type === "section"
                ? (lang === "ar" ? "حذف القسم؟" : "Delete section?")
                : (lang === "ar" ? "حذف الدرس؟" : "Delete lesson?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {lang === "ar" ? "لا يمكن التراجع عن هذا الإجراء." : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{lang === "ar" ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={runConfirmedDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {lang === "ar" ? "حذف" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDeleteCourse} onOpenChange={setConfirmDeleteCourse}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {lang === "ar" ? "حذف الدورة بالكامل؟" : "Delete entire course?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {lang === "ar"
                ? "سيتم حذف كل الأقسام، الدروس، الاختبارات، الواجبات، التقييمات، الشهادات، التسجيلات والطلبات. لا يمكن التراجع."
                : "All sections, lessons, quizzes, assignments, reviews, certificates, enrollments and requests will be permanently removed. This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{lang === "ar" ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteWholeCourse}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingCourse && <Loader2 className="h-4 w-4 animate-spin mx-1" />}
              {lang === "ar" ? "حذف الدورة" : "Delete course"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {viewing && (
        <EnrollmentResponseViewer
          open={!!viewing}
          onOpenChange={(v) => { if (!v) setViewing(null); }}
          requestId={viewing.requestId}
          courseId={viewing.courseId}
        />
      )}
    </div>
  );
}
