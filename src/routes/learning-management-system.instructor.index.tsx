import { createFileRoute, Link } from "@tanstack/react-router";
import { toUserMessage } from "@/lib/safe-error";
import { useEffect, useRef, useState } from "react";
import { Plus, Edit3, Users, Loader2 } from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/learning-management-system/instructor/")({
  head: () => ({ meta: [{ title: "LMS · Instructor" }] }),
  component: InstructorHome,
});

type AmsLink = { id: string } | { id: string }[] | null;
type Course = { id: string; title_ar: string; title_en: string | null; status: string; students_count: number; is_free: boolean; price: number; sale_price: number | null; instructor_id: string; delivery_mode: string | null; ams_courses?: AmsLink };

function amsCourseId(c: Course): string | null {
  const a = c.ams_courses;
  if (!a) return null;
  return Array.isArray(a) ? (a[0]?.id ?? null) : a.id;
}

function InstructorHome() {
  const { user } = useLmsAuth();
  const { lang } = useLang();
  const tr = lmsT[lang];
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title_ar: "", title_en: "", description_ar: "", description_en: "" });
  const [errors, setErrors] = useState<CourseFieldErrors>({});
  const fieldRefs = useRef<Partial<Record<RequiredCourseField, HTMLInputElement | HTMLTextAreaElement | null>>>({});

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const cols = "id,title_ar,title_en,status,students_count,is_free,price,sale_price,instructor_id,delivery_mode,ams_courses!ams_courses_lms_course_id_fkey(id)";
    const ownedP = supabase.from("lms_courses")
      .select(cols)
      .eq("instructor_id", user.id)
      .order("created_at", { ascending: false });
    const coP = supabase.from("lms_course_instructors")
      .select(`course:lms_courses(${cols})`)
      .eq("instructor_user_id", user.id);
    const [{ data: owned }, { data: co }] = await Promise.all([ownedP, coP]);
    const map = new Map<string, Course>();
    for (const c of (owned as Course[]) ?? []) map.set(c.id, c);
    for (const row of ((co as unknown) as Array<{ course: Course | null }>) ?? []) {
      if (row.course && !map.has(row.course.id)) map.set(row.course.id, row.course);
    }
    setCourses(Array.from(map.values()));
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || creating) return;
    const nextErrors = validateCourseI18n(form, lang);
    setErrors(nextErrors);
    const firstBad = firstInvalidCourseField(nextErrors);
    if (firstBad) { fieldRefs.current[firstBad]?.focus(); return; }
    const values = trimCourseI18n(form);
    setCreating(true);
    const { data, error } = await supabase.from("lms_courses").insert({
      instructor_id: user.id,
      ...values,
    }).select("id").maybeSingle();
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

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{tr.navInstructor}</h1>
        <Link
          to="/learning-management-system/instructor/profile"
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:border-primary hover:text-primary"
        >
          <Edit3 className="h-3.5 w-3.5" />
          {lang === "ar" ? "تعديل الملف الشخصي" : "Edit profile"}
        </Link>
      </div>
      <div className="flex items-center justify-between mt-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mx-1" />{lang === "ar" ? "دورة جديدة" : "New course"}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{lang === "ar" ? "دورة جديدة" : "New course"}</DialogTitle></DialogHeader>
            <form onSubmit={onCreate} noValidate className="space-y-3">
              <div>
                <Label>{lang === "ar" ? "العنوان (عربي)" : "Title (Arabic)"}</Label>
                <Input
                  dir="rtl"
                  ref={(el) => { fieldRefs.current.title_ar = el; }}
                  aria-invalid={!!errors.title_ar}
                  value={form.title_ar}
                  onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
                />
                {errors.title_ar && <p className="mt-1 text-xs text-destructive">{errors.title_ar}</p>}
              </div>
              <div>
                <Label>{lang === "ar" ? "العنوان (إنجليزي)" : "Title (English)"}</Label>
                <Input
                  dir="ltr"
                  ref={(el) => { fieldRefs.current.title_en = el; }}
                  aria-invalid={!!errors.title_en}
                  value={form.title_en}
                  onChange={(e) => setForm({ ...form, title_en: e.target.value })}
                />
                {errors.title_en && <p className="mt-1 text-xs text-destructive">{errors.title_en}</p>}
              </div>
              <div>
                <Label>{lang === "ar" ? "الوصف (عربي)" : "Description (Arabic)"}</Label>
                <Textarea
                  dir="rtl"
                  rows={3}
                  ref={(el) => { fieldRefs.current.description_ar = el; }}
                  aria-invalid={!!errors.description_ar}
                  value={form.description_ar}
                  onChange={(e) => setForm({ ...form, description_ar: e.target.value })}
                />
                {errors.description_ar && <p className="mt-1 text-xs text-destructive">{errors.description_ar}</p>}
              </div>
              <div>
                <Label>{lang === "ar" ? "الوصف (إنجليزي)" : "Description (English)"}</Label>
                <Textarea
                  dir="ltr"
                  rows={3}
                  ref={(el) => { fieldRefs.current.description_en = el; }}
                  aria-invalid={!!errors.description_en}
                  value={form.description_en}
                  onChange={(e) => setForm({ ...form, description_en: e.target.value })}
                />
                {errors.description_en && <p className="mt-1 text-xs text-destructive">{errors.description_en}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 animate-spin mx-2" />}
                {lang === "ar" ? "إنشاء" : "Create"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="mt-10 text-center text-muted-foreground">{tr.loading}</p>
      ) : courses.length === 0 ? (
        <p className="mt-16 text-center text-muted-foreground">{lang === "ar" ? "ليس لديك دورات بعد. أنشئ أول دورة!" : "No courses yet. Create your first!"}</p>
      ) : (
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => (
            <div key={c.id} className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary">
            <Link to="/learning-management-system/instructor/courses/$id" params={{ id: c.id }}
              className="block">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-foreground line-clamp-2">{lang === "ar" ? c.title_ar : c.title_en || c.title_ar}</h3>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={c.status} />
                  {user && c.instructor_id !== user.id && (
                    <span className="text-[10px] font-bold rounded-full px-2 py-0.5 bg-primary/10 text-primary">
                      {lang === "ar" ? "تدريس مشترك" : "Co-taught"}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{c.students_count}</span>
                <CoursePrice
                  price={Number(c.price ?? 0)}
                  salePrice={c.sale_price == null ? null : Number(c.sale_price)}
                  isFree={!!c.is_free}
                  lang={lang}
                  freeLabel={tr.free}
                  size="sm"
                />
                <span className="inline-flex items-center gap-1 text-primary"><Edit3 className="h-3.5 w-3.5" />{lang === "ar" ? "تعديل" : "Edit"}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { lang } = useLang();
  const map: Record<string, { cls: string; label: string }> = {
    draft: { cls: "bg-muted text-muted-foreground", label: lang === "ar" ? "مسودّة" : "Draft" },
    pending: { cls: "bg-amber-500/15 text-amber-600", label: lang === "ar" ? "بانتظار المراجعة" : "Pending" },
    published: { cls: "bg-emerald-500/15 text-emerald-600", label: lang === "ar" ? "منشورة" : "Published" },
    rejected: { cls: "bg-destructive/15 text-destructive", label: lang === "ar" ? "مرفوضة" : "Rejected" },
  };
  const m = map[status] ?? map.draft;
  return <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${m.cls}`}>{m.label}</span>;
}
