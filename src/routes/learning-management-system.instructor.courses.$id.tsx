import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toUserMessage } from "@/lib/safe-error";
import { useServerFn } from "@tanstack/react-start";
import { previewCourseCertificate } from "@/lib/certificates/certificate-pdf.functions";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Save, Send, Loader2, Image as ImageIcon, ClipboardList, ArrowRight, FileText } from "lucide-react";
import { CoursePrice } from "@/components/lms/CoursePrice";
import { supabase } from "@/integrations/supabase/client";
import { useCourseParticipantNames } from "@/hooks/useCourseParticipantNames";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useRecordDraft } from "@/hooks/useFormDraft";
import { formDraftKey } from "@/lib/form-draft";
import { DraftNotice } from "@/components/admin/DraftNotice";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { QuizBuilder } from "@/components/lms/QuizBuilder";
import { CourseFormBuilder } from "@/components/lms/CourseFormBuilder";
import { createBunnyUpload, setLessonBunnyVideo, refreshBunnyLessonStatus } from "@/lib/bunny-stream.functions";
import * as tus from "tus-js-client";
import { EnrollmentResponseViewer } from "@/components/lms/EnrollmentResponseViewer";
import { CourseCoInstructors } from "@/components/lms/CourseCoInstructors";
import { uploadToSupabaseStorage } from "@/lib/upload-with-progress";
import { UploadProgress } from "@/components/ui/upload-progress";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { confirmDialog } from "@/hooks/useConfirm";
import {
  validateCourseI18n,
  firstInvalidCourseField,
  trimCourseI18n,
  courseI18nWriteErrorMessage,
  isCourseI18nComplete,
  REQUIRED_COURSE_FIELDS,
  type CourseFieldErrors,
  type CourseI18nInput,
  type RequiredCourseField,
} from "@/lib/lms-course-fields";

export const Route = createFileRoute("/learning-management-system/instructor/courses/$id")({
  head: () => ({ meta: [{ title: "LMS · Edit course" }] }),
  component: CourseBuilder,
});

type Course = {
  id: string; slug: string | null; title_ar: string; title_en: string | null;
  description_ar: string | null; description_en: string | null;
  cover_url: string | null; level: string; price: number; sale_price: number | null; is_free: boolean;
  status: string; category_id: string | null; instructor_id: string;
  enrollment_open: boolean; enrollment_deadline: string | null; max_students: number | null; students_count: number;
  start_date: string | null; end_date: string | null;
  schedule_days: string[] | null;
  schedule_time_from: string | null; schedule_time_to: string | null;
  location_ar: string | null; location_en: string | null;
  duration_hours: number | null;
  delivery_mode: "onsite" | "online";
  certificate_pdf_enabled: boolean;
};
type Section = { id: string; title: string; title_ar: string | null; title_en: string | null; display_order: number };
type LessonAttachment = { name: string; url: string; path?: string };
type Lesson = { id: string; section_id: string; title: string; title_ar: string | null; title_en: string | null; video_url: string | null; video_provider: string; video_uid: string | null; video_ready: boolean; video_status: string; content_md: string | null; content_md_ar: string | null; content_md_en: string | null; is_preview: boolean; duration_seconds: number; display_order: number; attachments: LessonAttachment[] | null };
type Category = { id: string; name_ar: string; name_en: string | null };

// Everything typed on this page that a refresh could lose: the course fields sent by
// saveCourse, plus section and lesson texts (those save on blur).
const COURSE_DRAFT_FIELDS = [
  "slug", "title_ar", "title_en", "description_ar", "description_en", "cover_url", "level",
  "price", "sale_price", "is_free", "enrollment_open", "enrollment_deadline", "max_students", "certificate_pdf_enabled",
  "start_date", "end_date", "schedule_days", "schedule_time_from", "schedule_time_to",
  "location_ar", "location_en", "duration_hours",
] as const satisfies readonly (keyof Course)[];
type CourseEdits = {
  course: Partial<Course>;
  categoryIds: string[];
  sections: Record<string, Pick<Section, "title_ar" | "title_en">>;
  lessons: Record<string, Pick<Lesson, "title_ar" | "title_en" | "content_md_ar" | "content_md_en">>;
};
function courseEdits(c: Course, categoryIds: string[], sections: Section[], lessons: Lesson[]): CourseEdits {
  return {
    course: Object.fromEntries(COURSE_DRAFT_FIELDS.map((k) => [k, c[k]])) as Partial<Course>,
    categoryIds: [...categoryIds].sort(),
    sections: Object.fromEntries(sections.map((x) => [x.id, { title_ar: x.title_ar, title_en: x.title_en }])),
    lessons: Object.fromEntries(
      lessons.map((l) => [l.id, { title_ar: l.title_ar, title_en: l.title_en, content_md_ar: l.content_md_ar, content_md_en: l.content_md_en }]),
    ),
  };
}

