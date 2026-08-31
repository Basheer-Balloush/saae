import { createFileRoute, Link, useNavigate, useRouter, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, Users, Star, PlayCircle, Loader2, Lock, Clock, Calendar, MapPin, Hourglass, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CoursePrice } from "@/components/lms/CoursePrice";
import { CourseReviews } from "@/components/lms/CourseReviews";
import { EnrollmentFormDialog } from "@/components/lms/EnrollmentFormDialog";


type Course = {
  id: string; title_ar: string; title_en: string | null;
  description_ar: string | null; description_en: string | null;
  cover_url: string | null; level: string; price: number; sale_price?: number | null; is_free: boolean;
  students_count: number; rating_avg: number; review_count: number;
  enrollment_open: boolean; enrollment_deadline: string | null; max_students: number | null;
  start_date: string | null; end_date: string | null;
  schedule_days: string[] | null;
  schedule_time_from: string | null; schedule_time_to: string | null;
  location_ar: string | null; location_en: string | null;
  duration_hours: number | null;
  delivery_mode: string | null;
  slug?: string | null;
};
type Section = { id: string; title: string; display_order: number };
type Lesson = { id: string; section_id: string; title: string; duration_seconds: number; is_preview: boolean; display_order: number };
type Instructor = { slug: string; full_name: string; full_name_ar: string | null; full_name_en: string | null; avatar_url: string | null; specialty: string | null; specialty_ar: string | null; specialty_en: string | null; is_primary: boolean };

type PublicCoursePayload = {
  course: Course;
  instructors: Instructor[] | null;
  sections: Section[] | null;
  lessons: Lesson[] | null;
  has_form: boolean;
};

type CourseLoaderData = {
  course: Course;
  instructor: Instructor | null;
  coInstructors: Instructor[];
  sections: Section[];
  lessons: Lesson[];
  hasForm: boolean;
};

