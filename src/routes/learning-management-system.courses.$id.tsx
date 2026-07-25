import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, Users, Star, PlayCircle, Loader2, Lock, Clock, Calendar, MapPin, Hourglass, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CourseReviews } from "@/components/lms/CourseReviews";
import { EnrollmentFormDialog } from "@/components/lms/EnrollmentFormDialog";

type Course = {
  id: string; title_ar: string; title_en: string | null;
  description_ar: string | null; description_en: string | null;
  cover_url: string | null; level: string; price: number; is_free: boolean;
  students_count: number; rating_avg: number; instructor_id: string;
  enrollment_open: boolean; enrollment_deadline: string | null; max_students: number | null;
  start_date: string | null; end_date: string | null;
  schedule_days: string[] | null;
  schedule_time_from: string | null; schedule_time_to: string | null;
  location_ar: string | null; location_en: string | null;
  duration_hours: number | null;
  slug?: string | null;
};
type Section = { id: string; title: string; display_order: number };
type Lesson = { id: string; section_id: string; title: string; duration_seconds: number; is_preview: boolean; display_order: number };
type Instructor = { slug: string; full_name: string; full_name_ar: string | null; full_name_en: string | null; avatar_url: string | null; specialty: string | null; specialty_ar: string | null; specialty_en: string | null; is_primary: boolean };

type CourseLoaderData = {
  course: Course | null;
  instructor: Instructor | null;
  coInstructors: Instructor[];
  sections: Section[];
  lessons: Lesson[];
  hasForm: boolean;
};

export const Route = createFileRoute("/learning-management-system/courses/$id")({
  loader: async ({ params }): Promise<CourseLoaderData> => {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id);
    const baseQ = supabase.from("lms_courses").select("id,instructor_id,category_id,title_ar,title_en,description_ar,description_en,level,price,is_free,cover_url,status,rating_avg,students_count,created_at,updated_at,enrollment_open,max_students,enrollment_deadline,slug,start_date,end_date,schedule_days,schedule_time_from,schedule_time_to,location_ar,location_en,duration_hours");
    const { data: c } = await (isUuid ? baseQ.eq("id", params.id) : baseQ.eq("slug", params.id)).maybeSingle();
    if (!c) return { course: null, instructor: null, coInstructors: [], sections: [], lessons: [], hasForm: false };
    const course = c as unknown as Course;
    const realCourseId = course.id;

    const [{ data: insList }, { data: secs }, { data: cf }] = await Promise.all([
      supabase.rpc("get_public_instructors_for_course", { _course_id: realCourseId }),
      supabase.from("lms_sections").select("id,title,display_order").eq("course_id", realCourseId).order("display_order"),
      supabase.from("lms_course_forms").select("id").eq("course_id", realCourseId).eq("is_active", true).maybeSingle(),
    ]);
    const sections = ((secs as unknown) as Section[]) ?? [];
    let lessons: Lesson[] = [];
    if (sections.length) {
      const { data: lss } = await supabase.from("lms_lessons")
        .select("id,section_id,title,duration_seconds,is_preview,display_order")
        .in("section_id", sections.map((s) => s.id))
        .order("display_order");
      lessons = ((lss as unknown) as Lesson[]) ?? [];
    }
    const all = ((insList as unknown) as Instructor[]) ?? [];
    const instructor = all.find((i) => i.is_primary) ?? null;
    const coInstructors = all.filter((i) => !i.is_primary);
    return {
      course,
      instructor,
      coInstructors,
      sections,
      lessons,
      hasForm: !!cf,
    };
  },
  head: ({ params, loaderData }) => {
    const c = loaderData?.course;
    const m = c ? {
      title: (c.title_en ?? c.title_ar ?? "Course") as string,
      description: (() => {
        const title = (c.title_en ?? c.title_ar ?? "Course") as string;
        const rawDesc = (c.description_en ?? c.description_ar ?? "") as string;
        const fullDesc = rawDesc && rawDesc.length >= 50 ? rawDesc : `${title} — course on the SAAE Learning Platform.`;
        return fullDesc.length > 160 ? `${fullDesc.slice(0, 157).trimEnd()}…` : fullDesc;
      })(),
      image: c.cover_url ?? null,
      price: Number(c.price ?? 0),
      isFree: Boolean(c.is_free),
      rating: Number(c.rating_avg ?? 0),
      canonicalSlug: (c.slug ?? c.id) as string,
    } : null;
    const url = `https://aisyria.org/learning-management-system/courses/${m?.canonicalSlug ?? params.id}`;
    const title = m?.title ? `${m.title} — SAAE Learning Platform` : "Course — SAAE Learning Platform";
    const description = m?.description ?? "Course on the SAAE Learning Platform — learn from expert instructors and grow your skills.";
    const image = m?.image ?? undefined;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: m
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Course",
                name: m.title,
                description,
                ...(image ? { image: [image] } : {}),
                provider: {
                  "@type": "Organization",
                  name: "SAAE — Syrian Association for AI & Entrepreneurship",
                  sameAs: "https://aisyria.org",
                },
                ...(m.rating > 0
                  ? {
                      aggregateRating: {
                        "@type": "AggregateRating",
                        ratingValue: m.rating,
                        bestRating: 5,
                        ratingCount: 1,
                      },
                    }
                  : {}),
                offers: {
                  "@type": "Offer",
                  price: m.isFree ? 0 : m.price,
                  priceCurrency: "USD",
                  availability: "https://schema.org/InStock",
                  url,
                },
                url,
              }),
            },
          ]
        : undefined,
    };
  },
  component: CourseDetails,
});

