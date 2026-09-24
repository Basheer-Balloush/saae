import { createFileRoute, Link } from "@tanstack/react-router";
import { toUserMessage } from "@/lib/safe-error";
import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Edit3,
  Users,
  Loader2,
  ClipboardCheck,
  BookOpen,
  Check,
  FileText,
  Search,
} from "lucide-react";
import { CoursePrice } from "@/components/lms/CoursePrice";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  validateCourseI18n,
  firstInvalidCourseField,
  trimCourseI18n,
  courseI18nWriteErrorMessage,
  type CourseFieldErrors,
  type RequiredCourseField,
} from "@/lib/lms-course-fields";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  InstructorPageHeader,
  InstructorStatusBadge,
} from "@/components/lms-skin/InstructorWorkspace";

export const Route = createFileRoute("/learning-management-system/instructor/")({
  head: () => ({ meta: [{ title: "Instructor — SAAE Training and Learning Platform" }] }),
  component: InstructorHome,
});

type AmsLink = { id: string } | { id: string }[] | null;
type Course = {
  id: string;
  title_ar: string;
  title_en: string | null;
  status: string;
  students_count: number;
  is_free: boolean;
  price: number;
  sale_price: number | null;
  instructor_id: string;
  delivery_mode: string | null;
  ams_courses?: AmsLink;
};
type CourseFilter = "all" | "published" | "draft" | "pending" | "rejected";

function amsCourseId(c: Course): string | null {
  const a = c.ams_courses;
  if (!a) return null;
  return Array.isArray(a) ? (a[0]?.id ?? null) : a.id;
}