export const Route = createFileRoute("/learning-management-system/courses/$id")({
  loader: async ({ params }): Promise<CourseLoaderData> => {
    // Public, read-only projection of a published course (safe fields only).
    const { data, error } = await supabase.rpc("get_public_course", { _ref: params.id });
    if (error) throw new Error("course_load_failed");
    if (!data) throw notFound();
    const payload = data as unknown as PublicCoursePayload;
    const all = payload.instructors ?? [];
    return {
      course: payload.course,
      instructor: all.find((i) => i.is_primary) ?? null,
      coInstructors: all.filter((i) => !i.is_primary),
      sections: payload.sections ?? [],
      lessons: payload.lessons ?? [],
      hasForm: !!payload.has_form,
    };
  },

  head: ({ params, loaderData }) => {
    const c = loaderData?.course;
    const m = c ? {
      title: (c.title_en ?? c.title_ar ?? "Course") as string,
      description: (() => {
        const title = (c.title_en ?? c.title_ar ?? "Course") as string;
        const rawDesc = (c.description_en ?? c.description_ar ?? "") as string;
        const fullDesc = rawDesc && rawDesc.length >= 50 ? rawDesc : `${title} — course on the SAAE Training and Learning Platform.`;
        return fullDesc.length > 160 ? `${fullDesc.slice(0, 157).trimEnd()}…` : fullDesc;
      })(),
      image: c.cover_url ?? null,
      price: Number(c.sale_price ?? c.price ?? 0),
      isFree: Boolean(c.is_free),
      rating: Number(c.rating_avg ?? 0),
      reviewCount: Number(c.review_count ?? 0),
      canonicalSlug: (c.slug ?? c.id) as string,
      // A-19: truthful availability signal
      availability: (() => {
        const now = new Date();
        const finished = !!c.end_date && new Date(c.end_date) < now;
        const deadlinePassed = !!c.enrollment_deadline && new Date(c.enrollment_deadline) < now;
        const isFull = c.max_students != null && Number(c.students_count) >= Number(c.max_students);
        if (finished) return "https://schema.org/Discontinued";
        if (!c.enrollment_open || deadlinePassed) return "https://schema.org/SoldOut";
        if (isFull) return "https://schema.org/SoldOut";
        return "https://schema.org/InStock";
      })(),
    } : null;
    const url = `https://aisyria.org/learning-management-system/courses/${m?.canonicalSlug ?? params.id}`;
    const title = m?.title ? `${m.title} — SAAE Training and Learning Platform` : "Course — SAAE Training and Learning Platform";
    const description = m?.description ?? "Course on the SAAE Training and Learning Platform — learn from expert instructors and grow your skills.";
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
                // A-19: only emit aggregateRating when we actually have approved reviews.
                ...(m.reviewCount > 0 && m.rating > 0
                  ? {
                      aggregateRating: {
                        "@type": "AggregateRating",
                        ratingValue: m.rating,
                        bestRating: 5,
                        ratingCount: m.reviewCount,
                        reviewCount: m.reviewCount,
                      },
                    }
                  : {}),
                offers: {
                  "@type": "Offer",
                  price: m.isFree ? 0 : m.price,
                  priceCurrency: m.isFree ? "USD" : "SYP",
                  availability: m.availability,
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
  errorComponent: CourseLoadError,
  notFoundComponent: CourseNotFound,
});

function CourseNotFound() {
  const { lang } = useLang();
  const ar = lang === "ar";
  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
      <h1 className="mt-4 text-2xl font-bold text-foreground">
        {ar ? "الدورة غير موجودة" : "Course not found"}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {ar
          ? "هذه الدورة غير متاحة أو لم يتم نشرها بعد."
          : "This course does not exist or is not published yet."}
      </p>
      <Link to="/learning-management-system/catalog" className="inline-block mt-6">
        <Button size="lg">{ar ? "تصفّح الدورات" : "Browse courses"}</Button>
      </Link>
    </div>
  );
}

function CourseLoadError({ reset }: { reset: () => void }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const router = useRouter();
  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
      <h1 className="mt-4 text-2xl font-bold text-foreground">
        {ar ? "تعذّر تحميل الدورة" : "Couldn't load this course"}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {ar
          ? "حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى."
          : "A connection error occurred. Please try again."}
      </p>
      <Button
        size="lg"
        className="mt-6"
        onClick={() => { router.invalidate(); reset(); }}
      >
        <RefreshCw className="h-4 w-4 mx-2" />
        {ar ? "إعادة المحاولة" : "Retry"}
      </Button>
    </div>
  );
}


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
  const [hasQuiz, setHasQuiz] = useState(false);

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
      if (e) {
        const { data: q } = await supabase
          .from("lms_quizzes")
          .select("id")
          .eq("course_id", course.id)
          .limit(1);
        if (!cancelled) setHasQuiz(!!(q && q.length > 0));

      } else {
        setHasQuiz(false);
      }
    })();
    return () => { cancelled = true; };
  }, [course, user]);

  const requireAuth = () => {
    if (!user) {
      // Anonymous visitors are sent to sign-up with a safe internal return URL.
      navigate({
        to: "/learning-management-system/signup",
        search: { redirect: `/learning-management-system/courses/${encodeURIComponent(course.slug ?? id)}` },
      });
      return false;
    }
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
            <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" />{Number(course.students_count ?? 0)} {tr.students}</span>
            <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{Number(course.rating_avg).toFixed(1)}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{tr[course.level as keyof typeof tr] as string}</span>
            {course.delivery_mode === "online" ? (
              <span className="rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2 py-0.5 text-xs font-semibold">{tr.deliveryOnline}</span>
            ) : course.delivery_mode === "onsite" ? (
              <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-xs font-semibold">{tr.deliveryOnsite}</span>
            ) : null}
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
            <CoursePrice
              price={Number(course.price)}
              salePrice={course.sale_price == null ? null : Number(course.sale_price)}
              isFree={course.is_free}
              lang={lang}
              freeLabel={tr.free}
            />
          </div>
          {(() => {
            const deadlinePassed = !!course.enrollment_deadline && new Date(course.enrollment_deadline) < new Date();
            const isFull = course.max_students != null && course.students_count >= course.max_students;
            const closed = !course.enrollment_open;
            if (enrolled) {
              if (course.delivery_mode === "onsite") {
                return (
                  <>
                    <div className="mt-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-4 text-center text-sm text-emerald-700 dark:text-emerald-300 font-semibold">
                      <CheckCircle className="h-5 w-5 mx-auto mb-1" />
                      {ar ? "أنت مسجّل — يتم تتبّع تقدّمك عبر الحضور" : "You're enrolled — progress is tracked via attendance"}
                    </div>
                    {hasQuiz && (
                      <Link to="/learning-management-system/student/quiz/$courseId" params={{ courseId: course.id }} search={{ quiz: undefined }}>
                        <Button className="w-full mt-3" size="lg" variant="outline">{tr.quizzes}</Button>
                      </Link>
                    )}
                  </>
                );
              }
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
                        key={ins.slug}
                        to="/learning-management-system/instructors/$id"
                        params={{ id: ins.slug }}
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