function CourseDetails() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useLmsAuth();
  const { lang } = useLang();
  const tr = lmsT[lang];
  const ar = lang === "ar";
  const { course, instructor, coInstructors, sections, lessons, hasForm } = Route.useLoaderData() as CourseLoaderData;
  const [enrolled, setEnrolled] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(false);
  const [busy, setBusy] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualNotes, setManualNotes] = useState("");
  const [formDialogOpen, setFormDialogOpen] = useState(false);

  useEffect(() => {
    if (!course || !user) {
      setEnrolled(false);
      setPendingRequest(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const [{ data: e }, { data: req }] = await Promise.all([
        supabase.from("lms_enrollments").select("id").eq("course_id", course.id).eq("student_id", user.id).maybeSingle(),
        supabase.from("lms_enrollment_requests").select("id").eq("course_id", course.id).eq("user_id", user.id).eq("status", "pending").maybeSingle(),
      ]);
      if (cancelled) return;
      setEnrolled(!!e);
      setPendingRequest(!!req);
    })();
    return () => { cancelled = true; };
  }, [course, user]);

  const requireAuth = () => {
    if (!user) { navigate({ to: "/learning-management-system/login" }); return false; }
    return true;
  };

  const onFreeEnroll = async () => {
    if (!requireAuth()) return;
    setFormDialogOpen(true);
  };

  const onManualSubmit = async () => {
    if (!requireAuth() || !user) return;
    setFormDialogOpen(true);
  };

  if (!course) return <p className="text-center py-20 text-muted-foreground">404</p>;


  const title = lang === "ar" ? course.title_ar : course.title_en || course.title_ar;
  const desc = lang === "ar" ? course.description_ar : course.description_en;
  const isFinished = !!course.end_date && new Date(course.end_date) < new Date();

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            {course.cover_url ? <img src={course.cover_url} alt={title} className="w-full h-full object-cover" /> : <BookOpen className="h-20 w-20 text-primary/40" />}
          </div>
          <div className="mt-6 flex items-start gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-foreground">{title}</h1>
            {isFinished && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-3 py-1 text-sm font-semibold">
                <CheckCircle className="h-3.5 w-3.5" />
                {tr.courseFinished}
              </span>
            )}
          </div>
          {desc && <p className="mt-3 text-muted-foreground leading-relaxed">{desc}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" />{course.students_count} {tr.students}</span>
            <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{Number(course.rating_avg).toFixed(1)}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{tr[course.level as keyof typeof tr] as string}</span>
          </div>

          {(() => {
            const dayLabels: Record<string, { ar: string; en: string }> = {
              sat: { ar: "السبت", en: "Saturday" }, sun: { ar: "الأحد", en: "Sunday" },
              mon: { ar: "الإثنين", en: "Monday" }, tue: { ar: "الثلاثاء", en: "Tuesday" },
              wed: { ar: "الأربعاء", en: "Wednesday" }, thu: { ar: "الخميس", en: "Thursday" },
              fri: { ar: "الجمعة", en: "Friday" },
            };
            const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(ar ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" });
            const days = (course.schedule_days ?? []).map((d) => ar ? dayLabels[d]?.ar : dayLabels[d]?.en).filter(Boolean).join(ar ? "، " : ", ");
            const loc = ar ? (course.location_ar || course.location_en) : (course.location_en || course.location_ar);
            const hasAny = course.start_date || course.end_date || course.schedule_time_from || days || loc || course.duration_hours;
            if (!hasAny) return null;
            return (
              <div className="mt-6 rounded-2xl border border-border bg-card p-5">
                <h2 className="font-bold text-foreground mb-3">{ar ? "تفاصيل الدورة" : "Course details"}</h2>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  {(course.start_date || course.end_date) && (
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                      <div>
                        <div className="text-muted-foreground text-xs">{ar ? "التاريخ" : "Date"}</div>
                        <div className="text-foreground">
                          {course.start_date && fmtDate(course.start_date)}
                          {course.start_date && course.end_date && (ar ? " — " : " — ")}
                          {course.end_date && fmtDate(course.end_date)}
                        </div>
                      </div>
                    </div>
                  )}
                  {(course.schedule_time_from || course.schedule_time_to) && (
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                      <div>
                        <div className="text-muted-foreground text-xs">{ar ? "الوقت" : "Time"}</div>
                        <div className="text-foreground">
                          {course.schedule_time_from}{course.schedule_time_to ? ` — ${course.schedule_time_to}` : ""}
                        </div>
                      </div>
                    </div>
                  )}
                  {days && (
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                      <div>
                        <div className="text-muted-foreground text-xs">{ar ? "الأيام" : "Days"}</div>
                        <div className="text-foreground">{days}</div>
                      </div>
                    </div>
                  )}
                  {loc && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                      <div>
                        <div className="text-muted-foreground text-xs">{ar ? "المكان" : "Location"}</div>
                        <div className="text-foreground">{loc}</div>
                      </div>
                    </div>
                  )}
                  {course.duration_hours != null && (
                    <div className="flex items-start gap-2">
                      <Hourglass className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                      <div>
                        <div className="text-muted-foreground text-xs">{ar ? "مدة الدورة" : "Duration"}</div>
                        <div className="text-foreground">{course.duration_hours} {ar ? "ساعة" : "hours"}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}



          <h2 className="mt-10 text-xl font-bold text-foreground">{tr.syllabus}</h2>
          <div className="mt-4 space-y-3">
            {sections.length === 0 && <p className="text-sm text-muted-foreground">{tr.comingSoon}</p>}
            {sections.map((s) => (
              <div key={s.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 bg-muted/40 font-semibold text-foreground">{s.title}</div>
                <ul className="divide-y divide-border">
                  {lessons.filter((l) => l.section_id === s.id).map((l) => (
                    <li key={l.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      {enrolled || l.is_preview ? <PlayCircle className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                      <span className="flex-1 text-foreground">{l.title}</span>
                      {l.is_preview && !enrolled && <span className="text-xs text-primary font-semibold">Preview</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <CourseReviews courseId={course.id} canReview={enrolled} />
        </div>

        <aside className="lg:sticky lg:top-24 self-start rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="text-3xl font-bold text-foreground">
            {course.is_free ? tr.free : (
              <span dir="ltr" className="inline-flex flex-row items-center gap-2">
                {lang === "ar" ? (
                  <>
                    <span dir="rtl">ل.س</span>
                    <span>{Number(course.price).toLocaleString()}</span>
                  </>
                ) : (
                  <>
                    <span>{Number(course.price).toLocaleString()}</span>
                    <span>SYP</span>
                  </>
                )}
              </span>
            )}
          </div>
          {(() => {
            const deadlinePassed = !!course.enrollment_deadline && new Date(course.enrollment_deadline) < new Date();
            const isFull = course.max_students != null && course.students_count >= course.max_students;
            const closed = !course.enrollment_open;
            if (enrolled) {
              return (
                <Link to="/learning-management-system/student/player/$courseId" params={{ courseId: course.id }}>
                  <Button className="w-full mt-4" size="lg">{tr.goToCourse}</Button>
                </Link>
              );
            }
            if (isFinished) {
              return (
                <div className="mt-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-4 text-center text-sm text-emerald-700 dark:text-emerald-300 font-semibold">
                  <CheckCircle className="h-5 w-5 mx-auto mb-1" />
                  {tr.courseFinished}
                </div>
              );
            }
            if (pendingRequest) {
              return (
                <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-950/30 p-4 text-center">
                  <Clock className="h-5 w-5 mx-auto text-amber-600" />
                  <p className="mt-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
                    {ar ? "طلبك قيد المراجعة" : "Your request is pending"}
                  </p>
                </div>
              );
            }
            if (closed || deadlinePassed || isFull) {
              return (
                <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                  {isFull
                    ? (ar ? "اكتمل العدد" : "Course is full")
                    : deadlinePassed
                    ? (ar ? "انتهى موعد التسجيل" : "Enrollment deadline passed")
                    : (ar ? "التسجيل مغلق حالياً" : "Enrollment is closed")}
                </div>
              );
            }
            if (course.is_free) {
              return (
                <Button className="w-full mt-4" size="lg" onClick={onFreeEnroll} disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin mx-2" />}
                  {tr.enroll}
                </Button>
              );
            }
            return (
              <div className="mt-4 space-y-3">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => { if (requireAuth()) { setFormDialogOpen(true); } }}
                  disabled={busy}
                >
                  {tr.enroll}
                </Button>
                <p className="text-xs text-muted-foreground text-center leading-relaxed">
                  {ar
                    ? "سجّل وعبّئ النموذج. بعد قبولك في الدورة سيتم التواصل معك لترتيب الدفع."
                    : "Register and fill the form. Once accepted, we'll contact you to arrange payment."}
                </p>
                {manualOpen && !hasForm && (
                  <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                    <Textarea
                      placeholder={ar ? "ملاحظات (اختياري)" : "Notes (optional)"}
                      value={manualNotes}
                      onChange={(e) => setManualNotes(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={onManualSubmit} disabled={busy} className="flex-1">
                        {busy && <Loader2 className="h-4 w-4 animate-spin mx-2" />}
                        {ar ? "إرسال" : "Submit"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setManualOpen(false)}>
                        {ar ? "إلغاء" : "Cancel"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
          {instructor && (() => {
            const allInstructors = [instructor, ...coInstructors];
            return (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="text-xs text-muted-foreground">
                  {allInstructors.length > 1
                    ? (ar ? "المدرّبون" : "Instructors")
                    : tr.byInstructor}
                </div>
                <div className="mt-2 space-y-3">
                  {allInstructors.map((ins) => {
                    const insName = (ar ? ins.full_name_ar : ins.full_name_en) || ins.full_name;
                    const insSpec = (ar ? ins.specialty_ar : ins.specialty_en) || ins.specialty;
                    return (
                      <Link
                        key={ins.user_id}
                        to="/learning-management-system/instructors/$id"
                        params={{ id: ins.user_id }}
                        className="flex items-center gap-3 group"
                      >
                        {ins.avatar_url ? (
                          <img src={ins.avatar_url} alt={insName} className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                            {insName.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors truncate">{insName}</div>
                          {insSpec && <div className="text-xs text-muted-foreground line-clamp-2">{insSpec}</div>}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </aside>
      </div>
      <EnrollmentFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        courseId={course?.id ?? id}
        notes={manualNotes || null}
        onSubmitted={() => { setPendingRequest(true); setManualOpen(false); setManualNotes(""); }}
      />
    </div>
  );
}