function InstructorHome() {
  const { user, role } = useLmsAuth();
  const { lang } = useLang();
  const tr = lmsT[lang];
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CourseFilter>("all");
  const [form, setForm] = useState({
    title_ar: "",
    title_en: "",
    description_ar: "",
    description_en: "",
  });
  const [errors, setErrors] = useState<CourseFieldErrors>({});
  const fieldRefs = useRef<
    Partial<Record<RequiredCourseField, HTMLInputElement | HTMLTextAreaElement | null>>
  >({});

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(false);
    setCourses([]);
    const cols =
      "id,title_ar,title_en,status,students_count,is_free,price,sale_price,instructor_id,delivery_mode,ams_courses!ams_courses_lms_course_id_fkey(id)";
    const { data: ids, error: idError } = await supabase.rpc("lms_my_teaching_course_ids");
    if (idError) {
      toast.error(toUserMessage(idError));
      setLoadError(true);
      setLoading(false);
      return;
    }
    const { data, error } = ids?.length
      ? await supabase
          .from("lms_courses")
          .select(cols)
          .in("id", ids)
          .order("created_at", { ascending: false })
      : { data: [], error: null };
    if (error) {
      toast.error(toUserMessage(error));
      setLoadError(true);
    }
    setCourses((data as Course[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [user]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || creating) return;
    const nextErrors = validateCourseI18n(form, lang);
    setErrors(nextErrors);
    const firstBad = firstInvalidCourseField(nextErrors);
    if (firstBad) {
      fieldRefs.current[firstBad]?.focus();
      return;
    }
    const values = trimCourseI18n(form);
    setCreating(true);
    if (role === "admin") {
      // Course ownership references an instructor profile, even for an admin.
      const { data: profile, error: profileError } = await supabase
        .from("lms_instructors")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profileError) {
        setCreating(false);
        toast.error(toUserMessage(profileError));
        return;
      }
      if (!profile) {
        const { data: ownProfile } = await supabase
          .from("lms_user_profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .maybeSingle();
        const fullName =
          ownProfile?.full_name?.trim() ||
          String(user.user_metadata?.full_name || user.user_metadata?.name || "").trim();
        if (!fullName) {
          setCreating(false);
          toast.error(
            lang === "ar"
              ? "أضف اسمك في ملفك الشخصي قبل إنشاء الدورة."
              : "Add your name to your profile before creating a course.",
          );
          return;
        }
        const { error: insertError } = await supabase
          .from("lms_instructors")
          .insert({ user_id: user.id, full_name: fullName, approved: false });
        if (insertError && insertError.code !== "23505") {
          setCreating(false);
          toast.error(toUserMessage(insertError));
          return;
        }
      }
    }
    const { data, error } = await supabase
      .from("lms_courses")
      .insert({
        instructor_id: user.id,
        ...values,
      })
      .select("id")
      .maybeSingle();
    setCreating(false);
    if (error) {
      const msg = toUserMessage(error);
      toast.error(courseI18nWriteErrorMessage(error.message ?? msg, lang) ?? msg);
      return;
    }
    setOpen(false);
    setForm({ title_ar: "", title_en: "", description_ar: "", description_en: "" });
    setErrors({});
    if (data) window.location.href = `/learning-management-system/instructor/courses/${data.id}`;
  };

  const counts = {
    published: courses.filter((c) => c.status === "published").length,
    draft: courses.filter((c) => c.status === "draft").length,
    pending: courses.filter((c) => c.status === "pending").length,
    rejected: courses.filter((c) => c.status === "rejected").length,
  };
  const enrollments = courses.reduce(
    (total, course) => total + Number(course.students_count || 0),
    0,
  );
  const search = query.trim().toLocaleLowerCase();
  const visibleCourses = courses.filter(
    (course) =>
      (filter === "all" || course.status === filter) &&
      (!search ||
        `${course.title_ar} ${course.title_en ?? ""}`.toLocaleLowerCase().includes(search)),
  );
  const filters: { value: CourseFilter; label: string; count: number }[] = [
    { value: "all", label: lang === "ar" ? "الكل" : "All", count: courses.length },
    { value: "published", label: lang === "ar" ? "منشورة" : "Published", count: counts.published },
    { value: "draft", label: lang === "ar" ? "مسودّات" : "Drafts", count: counts.draft },
    { value: "pending", label: lang === "ar" ? "قيد المراجعة" : "Pending", count: counts.pending },
    ...(counts.rejected
      ? [
          {
            value: "rejected" as const,
            label: lang === "ar" ? "مرفوضة" : "Rejected",
            count: counts.rejected,
          },
        ]
      : []),
  ];

  return (
    <>
      <InstructorPageHeader
        title={lang === "ar" ? "مساحة عمل المدرّب" : "Instructor workspace"}
        meta={
          <p>
            {lang === "ar"
              ? "أدر دوراتك والحضور من مكان واحد."
              : "Manage your courses and attendance in one place."}
          </p>
        }
        actions={
          <>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <button type="button" className="id-button id-button-primary">
                  <Plus aria-hidden="true" />
                  {lang === "ar" ? "دورة جديدة" : "New course"}
                </button>
              </DialogTrigger>
              <DialogContent className="dark id-create-dialog">
                <DialogHeader>
                  <DialogTitle>{lang === "ar" ? "دورة جديدة" : "New course"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={onCreate} noValidate className="space-y-3">
                  <div>
                    <Label htmlFor="id-title-ar">
                      {lang === "ar" ? "العنوان (عربي)" : "Title (Arabic)"}
                    </Label>
                    <Input
                      id="id-title-ar"
                      dir="rtl"
                      ref={(el) => {
                        fieldRefs.current.title_ar = el;
                      }}
                      aria-invalid={!!errors.title_ar}
                      value={form.title_ar}
                      onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
                    />
                    {errors.title_ar && (
                      <p className="mt-1 text-xs text-destructive">{errors.title_ar}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="id-title-en">
                      {lang === "ar" ? "العنوان (إنجليزي)" : "Title (English)"}
                    </Label>
                    <Input
                      id="id-title-en"
                      dir="ltr"
                      ref={(el) => {
                        fieldRefs.current.title_en = el;
                      }}
                      aria-invalid={!!errors.title_en}
                      value={form.title_en}
                      onChange={(e) => setForm({ ...form, title_en: e.target.value })}
                    />
                    {errors.title_en && (
                      <p className="mt-1 text-xs text-destructive">{errors.title_en}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="id-description-ar">
                      {lang === "ar" ? "الوصف (عربي)" : "Description (Arabic)"}
                    </Label>
                    <Textarea
                      id="id-description-ar"
                      dir="rtl"
                      rows={3}
                      ref={(el) => {
                        fieldRefs.current.description_ar = el;
                      }}
                      aria-invalid={!!errors.description_ar}
                      value={form.description_ar}
                      onChange={(e) => setForm({ ...form, description_ar: e.target.value })}
                    />
                    {errors.description_ar && (
                      <p className="mt-1 text-xs text-destructive">{errors.description_ar}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="id-description-en">
                      {lang === "ar" ? "الوصف (إنجليزي)" : "Description (English)"}
                    </Label>
                    <Textarea
                      id="id-description-en"
                      dir="ltr"
                      rows={3}
                      ref={(el) => {
                        fieldRefs.current.description_en = el;
                      }}
                      aria-invalid={!!errors.description_en}
                      value={form.description_en}
                      onChange={(e) => setForm({ ...form, description_en: e.target.value })}
                    />
                    {errors.description_en && (
                      <p className="mt-1 text-xs text-destructive">{errors.description_en}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={creating}>
                    {creating && <Loader2 className="h-4 w-4 animate-spin mx-2" />}
                    {lang === "ar" ? "إنشاء" : "Create"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            <Link
              to="/learning-management-system/instructor/profile"
              className="id-button id-button-secondary"
            >
              <Edit3 aria-hidden="true" />
              {lang === "ar" ? "تعديل الملف الشخصي" : "Edit profile"}
            </Link>
          </>
        }
      />

      <section className="id-stats" aria-label={lang === "ar" ? "ملخص الدورات" : "Course summary"}>
        <div className="id-stat">
          <BookOpen aria-hidden="true" />
          <span>
            {lang === "ar" ? "الدورات" : "Courses"}
            <strong>{loading || loadError ? "—" : courses.length}</strong>
          </span>
        </div>
        <div className="id-stat">
          <Check aria-hidden="true" />
          <span>
            {lang === "ar" ? "المنشورة" : "Published"}
            <strong>{loading || loadError ? "—" : counts.published}</strong>
          </span>
        </div>
        <div className="id-stat">
          <FileText aria-hidden="true" />
          <span>
            {lang === "ar" ? "المسودّات" : "Drafts"}
            <strong>{loading || loadError ? "—" : counts.draft}</strong>
          </span>
        </div>
        <div className="id-stat">
          <Users aria-hidden="true" />
          <span>
            {lang === "ar" ? "التسجيلات" : "Enrollments"}
            <strong>{loading || loadError ? "—" : enrollments}</strong>
          </span>
        </div>
      </section>

      <section className="id-panel" aria-labelledby="id-courses-heading">
        <div className="id-panel-head">
          <div>
            <h2 id="id-courses-heading">{lang === "ar" ? "دوراتي" : "My courses"}</h2>
            <p>
              {lang === "ar"
                ? "أنشئ دوراتك وعدّلها وتابع حضورها."
                : "Create, edit, and manage your courses."}
            </p>
          </div>
          {courses.length > 0 && (
            <div className="id-controls">
              <label className="id-search">
                <Search aria-hidden="true" />
                <span className="sr-only">
                  {lang === "ar" ? "ابحث في الدورات" : "Search courses"}
                </span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={lang === "ar" ? "ابحث في الدورات..." : "Search courses..."}
                />
              </label>
              <div
                className="id-filters"
                role="group"
                aria-label={lang === "ar" ? "تصفية حسب الحالة" : "Filter by status"}
              >
                {filters.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={filter === item.value}
                    onClick={() => setFilter(item.value)}
                  >
                    {item.label}
                    <span>{item.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <p className="id-empty" role="status">
            <Loader2 aria-hidden="true" className="id-spinner" />
            {tr.loading}
          </p>
        ) : loadError ? (
          <div className="id-empty" role="alert">
            <p>{lang === "ar" ? "تعذّر تحميل الدورات." : "Could not load your courses."}</p>
            <button type="button" className="id-clear" onClick={load}>
              {lang === "ar" ? "إعادة المحاولة" : "Try again"}
            </button>
          </div>
        ) : courses.length === 0 ? (
          <p className="id-empty">
            {lang === "ar"
              ? "ليس لديك دورات بعد. ابدأ بإنشاء دورتك الأولى."
              : "No courses yet. Create your first course to get started."}
          </p>
        ) : visibleCourses.length === 0 ? (
          <div className="id-empty">
            <p>
              {lang === "ar"
                ? "لا توجد دورات تطابق البحث أو التصفية."
                : "No courses match your search or filter."}
            </p>
            <button
              type="button"
              className="id-clear"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              {lang === "ar" ? "مسح التصفية" : "Clear filters"}
            </button>
          </div>
        ) : (
          <div className="id-course-list">
            <div className="id-list-head" aria-hidden="true">
              <span>{lang === "ar" ? "الدورة" : "Course"}</span>
              <span>{lang === "ar" ? "الحالة" : "Status"}</span>
              <span>{lang === "ar" ? "الطلاب" : "Students"}</span>
              <span>{lang === "ar" ? "السعر" : "Price"}</span>
              <span>{lang === "ar" ? "الإجراءات" : "Actions"}</span>
            </div>
            {visibleCourses.map((course) => {
              const attendanceId = amsCourseId(course);
              return (
                <article key={course.id} className="id-course-row">
                  <h3>
                    <Link
                      to="/learning-management-system/instructor/courses/$id"
                      params={{ id: course.id }}
                    >
                      {lang === "ar" ? course.title_ar : course.title_en || course.title_ar}
                    </Link>
                  </h3>
                  <div className="id-badges">
                    <InstructorStatusBadge status={course.status} />
                    {user && course.instructor_id !== user.id && (
                      <span className="id-co-taught">
                        {lang === "ar" ? "تدريس مشترك" : "Co-taught"}
                      </span>
                    )}
                  </div>
                  <span className="id-students">
                    <Users aria-hidden="true" />
                    {course.students_count}
                  </span>
                  <span className="id-price">
                    <CoursePrice
                      price={Number(course.price ?? 0)}
                      salePrice={course.sale_price == null ? null : Number(course.sale_price)}
                      isFree={!!course.is_free}
                      lang={lang}
                      freeLabel={tr.free}
                      size="sm"
                    />
                  </span>
                  <div className="id-row-actions">
                    {course.delivery_mode !== "online" &&
                      (attendanceId ? (
                        <Link
                          to="/attendance-management-system"
                          search={{ course: attendanceId }}
                          className="id-attendance"
                        >
                          <ClipboardCheck aria-hidden="true" />
                          {lang === "ar" ? "تسجيل الحضور" : "Take attendance"}
                        </Link>
                      ) : (
                        <span
                          className="id-attendance-note"
                          title={
                            lang === "ar"
                              ? "اطلب من الإدارة ربط الدورة بنظام الحضور."
                              : "Ask an admin to link this course to the attendance system."
                          }
                        >
                          {lang === "ar"
                            ? "اطلب من الإدارة تفعيل الحضور"
                            : "Ask admin to enable attendance"}
                        </span>
                      ))}
                    <Link
                      to="/learning-management-system/instructor/courses/$id"
                      params={{ id: course.id }}
                      className="id-edit"
                    >
                      <Edit3 aria-hidden="true" />
                      {lang === "ar" ? "تعديل" : "Edit"}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
