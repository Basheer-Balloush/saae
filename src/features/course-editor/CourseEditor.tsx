import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertCircle,
  Award,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  MonitorPlay,
  Send,
  Undo2,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useRecordDraft } from "@/hooks/useFormDraft";
import { formDraftKey } from "@/lib/form-draft";
import { toUserMessage } from "@/lib/safe-error";
import { confirmDialog } from "@/hooks/useConfirm";
import {
  REQUIRED_COURSE_FIELDS,
  courseI18nWriteErrorMessage,
  firstInvalidCourseField,
  isCourseI18nComplete,
  trimCourseI18n,
  validateCourseI18n,
  type CourseFieldErrors,
  type CourseI18nInput,
  type RequiredCourseField,
} from "@/lib/lms-course-fields";
import { DraftNotice } from "@/components/admin/DraftNotice";
import { Button } from "@/components/ui/button";
import { CONSOLE_COUNTS_KEY } from "@/components/console/useConsoleCounts";
import {
  CourseStatusPill,
  ErrorNote,
  Loading,
  PageHeader,
  Pill,
  ReasonDialog,
  SaveBar,
  Tabs,
  fmtNum,
  useT,
} from "@/components/console/ui";
import { useLmsAdminActions } from "@/features/lms-console/actions";
import { DetailsTab } from "./DetailsTab";
import { ScheduleTab } from "./ScheduleTab";
import { ContentTab } from "./ContentTab";
import { StudentsTab } from "./StudentsTab";
import { AttendanceTab } from "./AttendanceTab";
import { CompletionTab } from "./CompletionTab";
import { GradingTab } from "./GradingTab";
import {
  courseEdits,
  type Category,
  type Course,
  type CourseEdits,
  type EditorCtx,
  type EditorTab,
  type Lesson,
  type Section,
} from "./types";

type CheckItem = { key: string; ok: boolean; label: string; tab: EditorTab; required?: boolean };

/* One course editor for admins and instructors. Six tabs instead of one long
   page; one save bar for the course fields; content, attendance and
   decisions save the moment they happen. */
