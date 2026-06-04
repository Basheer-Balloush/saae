import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, Users, Star, PlayCircle, Loader2, Lock, Clock, Calendar, MapPin, Hourglass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CourseReviews } from "@/components/lms/CourseReviews";
import { EnrollmentFormDialog } from "@/components/lms/EnrollmentFormDialog";

export const Route = createFileRoute("/learning-management-system/courses/$id")({
  loader: async ({ params }) => {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id);
    try {
      const q = supabase
        .from("lms_courses")
        .select("id,slug,title_ar,title_en,description_ar,description_en,cover_url,price,is_free,rating_avg");
      const { data } = await (isUuid ? q.eq("id", params.id) : q.eq("slug", params.id)).maybeSingle();
      if (!data) return { meta: null as null | { title: string; description: string; image: string | null; price: number; isFree: boolean; rating: number; canonicalSlug: string } };
      const title = (data.title_en ?? data.title_ar ?? "Course") as string;
      const rawDesc = (data.description_en ?? data.description_ar ?? "") as string;
      const fullDesc = rawDesc && rawDesc.length >= 50
        ? rawDesc
        : `${title} — course on the SAAE Learning Platform.`;
      const description = fullDesc.length > 160 ? `${fullDesc.slice(0, 157).trimEnd()}…` : fullDesc;
      return {
        meta: {
          title,
          description,
          image: (data.cover_url as string | null) ?? null,
          price: Number(data.price ?? 0),
          isFree: Boolean(data.is_free),
          rating: Number(data.rating_avg ?? 0),
          canonicalSlug: ((data as { slug?: string | null }).slug ?? (data.id as string)) as string,
        },
      };
    } catch {
      return { meta: null };
    }
  },
  head: ({ params, loaderData }) => {
    const m = loaderData?.meta;
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
};
type Section = { id: string; title: string; display_order: number };
type Lesson = { id: string; section_id: string; title: string; duration_seconds: number; is_preview: boolean; display_order: number };
type Instructor = { user_id: string; full_name: string; full_name_ar: string | null; full_name_en: string | null; avatar_url: string | null; specialty: string | null; specialty_ar: string | null; specialty_en: string | null };

function CourseDetails() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useLmsAuth();
  const { lang } = useLang();
  const tr = lmsT[lang];
  const ar = lang === "ar";
  const [course, setCourse] = useState<Course | null>(null);
  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrolled, setEnrolled] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualNotes, setManualNotes] = useState("");
  const [hasForm, setHasForm] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const baseQ = supabase.from("lms_courses").select("*");
      const { data: c } = await (isUuid ? baseQ.eq("id", id) : baseQ.eq("slug", id)).maybeSingle();
      setCourse(c as Course | null);
      if (c) {
        const realCourseId = (c as { id: string }).id;
        const [{ data: ins }, { data: secs }] = await Promise.all([
          supabase.from("lms_instructors").select("user_id,full_name,avatar_url,specialty").eq("user_id", c.instructor_id).maybeSingle(),
          supabase.from("lms_sections").select("id,title,display_order").eq("course_id", realCourseId).order("display_order"),
        ]);
        setInstructor(ins as Instructor | null);
        setSections((secs as Section[]) ?? []);
        if (secs && secs.length) {
          const { data: lss } = await supabase.from("lms_lessons")
            .select("id,section_id,title,duration_seconds,is_preview,display_order")
            .in("section_id", secs.map((s) => s.id))
            .order("display_order");
          setLessons((lss as Lesson[]) ?? []);
        }
        const { data: cf } = await supabase
          .from("lms_course_forms")
          .select("id")
          .eq("course_id", realCourseId)
          .eq("is_active", true)
          .maybeSingle();
        setHasForm(!!cf);
        if (user) {
          const [{ data: e }, { data: req }] = await Promise.all([
            supabase.from("lms_enrollments").select("id").eq("course_id", realCourseId).eq("student_id", user.id).maybeSingle(),
            supabase.from("lms_enrollment_requests").select("id").eq("course_id", realCourseId).eq("user_id", user.id).eq("status", "pending").maybeSingle(),
          ]);
          setEnrolled(!!e);
          setPendingRequest(!!req);
        }
      }
      setLoading(false);
    })();
  }, [id, user]);

  const requireAuth = () => {
    if (!user) { navigate({ to: "/learning-management-system/login" }); return false; }
    return true;
  };

  const onFreeEnroll = async () => {
    if (!requireAuth()) return;
    // Always open the enrollment form (base fields are always required).
    setFormDialogOpen(true);
  };




  const onManualSubmit = async () => {
    if (!requireAuth() || !user) return;
    // Always open the enrollment form (base fields are always required).
    setFormDialogOpen(true);
  };


  if (loading) return <p className="text-center py-20 text-muted-foreground">{tr.loading}</p>;
  if (!course) return <p className="text-center py-20 text-muted-foreground">404</p>;

  const title = lang === "ar" ? course.title_ar : course.title_en || course.title_ar;
  const desc = lang === "ar" ? course.description_ar : course.description_en;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            {course.cover_url ? <img src={course.cover_url} alt={title} className="w-full h-full object-cover" /> : <BookOpen className="h-20 w-20 text-primary/40" />}
          </div>
          <h1 className="mt-6 text-3xl font-bold text-foreground">{title}</h1>
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
          {instructor && (
            <div className="mt-6 pt-6 border-t border-border">
              <div className="text-xs text-muted-foreground">{tr.byInstructor}</div>
              <Link
                to="/learning-management-system/instructors/$id"
                params={{ id: instructor.user_id }}
                className="mt-2 flex items-center gap-3 group"
              >
                {instructor.avatar_url ? (
                  <img src={instructor.avatar_url} alt={instructor.full_name} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    {instructor.full_name.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">{instructor.full_name}</div>
                  {instructor.specialty && <div className="text-xs text-muted-foreground line-clamp-2">{instructor.specialty}</div>}
                </div>
              </Link>
            </div>
          )}
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