function CourseBuilder() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useLmsAuth();
  const participants = useCourseParticipantNames(id, user?.id, authLoading);
  const isAdmin = role === "admin";
  const { lang } = useLang();
  const tr = lmsT[lang];
  const participantName = (uid: string) => participants.names[uid]?.trim() || (participants.loading ? (lang === "ar" ? "جارٍ تحميل الاسم…" : "Loading name…") : (lang === "ar" ? "الاسم غير متوفر" : "Name unavailable"));
  const [course, setCourse] = useState<Course | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [saving, setSaving] = useState(false);
  const [switchingMode, setSwitchingMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [coverPct, setCoverPct] = useState<{ pct: number; loaded: number; total: number; name: string } | null>(null);
  const [attachPct, setAttachPct] = useState<Record<string, { pct: number; loaded: number; total: number; name: string }>>({});
  const [videoProgress, setVideoProgress] = useState<Record<string, { pct: number; speedMbps: number; etaSec: number }>>({});
  // In-app dialog state replacing native prompt()/confirm()
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [sectionTitleArDraft, setSectionTitleArDraft] = useState("");
  const [sectionTitleEnDraft, setSectionTitleEnDraft] = useState("");
  const [lessonDialog, setLessonDialog] = useState<{ open: boolean; sectionId: string | null; title_ar: string; title_en: string }>({ open: false, sectionId: null, title_ar: "", title_en: "" });
  const [confirmDelete, setConfirmDelete] = useState<
    | { type: "section"; id: string }
    | { type: "lesson"; id: string }
    | null
  >(null);
  const [confirmDeleteCourse, setConfirmDeleteCourse] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState(false);
  const [enrollReqs, setEnrollReqs] = useState<Array<{ id: string; user_id: string; status: string; payment_method: string; notes: string | null; created_at: string }>>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<Array<{ id: string; student_id: string; enrolled_at: string; progress: number }>>([]);
  const [showAllStudents, setShowAllStudents] = useState(false);
  const [viewing, setViewing] = useState<{ requestId: string; courseId: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CourseFieldErrors>({});
  // Which of the four required fields already had content when the course loaded.
  // Existing incomplete drafts stay editable, but a filled field can never be emptied.
  const originallyFilled = useRef<Partial<Record<RequiredCourseField, boolean>>>({});
  const fieldRefs = useRef<Partial<Record<RequiredCourseField, HTMLInputElement | HTMLTextAreaElement | null>>>({});

  const [loadedEdits, setLoadedEdits] = useState<CourseEdits | null>(null);

  const load = async () => {
    // No draft saving while a fresh copy arrives piece by piece.
    setLoadedEdits(null);
    const [{ data: c }, { data: cats }, { data: links }] = await Promise.all([
      supabase.from("lms_courses").select("*").eq("id", id).maybeSingle(),
      supabase.from("lms_categories").select("id,name_ar,name_en").order("display_order"),
      supabase.from("lms_course_categories").select("category_id").eq("course_id", id),
    ]);
    setCourse(c as Course | null);
    if (c) {
      const trimmed = trimCourseI18n(c as CourseI18nInput);
      originallyFilled.current = Object.fromEntries(
        REQUIRED_COURSE_FIELDS.map((f) => [f, trimmed[f].length > 0]),
      ) as Partial<Record<RequiredCourseField, boolean>>;
    }
    setCategories((cats as Category[]) ?? []);
    setSelectedCategoryIds(((links as { category_id: string }[]) ?? []).map((l) => l.category_id));
    if (c) {
      const { data: secs } = await supabase.from("lms_sections").select("id,title,title_ar,title_en,display_order").eq("course_id", id).order("display_order");
      const sList = (secs as Section[]) ?? [];
      setSections(sList);
      let lList: Lesson[] = [];
      if (sList.length) {
        const { data: lss } = await supabase.from("lms_lessons")
          .select("id,section_id,title,title_ar,title_en,video_url,video_provider,video_uid,video_ready,video_status,content_md,content_md_ar,content_md_en,is_preview,duration_seconds,display_order,attachments")
          .in("section_id", sList.map((s) => s.id)).order("display_order");
        lList = (lss as Lesson[]) ?? [];
      }
      setLessons(lList);
      setLoadedEdits(
        courseEdits(c as Course, ((links as { category_id: string }[]) ?? []).map((l) => l.category_id), sList, lList),
      );
    }
    const { data: reqs } = await supabase
      .from("lms_enrollment_requests")
      .select("id,user_id,status,payment_method,notes,created_at")
      .eq("course_id", id)
      .order("created_at", { ascending: false });
    setEnrollReqs((reqs as Array<{ id: string; user_id: string; status: string; payment_method: string; notes: string | null; created_at: string }>) ?? []);
    const { data: ens } = await supabase
      .from("lms_enrollments")
      .select("id,student_id,enrolled_at,progress")
      .eq("course_id", id)
      .order("enrolled_at", { ascending: false });
    setEnrolledStudents((ens as Array<{ id: string; student_id: string; enrolled_at: string; progress: number }>) ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const currentEdits = useMemo(
    () => (course ? courseEdits(course, selectedCategoryIds, sections, lessons) : null),
    [course, selectedCategoryIds, sections, lessons],
  );
  const courseDraft = useRecordDraft<CourseEdits>({
    key: formDraftKey(user?.id, "lms-course", id),
    loaded: loadedEdits,
    current: currentEdits,
    apply: (d) => {
      setCourse((prev) => (prev ? { ...prev, ...d.course } : prev));
      setSelectedCategoryIds(d.categoryIds);
      setSections((prev) => prev.map((x) => (d.sections[x.id] ? { ...x, ...d.sections[x.id] } : x)));
      setLessons((prev) => prev.map((l) => (d.lessons[l.id] ? { ...l, ...d.lessons[l.id] } : l)));
    },
  });

  if (!course) return <p className="text-center py-20 text-muted-foreground">{tr.loading}</p>;

  const update = (patch: Partial<Course>) => setCourse({ ...course, ...patch });

  // Delivery mode is the single source of truth for the whole student journey,
  // so it can only be changed through the authorized transactional command,
  // which also creates/restores the AMS link and recalculates progress.
  const persistDeliveryMode = async (mode: "onsite" | "online") => {
    const prev = course.delivery_mode;
    if (prev === mode || switchingMode) return;
    const ok = await confirmDialog({
      title:
        mode === "onsite"
          ? (lang === "ar" ? "التحويل إلى دورة حضورية؟" : "Switch to an onsite course?")
          : (lang === "ar" ? "التحويل إلى دورة أونلاين؟" : "Switch to an online course?"),
      description:
        mode === "onsite"
          ? (lang === "ar"
              ? "سيتم إنشاء/استعادة سجل الحضور المرتبط، ومزامنة الجلسات وجميع الطلاب المسجّلين، وإعادة احتساب التقدّم من الحضور بدل الدروس. تبقى الدروس والاختبارات والمحاولات والشهادات الصادرة كما هي."
              : "The linked attendance course will be created/restored, sessions and all enrolled students synced, and progress recalculated from attendance instead of lessons. Lessons, quizzes, attempts and issued certificates are preserved.")
          : (lang === "ar"
              ? "سيعود التقدّم ليُحتسب من إكمال الدروس، ويصبح مشغّل الدروس والاختبار متاحين للطلاب. تبقى سجلات الحضور محفوظة دون حذف."
              : "Progress will be calculated from lesson completion again, and the online player and quiz become available to students. Attendance records are kept, not deleted."),
      confirmLabel: lang === "ar" ? "تأكيد التحويل" : "Confirm switch",
    });
    if (!ok) return;
    setSwitchingMode(true);
    update({ delivery_mode: mode });
    const { error } = await supabase.rpc("lms_set_delivery_mode" as never, {
      _course_id: course.id,
      _mode: mode,
    } as never);
    setSwitchingMode(false);
    if (error) {
      setCourse({ ...course, delivery_mode: prev });
      const msg = String((error as { message?: string }).message ?? "");
      if (msg.includes("ams_sync_failed")) {
        toast.error(lang === "ar"
          ? "تعذّرت مزامنة الحضور، ولم يتم تغيير نمط التقديم."
          : "Attendance sync failed — delivery mode was not changed.");
      } else if (msg.includes("forbidden")) {
        toast.error(lang === "ar" ? "غير مصرّح لك بتغيير نمط التقديم" : "You are not allowed to change delivery mode");
      } else {
        toast.error(toUserMessage(error));
      }
      return;
    }
    toast.success(lang === "ar" ? "تم تحديث نمط التقديم" : "Delivery mode updated");
    await load();
  };

  const saveCourse = async (opts?: { requireComplete?: boolean }): Promise<boolean> => {
    if (saving) return false;
    // Required bilingual fields. Existing incomplete drafts stay editable, but
    // a field that already had content may never be emptied, and completing all
    // four is mandatory before publishing / submitting for review.
    const requireComplete = opts?.requireComplete || course.status === "published";
    const allErrors = validateCourseI18n(course, lang);
    const errors: CourseFieldErrors = requireComplete
      ? allErrors
      : Object.fromEntries(
          REQUIRED_COURSE_FIELDS.filter((f) => allErrors[f] && originallyFilled.current[f]).map((f) => [f, allErrors[f]!]),
        );
    setFieldErrors(errors);
    const firstBad = firstInvalidCourseField(errors);
    if (firstBad) {
      fieldRefs.current[firstBad]?.focus();
      return false;
    }
    const i18n = trimCourseI18n(course);
    // Validate slug locally
    const slugVal = (course.slug ?? "").trim();
    if (slugVal && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugVal)) {
      toast.error(lang === "ar" ? "الرابط يجب أن يحتوي فقط على أحرف إنجليزية صغيرة وأرقام وشرطات" : "Slug may only contain lowercase letters, digits, and hyphens");
      return false;
    }
    if (slugVal && (slugVal.length < 3 || slugVal.length > 60)) {
      toast.error(lang === "ar" ? "طول الرابط يجب أن يكون بين 3 و 60 حرفاً" : "Slug must be between 3 and 60 characters");
      return false;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      title_ar: i18n.title_ar || course.title_ar,
      title_en: i18n.title_en || course.title_en,
      description_ar: i18n.description_ar || course.description_ar,
      description_en: i18n.description_en || course.description_en,
      level: course.level as "beginner" | "intermediate" | "advanced",
      cover_url: course.cover_url,
      enrollment_open: course.enrollment_open, enrollment_deadline: course.enrollment_deadline, max_students: course.max_students,
      certificate_pdf_enabled: course.certificate_pdf_enabled,
      start_date: course.start_date, end_date: course.end_date,
      schedule_days: course.schedule_days, schedule_time_from: course.schedule_time_from, schedule_time_to: course.schedule_time_to,
      location_ar: course.location_ar, location_en: course.location_en,
      duration_hours: course.duration_hours,
      slug: slugVal || null,
    };
    payload.price = course.is_free ? 0 : course.price;
    payload.sale_price =
      course.is_free || course.sale_price == null || Number(course.sale_price) >= Number(course.price)
        ? null
        : Number(course.sale_price);
    payload.is_free = course.is_free;
    const { error } = await supabase.from("lms_courses").update(payload as never).eq("id", course.id);
    if (error) {
      setSaving(false);
      const msg = toUserMessage(error);
      if (/duplicate|unique|slug/i.test(msg)) {
        toast.error(lang === "ar" ? "هذا الرابط مستخدم من قِبل دورة أخرى" : "This slug is already used by another course");
      } else {
        toast.error(courseI18nWriteErrorMessage(error.message ?? msg, lang) ?? msg);
      }
      return false;
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
        return false;
      }
    }
    setSaving(false);
    setLoadedEdits(currentEdits);
    toast.success(lang === "ar" ? "تم الحفظ" : "Saved");
    return true;
  };


  const submitForReview = async () => {
    if (!isCourseI18nComplete(course)) {
      const errors = validateCourseI18n(course, lang);
      setFieldErrors(errors);
      const firstBad = firstInvalidCourseField(errors);
      fieldRefs.current[firstBad!]?.focus();
      toast.error(lang === "ar"
        ? "يجب إكمال العنوان والوصف بالعربية والإنجليزية قبل الإرسال للمراجعة."
        : "Complete the Arabic and English title and description before submitting for review.");
      return;
    }
    const { error } = await supabase.from("lms_courses").update({ status: "pending" }).eq("id", course.id);
    if (error) {
      const msg = toUserMessage(error);
      toast.error(courseI18nWriteErrorMessage(error.message ?? msg, lang) ?? msg);
      return;
    }
    setCourse({ ...course, status: "pending" });
    toast.success(lang === "ar" ? "تم الإرسال للمراجعة" : "Submitted for review");
  };

  const uploadCover = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast.error(lang === "ar" ? "يجب اختيار صورة" : "Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(lang === "ar" ? "الحد الأقصى 5 ميجابايت" : "Max file size is 5MB");
      return;
    }
    setUploading(true);
    setCoverPct({ pct: 0, loaded: 0, total: file.size, name: file.name });
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const safeName = `cover-${Date.now()}.${ext}`;
      const path = `${user.id}/${course.id}/${safeName}`;
      const { publicUrl } = await uploadToSupabaseStorage({
        bucket: "lms-media",
        path,
        file,
        upsert: true,
        contentType: file.type || undefined,
        onProgress: (pct, loaded, total) => setCoverPct({ pct, loaded, total, name: file.name }),
      });
      const bustedUrl = `${publicUrl}?v=${Date.now()}`;
      const { error: dbErr } = await supabase
        .from("lms_courses")
        .update({ cover_url: bustedUrl })
        .eq("id", course.id);
      if (dbErr) throw dbErr;
      update({ cover_url: bustedUrl });
      toast.success(lang === "ar" ? "تم رفع الغلاف" : "Cover uploaded");
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setUploading(false);
      setCoverPct(null);
    }
  };

  const openAddSection = () => {
    setSectionTitleArDraft("");
    setSectionTitleEnDraft("");
    setSectionDialogOpen(true);
  };

  const confirmAddSection = async () => {
    const title_ar = sectionTitleArDraft.trim();
    const title_en = sectionTitleEnDraft.trim();
    const fallback = title_ar || title_en;
    if (!fallback) {
      toast.error(lang === "ar" ? "أدخل عنوان القسم" : "Enter a section title");
      return;
    }
    const { data, error } = await supabase.from("lms_sections")
      .insert({ course_id: course.id, title: fallback, title_ar: title_ar || null, title_en: title_en || null, display_order: sections.length })
      .select("*").maybeSingle();
    if (error) { toast.error(toUserMessage(error)); return; }
    if (data) setSections([...sections, data as Section]);
    setSectionDialogOpen(false);
  };

  const updateSection = async (sid: string, patch: Partial<Section>) => {
    setSections(sections.map((s) => s.id === sid ? { ...s, ...patch } : s));
    await supabase.from("lms_sections").update(patch).eq("id", sid);
  };

  const doDeleteSection = async (sid: string) => {
    const { error } = await supabase.from("lms_sections").delete().eq("id", sid);
    if (error) { toast.error(toUserMessage(error)); return; }
    setSections(sections.filter((s) => s.id !== sid));
    setLessons(lessons.filter((l) => l.section_id !== sid));
  };

  const openAddLesson = (sid: string) => {
    setLessonDialog({ open: true, sectionId: sid, title_ar: "", title_en: "" });
  };

  const confirmAddLesson = async () => {
    const sid = lessonDialog.sectionId;
    const title_ar = lessonDialog.title_ar.trim();
    const title_en = lessonDialog.title_en.trim();
    const fallback = title_ar || title_en;
    if (!sid || !fallback) {
      toast.error(lang === "ar" ? "أدخل عنوان الدرس" : "Enter a lesson title");
      return;
    }
    const order = lessons.filter((l) => l.section_id === sid).length;
    const { data, error } = await supabase.from("lms_lessons")
      .insert({ section_id: sid, title: fallback, title_ar: title_ar || null, title_en: title_en || null, display_order: order })
      .select("*").maybeSingle();
    if (error) { toast.error(toUserMessage(error)); return; }
    if (data) setLessons([...lessons, data as Lesson]);
    setLessonDialog({ open: false, sectionId: null, title_ar: "", title_en: "" });
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
    try {
      setVideoProgress((p) => ({ ...p, [lesson.id]: { pct: 0, speedMbps: 0, etaSec: 0 } }));
      toast.info(lang === "ar" ? "جاري تجهيز الرفع..." : "Preparing upload...");

      const creds = await createBunnyUpload({
        data: { lessonId: lesson.id, title: lesson.title || file.name },
      });

      const startedAt = Date.now();
      let lastSent = 0;
      let lastAt = startedAt;
      let smoothedSpeed = 0; // bytes/sec

      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: creds.tusEndpoint,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          parallelUploads: 4,
          headers: {
            AuthorizationSignature: creds.authorizationSignature,
            AuthorizationExpire: String(creds.authorizationExpire),
            VideoId: creds.videoId,
            LibraryId: String(creds.libraryId),
          },
          metadata: {
            filetype: file.type || "video/mp4",
            title: lesson.title || file.name,
          },
          onError: (err) => reject(err),
          onProgress: (sent, total) => {
            const now = Date.now();
            const dt = (now - lastAt) / 1000;
            if (dt >= 0.5) {
              const instSpeed = (sent - lastSent) / Math.max(dt, 0.001);
              smoothedSpeed = smoothedSpeed === 0 ? instSpeed : smoothedSpeed * 0.7 + instSpeed * 0.3;
              lastSent = sent;
              lastAt = now;
            }
            const pct = total ? Math.round((sent / total) * 100) : 0;
            const remaining = Math.max(total - sent, 0);
            const etaSec = smoothedSpeed > 0 ? Math.round(remaining / smoothedSpeed) : 0;
            const speedMbps = (smoothedSpeed * 8) / (1024 * 1024);
            setVideoProgress((p) => ({ ...p, [lesson.id]: { pct, speedMbps, etaSec } }));
          },
          onSuccess: () => resolve(),
        });
        upload.start();
      });


      await setLessonBunnyVideo({
        data: { lessonId: lesson.id, videoId: creds.videoId },
      });

      setLessons((curr) =>
        curr.map((x) =>
          x.id === lesson.id
            ? { ...x, video_provider: "bunny", video_uid: creds.videoId, video_ready: false, video_status: "processing", video_url: null }
            : x,
        ),
      );
      setVideoProgress((p) => {
        const { [lesson.id]: _omit, ...rest } = p;
        void _omit;
        return rest;
      });
      toast.success(
        lang === "ar"
          ? "تم رفع الفيديو — جاري المعالجة على Bunny (1-3 دقائق)"
          : "Video uploaded — Bunny is encoding (1-3 minutes)",
      );
    } catch (e) {
      console.error("[bunny upload]", e);
      setVideoProgress((p) => {
        const { [lesson.id]: _omit, ...rest } = p;
        void _omit;
        return rest;
      });
      toast.error(toUserMessage(e));
    }
  };

  const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;
  const uploadAttachments = async (lesson: Lesson, files: FileList | null) => {
    if (!user || !files || files.length === 0) return;
    const current = Array.isArray(lesson.attachments) ? lesson.attachments : [];
    const next = [...current];
    for (const file of Array.from(files)) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        toast.error(`${file.name}: ${lang === "ar" ? "الحجم أكبر من 50 ميجابايت" : "larger than 50MB"}`);
        continue;
      }
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${user.id}/${course.id}/attachments/${lesson.id}/${Date.now()}-${safe}`;
      const key = `${lesson.id}::${path}`;
      setAttachPct((p) => ({ ...p, [key]: { pct: 0, loaded: 0, total: file.size, name: file.name } }));
      try {
        await uploadToSupabaseStorage({
          bucket: "lms-private",
          path,
          file,
          upsert: true,
          contentType: file.type || undefined,
          onProgress: (pct, loaded, total) =>
            setAttachPct((p) => ({ ...p, [key]: { pct, loaded, total, name: file.name } })),
        });
        next.push({ name: file.name, path, url: "" });
      } catch (err) {
        toast.error(`${file.name}: ${toUserMessage(err)}`);
      } finally {
        setAttachPct((p) => {
          const nxt = { ...p };
          delete nxt[key];
          return nxt;
        });
      }
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
      {participants.error && <div role="alert" className="rounded-xl border border-border p-3 text-sm">{lang === "ar" ? "تعذّر تحميل أسماء المشاركين." : "Could not load participant names."} <Button variant="outline" size="sm" onClick={participants.retry}>{lang === "ar" ? "إعادة المحاولة" : "Retry"}</Button></div>}
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
                {lang === "ar"
                  ? (({ draft: "مسودة", pending: "قيد المراجعة", published: "منشورة", rejected: "مرفوضة", archived: "مؤرشفة" } as Record<string, string>)[course.status] ?? course.status)
                  : course.status}
              </span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap">
            {course.status === "published" ? (
              <Button onClick={() => saveCourse()} variant="outline" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mx-1" /> : <Save className="h-4 w-4 mx-1" />}
                {lang === "ar" ? "حفظ" : "Save"}
              </Button>
            ) : course.status === "pending" ? (
              <span className="inline-flex items-center rounded-md border border-amber-400/50 bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 text-xs text-amber-900 dark:text-amber-200">
                {lang === "ar" ? "بانتظار المراجعة" : "Pending review"}
              </span>
            ) : (
              <>
              <Button onClick={() => saveCourse()} variant="outline" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mx-1" /> : <Save className="h-4 w-4 mx-1" />}
                {lang === "ar" ? "حفظ" : "Save"}
              </Button>
              <Button onClick={async () => { if (await saveCourse({ requireComplete: true })) await submitForReview(); }} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mx-1" /> : <Send className="h-4 w-4 mx-1" />}
                {lang === "ar" ? "إرسال للمراجعة" : "Submit for review"}
              </Button>
              </>
            )}
            <Button variant="destructive" onClick={() => setConfirmDeleteCourse(true)} disabled={deletingCourse}>
              <Trash2 className="h-4 w-4 mx-1" />
              {lang === "ar" ? "حذف الدورة" : "Delete course"}
            </Button>
          </div>
        </div>
      </div>

      <DraftNotice show={courseDraft.restored} onDiscard={courseDraft.discard} />

      {/* Details */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h2 className="font-bold text-foreground">{lang === "ar" ? "المعلومات الأساسية" : "Basic info"}</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>{lang === "ar" ? "العنوان (عربي)" : "Title (AR)"}</Label>
            <Input dir="rtl" ref={(el) => { fieldRefs.current.title_ar = el; }} aria-invalid={!!fieldErrors.title_ar}
              value={course.title_ar} onChange={(e) => update({ title_ar: e.target.value })} />
            {fieldErrors.title_ar && <p className="mt-1 text-xs text-destructive">{fieldErrors.title_ar}</p>}</div>
          <div><Label>{lang === "ar" ? "العنوان (إنجليزي)" : "Title (EN)"}</Label>
            <Input dir="ltr" ref={(el) => { fieldRefs.current.title_en = el; }} aria-invalid={!!fieldErrors.title_en}
              value={course.title_en ?? ""} onChange={(e) => update({ title_en: e.target.value })} />
            {fieldErrors.title_en && <p className="mt-1 text-xs text-destructive">{fieldErrors.title_en}</p>}</div>
        </div>
        <div><Label>{lang === "ar" ? "الوصف (عربي)" : "Description (AR)"}</Label>
          <Textarea dir="rtl" rows={3} ref={(el) => { fieldRefs.current.description_ar = el; }} aria-invalid={!!fieldErrors.description_ar}
            value={course.description_ar ?? ""} onChange={(e) => update({ description_ar: e.target.value })} />
          {fieldErrors.description_ar && <p className="mt-1 text-xs text-destructive">{fieldErrors.description_ar}</p>}</div>
        <div><Label>{lang === "ar" ? "الوصف (إنجليزي)" : "Description (EN)"}</Label>
          <Textarea dir="ltr" rows={3} ref={(el) => { fieldRefs.current.description_en = el; }} aria-invalid={!!fieldErrors.description_en}
            value={course.description_en ?? ""} onChange={(e) => update({ description_en: e.target.value })} />
          {fieldErrors.description_en && <p className="mt-1 text-xs text-destructive">{fieldErrors.description_en}</p>}</div>

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

          <div><Label>{lang === "ar" ? "نمط التقديم" : "Delivery mode"}</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
              value={course.delivery_mode ?? "onsite"}
              disabled={switchingMode}
              onChange={(e) => persistDeliveryMode(e.target.value as "onsite" | "online")}>
              <option value="onsite">{tr.deliveryOnsite}</option>
              <option value="online">{tr.deliveryOnline}</option>
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {lang === "ar"
                ? "حضوري: الإكمال بالحضور. أونلاين: فيديو واختبار."
                : "On-site: completes by attendance. Online: video + quiz."}
            </p>
          </div>

          <div><Label>{tr.filterLevel}</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={course.level} onChange={(e) => update({ level: e.target.value })}>
              <option value="beginner">{tr.beginner}</option>
              <option value="intermediate">{tr.intermediate}</option>
              <option value="advanced">{tr.advanced}</option>
            </select>
          </div>
          <div><Label>{lang === "ar" ? "السعر الأساسي" : "Original price"}</Label>
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
          {!course.is_free && (
            <div>
              <Label>
                {lang === "ar" ? "السعر بعد الخصم (اختياري)" : "Discounted price (optional)"}
              </Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={course.sale_price ?? ""}
                placeholder={lang === "ar" ? "بدون خصم" : "No discount"}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  update({ sale_price: v === "" ? null : Math.max(0, parseFloat(v) || 0) });
                }}
                className="h-10"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                {lang === "ar"
                  ? "إذا كان أقل من السعر الأساسي، سيظهر السعر الأساسي مشطوباً بجانب سعر الخصم."
                  : "When lower than the regular price, the regular price is shown struck through next to it."}
              </p>
              <div className="mt-2 text-sm font-semibold text-foreground">
                <span className="text-[11px] font-normal text-muted-foreground mx-1">
                  {lang === "ar" ? "المعاينة:" : "Preview:"}
                </span>
                <CoursePrice
                  price={Number(course.price ?? 0)}
                  salePrice={course.sale_price == null ? null : Number(course.sale_price)}
                  isFree={!!course.is_free}
                  lang={lang}
                  freeLabel={tr.free}
                  size="sm"
                />
              </div>
            </div>
          )}
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
          {coverPct && (
            <div className="mt-2 max-w-sm">
              <UploadProgress percent={coverPct.pct} loaded={coverPct.loaded} total={coverPct.total} label={coverPct.name} />
            </div>
          )}
        </div>

        {(isAdmin || (user && user.id === course.instructor_id)) && (
          <div className="pt-3 border-t border-border">
            <CourseCoInstructors courseId={course.id} ownerId={course.instructor_id} ar={lang === "ar"} />
          </div>
        )}
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

      {/* Admins only while the PDF certificate is being tested; instructors get it once it is signed off. */}
      {isAdmin && <CertificateSettings
        courseId={course.id}
        lang={lang}
        enabled={course.certificate_pdf_enabled}
        datesReady={Boolean(course.start_date && course.end_date)}
        onToggle={(v) => update({ certificate_pdf_enabled: v })}
      />}

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
                  <div className="text-sm font-medium text-foreground truncate max-w-[260px]">{participantName(r.user_id)}</div>
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

      {/* Approved / enrolled students */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-foreground">{lang === "ar" ? "الطلاب المسجلون" : "Enrolled students"}</h2>
          <span className="text-xs text-muted-foreground">
            {lang === "ar" ? `العدد: ${enrolledStudents.length}` : `Count: ${enrolledStudents.length}`}
          </span>
        </div>
        {enrolledStudents.length === 0 ? (
          <p className="text-sm text-muted-foreground">{lang === "ar" ? "لا يوجد طلاب مسجلون بعد." : "No enrolled students yet."}</p>
        ) : (
          <>
            <ul className="divide-y divide-border">
              {enrolledStudents.slice(0, 5).map((s) => (
                <li key={s.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate max-w-[260px]">{participantName(s.student_id)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(s.enrolled_at).toLocaleDateString(lang === "ar" ? "ar" : "en")}
                      <span className="inline-block rounded-full px-2 py-0.5 ms-2 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                        {Math.round(Number(s.progress))}%
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {enrolledStudents.length > 5 && (
              <div className="flex justify-center pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowAllStudents(true)}>
                  {lang === "ar" ? `عرض الكل (${enrolledStudents.length})` : `Show all (${enrolledStudents.length})`}
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* All students dialog */}
      <Dialog open={showAllStudents} onOpenChange={setShowAllStudents}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{lang === "ar" ? "الطلاب المسجلون" : "Enrolled students"}</DialogTitle>
          </DialogHeader>
          <ul className="divide-y divide-border">
            {enrolledStudents.map((s) => (
              <li key={s.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate max-w-[320px]">{participantName(s.student_id)}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(s.enrolled_at).toLocaleDateString(lang === "ar" ? "ar" : "en")}
                    <span className="inline-block rounded-full px-2 py-0.5 ms-2 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                      {Math.round(Number(s.progress))}%
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

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
                <div className="flex flex-1 gap-2">
                  <Input dir="rtl" placeholder="عربي" value={s.title_ar ?? ""}
                    onChange={(e) => setSections(sections.map((x) => x.id === s.id ? { ...x, title_ar: e.target.value } : x))}
                    onBlur={() => updateSection(s.id, { title_ar: s.title_ar, title: s.title_ar || s.title_en || s.title })} className="flex-1 h-8" />
                  <Input dir="ltr" placeholder="English" value={s.title_en ?? ""}
                    onChange={(e) => setSections(sections.map((x) => x.id === s.id ? { ...x, title_en: e.target.value } : x))}
                    onBlur={() => updateSection(s.id, { title_en: s.title_en, title: s.title_ar || s.title_en || s.title })} className="flex-1 h-8" />
                </div>
                <div className="flex gap-1">
                  {course.delivery_mode !== "onsite" && (
                    <Button size="sm" variant="ghost" onClick={() => openAddLesson(s.id)}><Plus className="h-4 w-4" /></Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete({ type: "section", id: s.id })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
              <ul className="divide-y divide-border">
                {lessons.filter((l) => l.section_id === s.id).map((l) => (
                  <li key={l.id} className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-1 gap-2">
                        <Input dir="rtl" placeholder="عنوان (عربي)" value={l.title_ar ?? ""}
                          onChange={(e) => setLessons(lessons.map((x) => x.id === l.id ? { ...x, title_ar: e.target.value } : x))}
                          onBlur={() => updateLesson(l.id, { title_ar: l.title_ar, title: l.title_ar || l.title_en || l.title })} className="flex-1" />
                        <Input dir="ltr" placeholder="Title (English)" value={l.title_en ?? ""}
                          onChange={(e) => setLessons(lessons.map((x) => x.id === l.id ? { ...x, title_en: e.target.value } : x))}
                          onBlur={() => updateLesson(l.id, { title_en: l.title_en, title: l.title_ar || l.title_en || l.title })} className="flex-1" />
                      </div>
                      <label className="text-xs flex items-center gap-1">
                        <input type="checkbox" checked={l.is_preview} onChange={(e) => updateLesson(l.id, { is_preview: e.target.checked })} />
                        {lang === "ar" ? "معاينة" : "Preview"}
                      </label>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDelete({ type: "lesson", id: l.id })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                    {course.delivery_mode !== "onsite" && (
                      <>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <label className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-input bg-background cursor-pointer hover:bg-muted">
                          <span>{lang === "ar" ? "اختر فيديو" : "Choose video"}</span>
                          <input type="file" accept="video/*" className="hidden"
                            disabled={videoProgress[l.id] !== undefined}
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadVideo(l, f); }} />
                        </label>
                        {videoProgress[l.id] === undefined && l.video_provider === "bunny" && l.video_uid && l.video_status === "ready" && (
                          <span className="text-emerald-600">
                            ✓ {lang === "ar" ? "الفيديو جاهز" : "Video ready"}
                          </span>
                        )}
                        {videoProgress[l.id] === undefined && l.video_provider === "bunny" && l.video_uid && (l.video_status === "processing" || l.video_status === "uploading") && (
                          <>
                            <span className="text-amber-600">
                              ⏳ {lang === "ar" ? "قيد المعالجة على Bunny" : "Processing on Bunny"}
                            </span>
                            <button
                              type="button"
                              className="text-primary underline"
                              onClick={async () => {
                                try {
                                  const r = await refreshBunnyLessonStatus({ data: { lessonId: l.id } });
                                  setLessons((curr) => curr.map((x) => x.id === l.id ? { ...x, video_status: r.status, video_ready: r.status === "ready" } : x));
                                  toast.success(lang === "ar" ? `الحالة: ${r.status}` : `Status: ${r.status}`);
                                } catch (e) { toast.error(toUserMessage(e)); }
                              }}
                            >
                              {lang === "ar" ? "تحديث الحالة" : "Refresh status"}
                            </button>
                          </>
                        )}
                        {videoProgress[l.id] === undefined && l.video_provider === "bunny" && l.video_uid && l.video_status === "failed" && (
                          <>
                            <span className="text-destructive">
                              ✗ {lang === "ar" ? "فشلت المعالجة" : "Processing failed"}
                            </span>
                            <button
                              type="button"
                              className="text-primary underline"
                              onClick={async () => {
                                try {
                                  const r = await refreshBunnyLessonStatus({ data: { lessonId: l.id } });
                                  setLessons((curr) => curr.map((x) => x.id === l.id ? { ...x, video_status: r.status, video_ready: r.status === "ready" } : x));
                                } catch (e) { toast.error(toUserMessage(e)); }
                              }}
                            >
                              {lang === "ar" ? "إعادة الفحص" : "Recheck"}
                            </button>
                          </>
                        )}
                        {videoProgress[l.id] === undefined && l.video_provider !== "bunny" && l.video_url && (
                          <span className="text-amber-600">
                            ⚠ {lang === "ar" ? "فيديو قديم — أعد رفعه للحصول على بث سريع" : "Legacy video — re-upload for fast streaming"}
                          </span>
                        )}
                      </div>
                      {videoProgress[l.id] !== undefined && (
                        <div className="max-w-md">
                          <UploadProgress
                            percent={videoProgress[l.id].pct}
                            label={
                              (lang === "ar" ? "رفع الفيديو" : "Video upload") +
                              (videoProgress[l.id].speedMbps > 0
                                ? ` · ${videoProgress[l.id].speedMbps.toFixed(1)} Mbps`
                                : "") +
                              (videoProgress[l.id].etaSec > 0
                                ? ` · ${lang === "ar" ? "متبقي" : "ETA"} ${videoProgress[l.id].etaSec >= 60 ? `${Math.ceil(videoProgress[l.id].etaSec / 60)} ${lang === "ar" ? "د" : "min"}` : `${videoProgress[l.id].etaSec} ${lang === "ar" ? "ث" : "s"}`}`
                                : "")
                            }
                          />
                        </div>
                      )}
                    </div>
                    <Textarea dir="rtl" rows={2} placeholder="محتوى الدرس بالعربية (Markdown)"
                      value={l.content_md_ar ?? ""}
                      onChange={(e) => setLessons(lessons.map((x) => x.id === l.id ? { ...x, content_md_ar: e.target.value } : x))}
                      onBlur={() => updateLesson(l.id, { content_md_ar: l.content_md_ar, content_md: l.content_md_ar || l.content_md_en || l.content_md })} />
                    <Textarea dir="ltr" rows={2} placeholder="Lesson content in English (Markdown)"
                      value={l.content_md_en ?? ""}
                      onChange={(e) => setLessons(lessons.map((x) => x.id === l.id ? { ...x, content_md_en: e.target.value } : x))}
                      onBlur={() => updateLesson(l.id, { content_md_en: l.content_md_en, content_md: l.content_md_ar || l.content_md_en || l.content_md })} />
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs">
                        <label className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-input bg-background cursor-pointer hover:bg-muted">
                          <Plus className="h-3.5 w-3.5" />
                          <span>{lang === "ar" ? "أضف مرفقات" : "Add attachments"}</span>
                          <input type="file" multiple className="hidden" onChange={(e) => { uploadAttachments(l, e.target.files); e.target.value = ""; }} />
                        </label>
                        <span className="text-muted-foreground">{lang === "ar" ? "PDF / صور / مستندات — حتى 50 ميجابايت لكل ملف" : "PDF / images / docs — up to 50MB each"}</span>
                      </div>
                      {Object.entries(attachPct)
                        .filter(([k]) => k.startsWith(`${l.id}::`))
                        .map(([k, p]) => (
                          <UploadProgress key={k} percent={p.pct} loaded={p.loaded} total={p.total} label={p.name} compact />
                        ))}
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
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link to="/learning-management-system/instructor/assignments/$courseId" params={{ courseId: course.id }}>
          <Button variant="outline">
            <ClipboardList className="h-4 w-4 mx-1" />
            {lang === "ar" ? "إدارة الوظائف" : "Manage Assignments"}
          </Button>
        </Link>
        <Link to="/learning-management-system/instructor/quiz-results/$courseId" params={{ courseId: course.id }}>
          <Button variant="outline">
            <FileText className="h-4 w-4 mx-1" />
            {lang === "ar" ? "نتائج الاختبارات" : "Quiz results"}
          </Button>
        </Link>
        {course.delivery_mode === "onsite" && (
          <AttendanceLink courseId={course.id} lang={lang} isAdmin={isAdmin} />
        )}
      </div>

      {course.delivery_mode === "onsite" && (
        <AttendanceSummary courseId={course.id} lang={lang} />
      )}


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
          <div className="space-y-2">
            <Label>{lang === "ar" ? "العنوان (عربي)" : "Title (Arabic)"}</Label>
            <Input
              autoFocus
              dir="rtl"
              value={sectionTitleArDraft}
              onChange={(e) => setSectionTitleArDraft(e.target.value)}
              placeholder="مثال: مقدمة"
            />
            <Label>{lang === "ar" ? "العنوان (إنكليزي)" : "Title (English)"}</Label>
            <Input
              dir="ltr"
              value={sectionTitleEnDraft}
              onChange={(e) => setSectionTitleEnDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmAddSection(); } }}
              placeholder="e.g. Introduction"
            />
          </div>
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
              {lang === "ar" ? "أدخل عنوان الدرس بالعربية والإنكليزية." : "Enter the lesson title in Arabic and English."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{lang === "ar" ? "العنوان (عربي)" : "Title (Arabic)"}</Label>
            <Input
              autoFocus
              dir="rtl"
              value={lessonDialog.title_ar}
              onChange={(e) => setLessonDialog((s) => ({ ...s, title_ar: e.target.value }))}
              placeholder="مثال: الدرس الأول"
            />
            <Label>{lang === "ar" ? "العنوان (إنكليزي)" : "Title (English)"}</Label>
            <Input
              dir="ltr"
              value={lessonDialog.title_en}
              onChange={(e) => setLessonDialog((s) => ({ ...s, title_en: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmAddLesson(); } }}
              placeholder="e.g. Lesson 1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLessonDialog({ open: false, sectionId: null, title_ar: "", title_en: "" })}>
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
                ? "سيتم حذف كل الأقسام، الدروس، الاختبارات، الواجبات، التقييمات، الشهادات، التسجيلات والطلبات. كما سيتم حذف دورة الحضور المرتبطة نهائيًا بما فيها الجلسات والمسجَّلين وسجلات الحضور. لا يمكن التراجع."
                : "All sections, lessons, quizzes, assignments, reviews, certificates, enrollments and requests will be permanently removed. The linked attendance course — including its sessions, registrants and attendance records — will also be permanently deleted. This cannot be undone."}
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

/* The PDF certificate for this course: preview it, then switch it on for students. */
function CertificateSettings({
  courseId, lang, enabled, datesReady, onToggle,
}: { courseId: string; lang: "ar" | "en"; enabled: boolean; datesReady: boolean; onToggle: (v: boolean) => void }) {
  const ar = lang === "ar";
  const preview = useServerFn(previewCourseCertificate);
  const [busy, setBusy] = useState<"male" | "female" | null>(null);

  const download = async (gender: "male" | "female") => {
    setBusy(gender);
    /* Browsers (Safari above all) only let a page open a tab during the click
       itself, and the PDF takes seconds; so the tab opens now, waiting, and
       gets the PDF when it is ready. If no tab could open, it downloads. */
    const tab = window.open("", "_blank");
    tab?.document.write(
      `<p style="font-family:sans-serif;padding:24px">${ar ? "جارٍ تجهيز نموذج الشهادة…" : "Preparing the certificate preview…"}</p>`,
    );
    const fail = (message: string) => {
      tab?.close();
      toast.error(message, { duration: 20_000 });
    };
    try {
      const res = await preview({ data: { courseId, gender } });
      if (res.status === "course_dates_missing") {
        fail(ar ? "أضف تاريخ بداية الدورة ونهايتها أولاً." : "Add the course start and end dates first.");
        return;
      }
      if (res.status === "error") {
        fail(`${ar ? "تعذّر إنشاء الشهادة" : "Certificate failed"}: ${res.message}`);
        return;
      }
      const bytes = Uint8Array.from(atob(res.base64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      if (tab && !tab.closed) {
        tab.location.href = url;
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = `certificate-preview-${gender}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000);
    } catch (e) {
      fail(toUserMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <h2 className="font-bold text-foreground">{ar ? "الشهادة (PDF)" : "Certificate (PDF)"}</h2>
      <p className="text-sm text-muted-foreground">
        {ar
          ? "جرّب نموذج الشهادة لهذه الدورة، ثم فعّلها ليحمّل الطلاب شهاداتهم بصيغة PDF وتصلهم مرفقة بالبريد. ما دامت غير مفعّلة لا يرى الطلاب شيئاً جديداً."
          : "Preview this course's certificate, then turn it on so students can download it as a PDF and get it attached to their email. While it is off, students see nothing new."}
      </p>
      {!datesReady && (
        <p className="text-sm text-destructive">
          {ar ? "الشهادة تحتاج تاريخ بداية الدورة ونهايتها." : "The certificate needs the course start and end dates."}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={!datesReady || busy !== null} onClick={() => download("male")}>
          {busy === "male" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {ar ? "نموذج (طالب)" : "Preview (male)"}
        </Button>
        <Button type="button" variant="outline" disabled={!datesReady || busy !== null} onClick={() => download("female")}>
          {busy === "female" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {ar ? "نموذج (طالبة)" : "Preview (female)"}
        </Button>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label className="cursor-pointer" htmlFor="cert-pdf-enabled">{ar ? "تفعيل الشهادة للطلاب" : "Certificate on for students"}</Label>
          <p className="text-xs text-muted-foreground">{ar ? "اضغط حفظ بالأعلى لتطبيق التغيير." : "Click Save above to apply."}</p>
        </div>
        <input
          id="cert-pdf-enabled"
          type="checkbox"
          className="h-5 w-5"
          checked={enabled}
          disabled={!datesReady && !enabled}
          onChange={(e) => onToggle(e.target.checked)}
        />
      </div>
    </section>
  );
}

function AttendanceLink({ courseId, lang, isAdmin }: { courseId: string; lang: "ar" | "en"; isAdmin: boolean }) {
  const [amsId, setAmsId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("ams_courses")
        .select("id")
        .eq("lms_course_id", courseId)
        .maybeSingle();
      if (active) {
        setAmsId((data as { id: string } | null)?.id ?? null);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [courseId]);




  const handleUnlink = async () => {
    if (!amsId) return;
    if (!(await confirmDialog({ title: lang === "ar"
      ? "إلغاء ربط نظام الحضور؟ سيُحذف الطلاب المتزامنون."
      : "Unlink attendance? Synced students will be removed.", destructive: true }))) return;
    setBusy(true);
    const { error } = await supabase.rpc("unlink_lms_course_from_ams", { _ams_course_id: amsId });
    setBusy(false);
    if (error) { toast.error(toUserMessage(error)); return; }
    setAmsId(null);
    toast.success(lang === "ar" ? "تم إلغاء الربط" : "Unlinked");
  };

  if (loading) return null;

  if (!amsId) {
    return (
      <span className="text-xs text-muted-foreground self-center px-2">
        {lang === "ar"
          ? "سيُفعَّل نظام الحضور تلقائياً عند نشر الدورة."
          : "Attendance activates automatically once the course is published."}
      </span>
    );
  }


  return (
    <div className="flex items-center gap-2">
      <Link to="/attendance-management-system" search={{ course: amsId }}>
        <Button variant="outline">
          <ClipboardList className="h-4 w-4 mx-1" />
          {lang === "ar" ? "الحضور والجلسات" : "Attendance & Sessions"}
        </Button>
      </Link>
      {isAdmin && (
        <Button variant="ghost" size="sm" onClick={handleUnlink} disabled={busy}>
          {lang === "ar" ? "إلغاء الربط" : "Unlink"}
        </Button>
      )}
    </div>
  );
}

function AttendanceSummary({ courseId, lang }: { courseId: string; lang: "ar" | "en" }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Array<{ name: string; attended: number; total: number }>>([]);
  const [totalSessions, setTotalSessions] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data: ams } = await supabase.from("ams_courses").select("id").eq("lms_course_id", courseId).maybeSingle();
      const amsId = (ams as { id: string } | null)?.id;
      if (!amsId) { if (active) { setRows([]); setTotalSessions(0); setLoading(false); } return; }

      const { data: sessions } = await supabase.from("ams_sessions").select("id").eq("course_id", amsId);
      const sessionIds = (sessions as Array<{ id: string }> | null)?.map((s) => s.id) ?? [];
      const total = sessionIds.length;

      const { data: regs } = await supabase.from("ams_registrants")
        .select("id,full_name").eq("course_id", amsId).order("full_name");
      const regList = (regs as Array<{ id: string; full_name: string }> | null) ?? [];

      let att: Array<{ registrant_id: string; present: boolean }> = [];
      if (sessionIds.length && regList.length) {
        const { data } = await supabase.from("ams_attendance")
          .select("registrant_id,present").in("session_id", sessionIds);
        att = (data as Array<{ registrant_id: string; present: boolean }> | null) ?? [];
      }
      const counts = new Map<string, number>();
      for (const a of att) if (a.present) counts.set(a.registrant_id, (counts.get(a.registrant_id) ?? 0) + 1);

      if (active) {
        setTotalSessions(total);
        setRows(regList.map((r) => ({ name: r.full_name, attended: counts.get(r.id) ?? 0, total })));
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [courseId]);

  if (loading) return null;
  if (rows.length === 0) {
    return (
      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h3 className="font-bold text-foreground">{lang === "ar" ? "ملخص الحضور" : "Attendance summary"}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {lang === "ar" ? "لا يوجد مسجّلون بعد." : "No registrants yet."}
        </p>
      </section>
    );
  }

  const overall = rows.reduce((s, r) => s + r.attended, 0);
  const overallTotal = rows.length * totalSessions;
  const overallPct = overallTotal === 0 ? 0 : Math.round((overall / overallTotal) * 100);

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-foreground">{lang === "ar" ? "ملخص الحضور" : "Attendance summary"}</h3>
        <div className="text-xs text-muted-foreground">
          {lang === "ar"
            ? `${rows.length} طالب · ${totalSessions} جلسة · متوسط الحضور ${overallPct}%`
            : `${rows.length} students · ${totalSessions} sessions · avg ${overallPct}%`}
        </div>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-start">{lang === "ar" ? "الطالب" : "Student"}</th>
              <th className="px-3 py-2 text-center">{lang === "ar" ? "الحضور" : "Attended"}</th>
              <th className="px-3 py-2 text-center">%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const pct = r.total === 0 ? 0 : Math.round((r.attended / r.total) * 100);
              return (
                <tr key={i} className="border-t border-border">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2 text-center font-mono">{r.attended} / {r.total}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${pct >= 100 ? "bg-emerald-500/15 text-emerald-600" : pct >= 50 ? "bg-amber-500/15 text-amber-600" : "bg-destructive/15 text-destructive"}`}>
                      {pct}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