export function CourseEditor({
  courseId,
  context,
  tab,
  onTabChange,
}: {
  courseId: string;
  context: "admin" | "instructor";
  tab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
}) {
  const { t, ar, lang } = useT();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, role } = useLmsAuth();
  const isAdmin = role === "admin";
  const actions = useLmsAdminActions(lang);

  const [course, setCourse] = useState<Course | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [saving, setSaving] = useState(false);
  const [switchingMode, setSwitchingMode] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<CourseFieldErrors>({});
  const [loadedEdits, setLoadedEdits] = useState<CourseEdits | null>(null);
  // Which required fields already had content when the course loaded.
  // Existing incomplete drafts stay editable, but a filled field can never be emptied.
  const originallyFilled = useRef<Partial<Record<RequiredCourseField, boolean>>>({});
  const fieldRefs = useRef<
    Partial<Record<RequiredCourseField, HTMLInputElement | HTMLTextAreaElement | null>>
  >({});

  const base =
    context === "admin"
      ? "/learning-management-system/admin"
      : "/learning-management-system/instructor";

  const load = useCallback(async () => {
    // No draft saving while a fresh copy arrives piece by piece.
    setLoadedEdits(null);
    const [{ data: c, error }, { data: cats }, { data: links }, { count: pending }] =
      await Promise.all([
        supabase.from("lms_courses").select("*").eq("id", courseId).maybeSingle(),
        supabase.from("lms_categories").select("id,name_ar,name_en").order("display_order"),
        supabase.from("lms_course_categories").select("category_id").eq("course_id", courseId),
        supabase
          .from("lms_enrollment_requests")
          .select("id", { count: "exact", head: true })
          .eq("course_id", courseId)
          .eq("status", "pending"),
      ]);
    if (error || !c) {
      setLoadError(true);
      return;
    }
    setLoadError(false);
    const trimmed = trimCourseI18n(c as CourseI18nInput);
    originallyFilled.current = Object.fromEntries(
      REQUIRED_COURSE_FIELDS.map((f) => [f, trimmed[f].length > 0]),
    );
    const catIds = ((links as { category_id: string }[]) ?? []).map((l) => l.category_id);
    setCourse(c as Course);
    setCategories((cats as Category[]) ?? []);
    setSelectedCategoryIds(catIds);
    setPendingRequests(pending ?? 0);
    const { data: secs } = await supabase
      .from("lms_sections")
      .select("id,title,title_ar,title_en,display_order")
      .eq("course_id", courseId)
      .order("display_order");
    const sList = (secs as Section[]) ?? [];
    let lList: Lesson[] = [];
    if (sList.length) {
      const { data: lss } = await supabase
        .from("lms_lessons")
        .select(
          "id,section_id,title,title_ar,title_en,video_url,video_provider,video_uid,video_ready,video_status,content_md,content_md_ar,content_md_en,is_preview,duration_seconds,display_order,attachments",
        )
        .in(
          "section_id",
          sList.map((s) => s.id),
        )
        .order("display_order");
      lList = (lss as Lesson[]) ?? [];
    }
    setSections(sList);
    setLessons(lList);
    setLoadedEdits(courseEdits(c as Course, catIds, sList, lList));
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  const currentEdits = useMemo(
    () => (course ? courseEdits(course, selectedCategoryIds, sections, lessons) : null),
    [course, selectedCategoryIds, sections, lessons],
  );
  const courseDraft = useRecordDraft<CourseEdits>({
    key: formDraftKey(user?.id, "lms-course", courseId),
    loaded: loadedEdits,
    current: currentEdits,
    apply: (d) => {
      setCourse((prev) => (prev ? { ...prev, ...d.course } : prev));
      setSelectedCategoryIds(d.categoryIds);
      setSections((prev) =>
        prev.map((x) => (d.sections[x.id] ? { ...x, ...d.sections[x.id] } : x)),
      );
      setLessons((prev) => prev.map((l) => (d.lessons[l.id] ? { ...l, ...d.lessons[l.id] } : l)));
    },
  });

  // Unsaved = the course fields or categories differ from what was loaded or last saved.
  const dirty = useMemo(() => {
    if (!currentEdits || !loadedEdits) return false;
    return (
      JSON.stringify(currentEdits.course) !== JSON.stringify(loadedEdits.course) ||
      JSON.stringify(currentEdits.categoryIds) !== JSON.stringify(loadedEdits.categoryIds)
    );
  }, [currentEdits, loadedEdits]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const update = (patch: Partial<Course>) => setCourse((c) => (c ? { ...c, ...patch } : c));
  const commit = (patch: Partial<Course>) => {
    update(patch);
    setLoadedEdits((le) => (le ? { ...le, course: { ...le.course, ...patch } } : le));
  };

  if (loadError) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <ErrorNote
          text={t(
            "تعذّر فتح هذه الدورة. ربما حُذفت أو ليست لديك صلاحية عليها.",
            "This course could not be opened. It may be deleted, or you may not have access to it.",
          )}
          onRetry={load}
        />
      </div>
    );
  }
  if (!course) return <Loading />;

  const isOwner = !!user && user.id === course.instructor_id;
  const canManage = isAdmin || isOwner;
  const onsite = course.delivery_mode === "onsite";
  const title = ar ? course.title_ar || course.title_en || "" : course.title_en || course.title_ar;
  // Instructors cannot save while an admin is reviewing the course.
  const locked = !isAdmin && course.status === "pending";

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
          REQUIRED_COURSE_FIELDS.filter((f) => allErrors[f] && originallyFilled.current[f]).map(
            (f) => [f, allErrors[f]!],
          ),
        );
    setFieldErrors(errors);
    const firstBad = firstInvalidCourseField(errors);
    if (firstBad) {
      onTabChange("details");
      setTimeout(() => fieldRefs.current[firstBad]?.focus(), 50);
      toast.error(
        t(
          "أكمل الاسم والوصف باللغتين أولاً.",
          "Complete the name and description in both languages first.",
        ),
      );
      return false;
    }
    const slug = (course.slug ?? "").trim();
    if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      toast.error(
        t(
          "الرابط يجب أن يحتوي فقط على أحرف إنجليزية صغيرة وأرقام وشرطات",
          "Slug may only contain lowercase letters, digits, and hyphens",
        ),
      );
      return false;
    }
    if (slug && (slug.length < 3 || slug.length > 60)) {
      toast.error(
        t("طول الرابط يجب أن يكون بين 3 و 60 حرفاً", "Slug must be between 3 and 60 characters"),
      );
      return false;
    }
    setSaving(true);
    const i18n = trimCourseI18n(course);
    const payload: Record<string, unknown> = {
      title_ar: i18n.title_ar || course.title_ar,
      title_en: i18n.title_en || course.title_en,
      description_ar: i18n.description_ar || course.description_ar,
      description_en: i18n.description_en || course.description_en,
      level: course.level as "beginner" | "intermediate" | "advanced",
      cover_url: course.cover_url,
      enrollment_open: course.enrollment_open,
      enrollment_deadline: course.enrollment_deadline,
      max_students: course.max_students,
      certificate_pdf_enabled: course.certificate_pdf_enabled,
      start_date: course.start_date,
      end_date: course.end_date,
      schedule_days: course.schedule_days,
      schedule_time_from: course.schedule_time_from,
      schedule_time_to: course.schedule_time_to,
      location_ar: course.location_ar,
      location_en: course.location_en,
      duration_hours: course.duration_hours,
      slug: slug || null,
      price: course.is_free ? 0 : course.price,
      sale_price:
        course.is_free ||
        course.sale_price == null ||
        Number(course.sale_price) >= Number(course.price)
          ? null
          : Number(course.sale_price),
      is_free: course.is_free,
    };
    const { error } = await supabase
      .from("lms_courses")
      .update(payload as never)
      .eq("id", course.id);
    if (error) {
      setSaving(false);
      const msg = toUserMessage(error);
      if (/duplicate|unique|slug/i.test(msg))
        toast.error(
          t("هذا الرابط مستخدم من قِبل دورة أخرى", "This slug is already used by another course"),
        );
      else toast.error(courseI18nWriteErrorMessage(error.message ?? msg, lang) ?? msg);
      return false;
    }
    // Sync many-to-many categories
    const { data: existing } = await supabase
      .from("lms_course_categories")
      .select("category_id")
      .eq("course_id", course.id);
    const existingIds = new Set(
      ((existing as { category_id: string }[]) ?? []).map((r) => r.category_id),
    );
    const selected = new Set(selectedCategoryIds);
    const toAdd = selectedCategoryIds.filter((cid) => !existingIds.has(cid));
    const toRemove = [...existingIds].filter((cid) => !selected.has(cid));
    if (toRemove.length)
      await supabase
        .from("lms_course_categories")
        .delete()
        .eq("course_id", course.id)
        .in("category_id", toRemove);
    if (toAdd.length) {
      const { error: insErr } = await supabase
        .from("lms_course_categories")
        .insert(toAdd.map((cid) => ({ course_id: course.id, category_id: cid })));
      if (insErr) {
        setSaving(false);
        toast.error(toUserMessage(insErr));
        return false;
      }
    }
    setSaving(false);
    setLoadedEdits(currentEdits);
    courseDraft.clear();
    toast.success(t("تم الحفظ", "Saved"));
    return true;
  };

  const discard = () => {
    if (!loadedEdits) return;
    setCourse((c) => (c ? { ...c, ...loadedEdits.course } : c));
    setSelectedCategoryIds(loadedEdits.categoryIds);
    setFieldErrors({});
    courseDraft.clear();
  };

  // Delivery mode is the single source of truth for the whole student journey,
  // so it can only be changed through the authorized transactional command,
  // which also creates/restores the AMS link and recalculates progress.
  const persistDeliveryMode = async (mode: "onsite" | "online") => {
    const prev = course.delivery_mode;
    if (prev === mode || switchingMode) return;
    const ok = await confirmDialog({
      title:
        mode === "onsite"
          ? t("التحويل إلى دورة حضورية؟", "Switch to an in-person course?")
          : t("التحويل إلى دورة أونلاين؟", "Switch to an online course?"),
      description:
        mode === "onsite"
          ? t(
              "سيتم إنشاء/استعادة سجل الحضور المرتبط، ومزامنة الجلسات وجميع الطلاب المسجّلين، وإعادة احتساب التقدّم من الحضور بدل الدروس. تبقى الدروس والاختبارات والمحاولات والشهادات الصادرة كما هي.",
              "The linked attendance course will be created/restored, sessions and all enrolled students synced, and progress recalculated from attendance instead of lessons. Lessons, quizzes, attempts and issued certificates are preserved.",
            )
          : t(
              "سيعود التقدّم ليُحتسب من إكمال الدروس، ويصبح مشغّل الدروس والاختبار متاحين للطلاب. تبقى سجلات الحضور محفوظة دون حذف.",
              "Progress will be calculated from lesson completion again, and the online player and quiz become available to students. Attendance records are kept, not deleted.",
            ),
      confirmLabel: t("تأكيد التحويل", "Confirm switch"),
    });
    if (!ok) return;
    setSwitchingMode(true);
    commit({ delivery_mode: mode });
    const { error } = await supabase.rpc(
      "lms_set_delivery_mode" as never,
      { _course_id: course.id, _mode: mode } as never,
    );
    setSwitchingMode(false);
    if (error) {
      commit({ delivery_mode: prev });
      const msg = String((error as { message?: string }).message ?? "");
      if (msg.includes("ams_sync_failed"))
        toast.error(
          t(
            "تعذّرت مزامنة الحضور، ولم يتم تغيير نمط التقديم.",
            "Attendance sync failed — delivery mode was not changed.",
          ),
        );
      else if (msg.includes("forbidden"))
        toast.error(
          t("غير مصرّح لك بتغيير نمط التقديم", "You are not allowed to change delivery mode"),
        );
      else toast.error(toUserMessage(error));
      return;
    }
    toast.success(t("تم تحديث نمط التقديم", "Delivery mode updated"));
  };

  const submitForReview = async () => {
    if (dirty || !isCourseI18nComplete(course)) {
      if (!(await saveCourse({ requireComplete: true }))) return;
    }
    setStatusBusy(true);
    const { error } = await supabase
      .from("lms_courses")
      .update({ status: "pending" })
      .eq("id", course.id);
    setStatusBusy(false);
    if (error) {
      const msg = toUserMessage(error);
      toast.error(courseI18nWriteErrorMessage(error.message ?? msg, lang) ?? msg);
      return;
    }
    commit({ status: "pending" });
    toast.success(t("تم الإرسال للمراجعة", "Submitted for review"));
  };

  const adminSetStatus = async (status: "published" | "draft" | "rejected", reason?: string) => {
    if (status === "published" && (dirty || !isCourseI18nComplete(course))) {
      if (!(await saveCourse({ requireComplete: true }))) return;
    }
    if (
      status === "draft" &&
      !(await confirmDialog({
        title: t("إلغاء نشر الدورة؟", "Unpublish this course?"),
        description: t(
          "تختفي من الكتالوج، ويبقى الطلاب المسجّلون.",
          "It leaves the catalog; enrolled students keep access.",
        ),
      }))
    )
      return;
    setStatusBusy(true);
    const ok = await actions.setCourseStatus(course.id, status, reason);
    setStatusBusy(false);
    if (ok) {
      commit({ status, ...(status === "rejected" ? { rejection_reason: reason ?? null } : {}) });
      qc.invalidateQueries({ queryKey: CONSOLE_COUNTS_KEY });
    }
  };

  const deleteCourse = async () => {
    if (
      !(await confirmDialog({
        title: t("حذف الدورة بالكامل؟", "Delete the entire course?"),
        description: t(
          "سيتم حذف كل الأقسام، الدروس، الاختبارات، الواجبات، التقييمات، الشهادات، التسجيلات والطلبات. كما سيتم حذف دورة الحضور المرتبطة نهائيًا بما فيها الجلسات والمسجَّلين وسجلات الحضور. لا يمكن التراجع.",
          "All sections, lessons, quizzes, assignments, reviews, certificates, enrollments and requests will be permanently removed. The linked attendance course — including its sessions, registrants and attendance records — will also be permanently deleted. This cannot be undone.",
        ),
        confirmLabel: t("حذف الدورة", "Delete course"),
        destructive: true,
      }))
    )
      return;
    const { error } = await supabase.rpc("lms_delete_course", { _course_id: course.id });
    if (error) {
      toast.error(toUserMessage(error));
      return;
    }
    courseDraft.clear();
    toast.success(t("تم حذف الدورة", "Course deleted"));
    qc.invalidateQueries({ queryKey: CONSOLE_COUNTS_KEY });
    navigate({
      to:
        context === "admin"
          ? "/learning-management-system/admin/courses"
          : "/learning-management-system/instructor",
    });
  };

  const onlineLessons = lessons.length;
  const checks: CheckItem[] = [
    {
      key: "names",
      ok: !!course.title_ar?.trim() && !!course.title_en?.trim(),
      label: t("الاسم بالعربية والإنجليزية", "Name in Arabic and English"),
      tab: "details",
      required: true,
    },
    {
      key: "desc",
      ok: !!course.description_ar?.trim() && !!course.description_en?.trim(),
      label: t("الوصف باللغتين", "Description in both languages"),
      tab: "details",
      required: true,
    },
    {
      key: "cover",
      ok: !!course.cover_url,
      label: t("صورة الغلاف", "Cover image"),
      tab: "details",
    },
    {
      key: "cat",
      ok: selectedCategoryIds.length > 0,
      label: t("تصنيف واحد على الأقل", "At least one category"),
      tab: "details",
    },
    {
      key: "dates",
      ok: !!course.start_date && !!course.end_date,
      label: t("تاريخ البداية والنهاية", "Start and end dates"),
      tab: "schedule",
    },
    {
      key: "content",
      ok: onsite ? sections.length > 0 : onlineLessons > 0,
      label: onsite
        ? t("جلسة واحدة على الأقل", "At least one session")
        : t("درس واحد على الأقل", "At least one lesson"),
      tab: "content",
    },
  ];
  const ready = checks.filter((c) => c.ok).length;

  const ctx: EditorCtx = {
    course,
    update,
    commit,
    setCourse: (c) => setCourse(c),
    user,
    isAdmin,
    canManage,
    lang,
    ar,
    t,
    reload: load,
    fieldErrors,
    fieldRefs,
  };

  const statusText: Record<string, string> = {
    draft: t("مسودّة: لا يراها الطلاب بعد.", "Draft: students can't see it yet."),
    pending: isAdmin
      ? t(
          "أرسلها المدرّب للمراجعة. انشرها أو أعدها مع السبب.",
          "The instructor sent it for review. Publish it, or send it back with a reason.",
        )
      : t(
          "بانتظار مراجعة الإدارة. لا يمكن حفظ التعديلات حتى القرار.",
          "Waiting for the admin team. Changes can't be saved until they decide.",
        ),
    published: t(
      "منشورة في الكتالوج. ما تحفظه يظهر فوراً.",
      "Live in the catalog. What you save shows right away.",
    ),
    rejected: t(
      "أُعيدت للتعديل. عدّلها ثم أرسلها مجدداً.",
      "Sent back for changes. Edit it, then submit again.",
    ),
  };

  const primaryActions = (
    <div className="flex flex-wrap gap-2">
      {isAdmin ? (
        <>
          {course.status === "pending" && (
            <>
              <Button onClick={() => adminSetStatus("published")} disabled={statusBusy || saving}>
                {statusBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {t("موافقة ونشر", "Approve & publish")}
              </Button>
              <Button variant="outline" onClick={() => setRejectOpen(true)} disabled={statusBusy}>
                <X className="h-4 w-4" />
                {t("رفض مع السبب", "Reject with reason")}
              </Button>
            </>
          )}
          {(course.status === "draft" || course.status === "rejected") && (
            <Button onClick={() => adminSetStatus("published")} disabled={statusBusy || saving}>
              {statusBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {t("نشر الآن", "Publish now")}
            </Button>
          )}
          {course.status === "published" && (
            <Button variant="outline" onClick={() => adminSetStatus("draft")} disabled={statusBusy}>
              <Undo2 className="h-4 w-4" />
              {t("إلغاء النشر", "Unpublish")}
            </Button>
          )}
        </>
      ) : (
        (course.status === "draft" || course.status === "rejected") && (
          <Button onClick={submitForReview} disabled={statusBusy || saving}>
            {statusBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {t("إرسال للمراجعة", "Submit for review")}
          </Button>
        )
      )}
      <Button asChild variant="ghost">
        <a
          href={`/learning-management-system/courses/${course.slug || course.id}`}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink className="h-4 w-4" />
          {t("عرض في الموقع", "View on site")}
        </a>
      </Button>
    </div>
  );

  return (
    <div>
      <PageHeader
        back={{
          to: context === "admin" ? `${base}/courses` : base,
          label: context === "admin" ? t("كل الدورات", "All courses") : t("دوراتي", "My courses"),
        }}
        title={title || t("دورة بلا اسم", "Untitled course")}
        meta={
          <>
            <CourseStatusPill status={course.status} />
            <Pill tone="teal" icon={onsite ? MapPin : MonitorPlay}>
              {onsite ? t("حضوري", "In person") : t("أونلاين", "Online")}
            </Pill>
            <Pill tone="gray" icon={Users}>
              {fmtNum(course.students_count, lang)} {t("طالب", "students")}
            </Pill>
          </>
        }
        actions={primaryActions}
      />

      {course.status === "rejected" && course.rejection_reason && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[var(--cx-red-line)] bg-[var(--cx-red-50)] px-5 py-4 text-[14px] text-[var(--cx-red)]">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <div className="font-extrabold">{t("سبب الرفض", "Why it was sent back")}</div>
            <p className="text-[var(--cx-ink-2)]">{course.rejection_reason}</p>
          </div>
        </div>
      )}

      <DraftNotice show={courseDraft.restored} onDiscard={courseDraft.discard} />

      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <Tabs
            value={tab}
            onChange={onTabChange}
            tabs={[
              { value: "details", label: t("التفاصيل", "Details"), icon: FileText },
              { value: "schedule", label: t("الموعد والمكان", "Schedule"), icon: CalendarDays },
              { value: "content", label: t("المحتوى", "Content"), icon: BookOpen },
              {
                value: "students",
                label: t("الطلاب", "Students"),
                icon: Users,
                count: pendingRequests,
              },
              {
                value: "attendance",
                label: t("الحضور", "Attendance"),
                icon: CalendarCheck,
                hidden: !onsite,
              },
              { value: "grading", label: t("التصحيح والنتائج", "Grading"), icon: ClipboardCheck },
              { value: "completion", label: t("الإكمال والشهادة", "Completion"), icon: Award },
            ]}
          />
          {tab === "details" && (
            <DetailsTab
              ctx={ctx}
              categories={categories}
              selectedCategoryIds={selectedCategoryIds}
              setSelectedCategoryIds={setSelectedCategoryIds}
              onDelete={deleteCourse}
            />
          )}
          {tab === "schedule" && (
            <ScheduleTab
              ctx={ctx}
              switching={switchingMode}
              onDeliveryChange={persistDeliveryMode}
            />
          )}
          {tab === "content" && (
            <ContentTab
              ctx={ctx}
              sections={sections}
              setSections={setSections}
              lessons={lessons}
              setLessons={setLessons}
              onOpenGrading={() => onTabChange("grading")}
            />
          )}
          {tab === "students" && <StudentsTab ctx={ctx} />}
          {tab === "attendance" && onsite && <AttendanceTab ctx={ctx} />}
          {tab === "attendance" && !onsite && (
            <div className="cx-card p-6 text-[14px] text-[var(--cx-muted)]">
              {t(
                "الحضور للدورات الحضورية فقط. غيّر طريقة التقديم من تبويب الموعد والمكان.",
                "Attendance is for in-person courses only. Change the delivery in the Schedule tab.",
              )}
            </div>
          )}
          {tab === "grading" && <GradingTab ctx={ctx} sections={sections} lessons={lessons} />}
          {tab === "completion" && (
            <CompletionTab ctx={ctx} onOpenGrading={() => onTabChange("grading")} />
          )}
        </div>

        <aside className="order-first xl:order-none">
          <div className="cx-card sticky top-6 p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-bold text-[var(--cx-muted)]">
                {t("الحالة", "Status")}
              </span>
              <CourseStatusPill status={course.status} />
            </div>
            <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--cx-ink-2)]">
              {statusText[course.status] ?? ""}
            </p>

            <div className="mt-5 flex items-center justify-between">
              <span className="text-[14px] font-extrabold">{t("الجاهزية", "Readiness")}</span>
              <span className="text-[13px] font-bold tabular-nums text-[var(--cx-muted)]">
                {ready}/{checks.length}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--cx-line-2)]">
              <div
                className="h-full rounded-full bg-[var(--cx-green)] transition-all"
                style={{ width: `${(ready / checks.length) * 100}%` }}
              />
            </div>
            <ul className="mt-3 space-y-2">
              {checks.map((c) => (
                <li key={c.key}>
                  <button
                    type="button"
                    className="cx-check w-full text-start hover:text-[var(--cx-teal)]"
                    data-ok={c.ok}
                    onClick={() => onTabChange(c.tab)}
                  >
                    {c.ok ? <CheckCircle2 /> : <Circle />}
                    <span>
                      {c.label}
                      {c.required && !c.ok && (
                        <span className="ms-1 text-[11.5px] font-bold text-[var(--cx-red)]">
                          {t("(مطلوب)", "(required)")}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {pendingRequests > 0 && (
              <button
                type="button"
                onClick={() => onTabChange("students")}
                className="mt-4 flex w-full items-center justify-between rounded-xl bg-[var(--cx-teal-50)] px-3 py-2.5 text-[13.5px] font-bold text-[var(--cx-teal)]"
              >
                {t("طلبات تسجيل بانتظار القرار", "Enrollment requests waiting")}
                <span className="rounded-full bg-[var(--cx-badge)] px-2 text-[12px] text-[var(--cx-badge-ink)]">
                  {fmtNum(pendingRequests, lang)}
                </span>
              </button>
            )}
          </div>
        </aside>
      </div>

      <SaveBar
        show={dirty && !locked}
        saving={saving}
        onSave={() => saveCourse()}
        onDiscard={discard}
      />
      <ReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title={t("رفض الدورة", "Reject course")}
        description={t(
          "سيرى المدرّب هذا السبب ويمكنه التعديل وإعادة الإرسال.",
          "The instructor sees this reason and can edit and resubmit.",
        )}
        confirmLabel={t("رفض الدورة", "Reject course")}
        required
        destructive
        onConfirm={(reason) => adminSetStatus("rejected", reason)}
      />
    </div>
  );
}
