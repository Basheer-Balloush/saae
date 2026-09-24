import { createFileRoute, Link, useNavigate, useRouter, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PlayCircle, Loader2, Lock, Clock, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCourseTeachingStatus } from "@/hooks/useCourseTeachingStatus";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { Textarea } from "@/components/ui/textarea";
import { CoursePrice } from "@/components/lms/CoursePrice";
import { CourseReviews } from "@/components/lms/CourseReviews";
import { EnrollmentFormDialog } from "@/components/lms/EnrollmentFormDialog";
import { SubHero } from "@/components/lms-skin/SubHero";
import { IconCategoryAI } from "@/components/lms-skin/icons";
import { LMS_SKIN_LINKS } from "@/components/lms-skin/skin";


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
      links: [{ rel: "canonical", href: url }, ...LMS_SKIN_LINKS],
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
    <SubHero
      id="course-missing-title"
      eyebrow={lmsT[lang].navCatalog}
      titleSpans={[ar ? "الدورة غير موجودة" : "Course not found"]}
      titleClassName="course-page-title"
      lede={ar ? "هذه الدورة غير متاحة أو لم يتم نشرها بعد." : "This course does not exist or is not published yet."}
      copyChildren={
        <p style={{ marginTop: 28 }}>
          <Link to="/learning-management-system/catalog" className="action action-primary">
            <span className="btn-content">
              <span>{ar ? "تصفّح الدورات" : "Browse courses"}</span>
            </span>
          </Link>
        </p>
      }
    />
  );
}

function CourseLoadError({ reset }: { reset: () => void }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const router = useRouter();
  return (
    <SubHero
      id="course-error-title"
      eyebrow={lmsT[lang].navCatalog}
      titleSpans={[ar ? "تعذّر تحميل الدورة" : "Couldn't load this course"]}
      titleClassName="course-page-title"
      lede={ar ? "حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى." : "A connection error occurred. Please try again."}
      copyChildren={
        <p style={{ marginTop: 28 }}>
          <button
            type="button"
            className="action action-primary"
            onClick={() => { router.invalidate(); reset(); }}
          >
            <span className="btn-content">
              <span>{ar ? "إعادة المحاولة" : "Retry"}</span>
            </span>
          </button>
        </p>
      }
    />
  );
}

const DAY_LABELS: Record<string, { ar: string; en: string }> = {
  sat: { ar: "السبت", en: "Saturday" }, sun: { ar: "الأحد", en: "Sunday" },
  mon: { ar: "الإثنين", en: "Monday" }, tue: { ar: "الثلاثاء", en: "Tuesday" },
  wed: { ar: "الأربعاء", en: "Wednesday" }, thu: { ar: "الخميس", en: "Thursday" },
  fri: { ar: "الجمعة", en: "Friday" },
};

function CourseDetails() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useLmsAuth();
  const { lang } = useLang();
  const tr = lmsT[lang];
  const ar = lang === "ar";
  const { course, instructor, coInstructors, sections, lessons, hasForm } = Route.useLoaderData() as CourseLoaderData;
  const teaching = useCourseTeachingStatus(course.id, user?.id, authLoading);
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

  useEffect(() => { setFormDialogOpen(false); }, [user?.id, course.id, teaching.status]);

  const requireAuth = async () => {
    // The public page can render before the persisted session has finished
    // hydrating. Verify auth before redirecting so signed-in users do not get
    // bounced to sign-up and immediately redirected back to this page.
    if (user) return true;

    const { data } = await supabase.auth.getUser();
    if (data.user) return true;

    navigate({
      to: "/learning-management-system/signup",
      search: { redirect: `/learning-management-system/courses/${encodeURIComponent(course.slug ?? id)}` },
    });
    return false;
  };

  const onFreeEnroll = async () => {
    setBusy(true);
    try {
      if (await requireAuth()) setFormDialogOpen(true);
    } finally {
      setBusy(false);
    }
  };

  const onManualSubmit = async () => {
    setBusy(true);
    try {
      if (await requireAuth()) setFormDialogOpen(true);
    } finally {
      setBusy(false);
    }
  };

  const title = lang === "ar" ? course.title_ar : course.title_en || course.title_ar;
  const desc = lang === "ar" ? course.description_ar : course.description_en;
  const isFinished = !!course.end_date && new Date(course.end_date) < new Date();

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(ar ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" });
  const days = (course.schedule_days ?? []).map((d) => ar ? DAY_LABELS[d]?.ar : DAY_LABELS[d]?.en).filter(Boolean).join(ar ? "، " : ", ");
  const loc = ar ? (course.location_ar || course.location_en) : (course.location_en || course.location_ar);
  const facts = [
    (course.start_date || course.end_date) && {
      label: ar ? "التاريخ" : "Date",
      value: [course.start_date && fmtDate(course.start_date), course.end_date && fmtDate(course.end_date)].filter(Boolean).join(" — "),
    },
    (course.schedule_time_from || course.schedule_time_to) && {
      label: ar ? "الوقت" : "Time",
      value: `${course.schedule_time_from ?? ""}${course.schedule_time_to ? ` — ${course.schedule_time_to}` : ""}`,
    },
    days && { label: ar ? "الأيام" : "Days", value: days },
    loc && { label: ar ? "المكان" : "Location", value: loc },
    course.duration_hours != null && { label: ar ? "مدة الدورة" : "Duration", value: `${course.duration_hours} ${ar ? "ساعة" : "hours"}` },
  ].filter((f): f is { label: string; value: string } => !!f);

  const enrollPanel = (() => {
    const deadlinePassed = !!course.enrollment_deadline && new Date(course.enrollment_deadline) < new Date();
    const isFull = course.max_students != null && course.students_count >= course.max_students;
    const closed = !course.enrollment_open;
    if (teaching.status === "loading") {
      return (
        <button type="button" className="action action-primary" disabled>
          <span className="btn-content">
            <Loader2 className="h-4 w-4 animate-spin" />
          </span>
        </button>
      );
    }
    if (teaching.status === "error") {
      return (
        <>
          <p className="enroll-hint">{ar ? "تعذّر التحقق من صلاحية التسجيل." : "Could not check enrollment eligibility."}</p>
          <button type="button" className="action action-secondary" onClick={teaching.retry}>
            <span className="btn-content">
              <span>{ar ? "إعادة المحاولة" : "Retry"}</span>
            </span>
          </button>
        </>
      );
    }
    if (teaching.status === "yes") {
      return (
        <>
          <p className="enroll-hint">{ar ? "أنت أحد مدرّسي هذه الدورة، لذلك لا يمكنك التسجيل فيها كطالب." : "You teach this course. You cannot enroll in it as a student."}</p>
          <Link to="/learning-management-system/instructor/courses/$id" params={{ id: course.id }} className="action action-primary">
            <span className="btn-content">
              <span>{ar ? "إدارة الدورة" : "Manage course"}</span>
            </span>
          </Link>
        </>
      );
    }
    if (enrolled) {
      if (course.delivery_mode === "onsite") {
        return (
          <>
            <div className="enroll-note is-open">
              <CheckCircle />
              {ar ? "أنت مسجّل — يتم تتبّع تقدّمك عبر الحضور" : "You're enrolled — progress is tracked via attendance"}
            </div>
            {hasQuiz && (
              <Link
                to="/learning-management-system/student/quiz/$courseId"
                params={{ courseId: course.id }}
                search={{ quiz: undefined, review: undefined }}
                className="action action-secondary"
              >
                <span className="btn-content">
                  <span>{tr.quizzes}</span>
                </span>
              </Link>
            )}
          </>
        );
      }
      return (
        <Link to="/learning-management-system/student/player/$courseId" params={{ courseId: course.id }} className="action action-primary">
          <span className="btn-content">
            <span>{tr.goToCourse}</span>
          </span>
        </Link>
      );
    }
    if (isFinished) {
      return (
        <div className="enroll-note is-open">
          <CheckCircle />
          {tr.courseFinished}
        </div>
      );
    }
    if (pendingRequest) {
      return (
        <div className="enroll-note is-pending">
          <Clock />
          {ar ? "طلبك قيد المراجعة" : "Your request is pending"}
        </div>
      );
    }
    if (closed || deadlinePassed || isFull) {
      return (
        <div className="enroll-note is-closed">
          {isFull
            ? (ar ? "اكتمل العدد" : "Course is full")
            : deadlinePassed
            ? (ar ? "انتهى موعد التسجيل" : "Enrollment deadline passed")
            : (ar ? "التسجيل مغلق حالياً" : "Enrollment is closed")}
        </div>
      );
    }
    const enrollButton = (
      <button type="button" className="action action-primary" onClick={onFreeEnroll} disabled={busy || authLoading}>
        <span className="btn-content">
          {(busy || authLoading) && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>{tr.enroll}</span>
        </span>
      </button>
    );
    if (course.is_free) return enrollButton;
    return (
      <>
        {enrollButton}
        <p className="enroll-hint">
          {ar
            ? "سجّل وعبّئ النموذج. بعد قبولك في الدورة سيتم التواصل معك لترتيب الدفع."
            : "Register and fill the form. Once accepted, we'll contact you to arrange payment."}
        </p>
        {manualOpen && !hasForm && (
          <div className="enroll-notes">
            <Textarea
              placeholder={ar ? "ملاحظات (اختياري)" : "Notes (optional)"}
              value={manualNotes}
              onChange={(e) => setManualNotes(e.target.value)}
              rows={3}
            />
            <button type="button" className="action action-primary" onClick={onManualSubmit} disabled={busy || authLoading}>
              <span className="btn-content">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{ar ? "إرسال" : "Submit"}</span>
              </span>
            </button>
            <button type="button" className="action action-secondary" onClick={() => setManualOpen(false)}>
              <span className="btn-content">
                <span>{ar ? "إلغاء" : "Cancel"}</span>
              </span>
            </button>
          </div>
        )}
      </>
    );
  })();

  const allInstructors = instructor ? [instructor, ...coInstructors] : [];

  return (
    <>
      <SubHero
        id="course-title"
        titleSpans={[title]}
        titleClassName="course-page-title"
        before={
          <nav className="course-crumbs" aria-label={ar ? "أنت هنا" : "You are here"}>
            <Link to="/learning-management-system/catalog">{tr.navCatalog}</Link>
            <span aria-hidden="true">/</span>
            <span>{title}</span>
          </nav>
        }
        copyChildren={
          <>
            <span className="course-tags course-hero-tags">
              <span>{tr[course.level as keyof typeof tr] as string}</span>
              {course.delivery_mode === "online" ? (
                <span>{tr.deliveryOnline}</span>
              ) : course.delivery_mode === "onsite" ? (
                <span>{tr.deliveryOnsite}</span>
              ) : null}
              {isFinished ? <span className="tag-free">{tr.courseFinished}</span> : null}
            </span>
            <p className="course-meta course-hero-meta">
              <span>
                <b>{Number(course.students_count ?? 0)}</b> {tr.students}
              </span>
              <span>
                ★ <b>{Number(course.rating_avg).toFixed(1)}</b>
              </span>
            </p>
          </>
        }
      >
        <div className="course-hero-cover">
          {course.cover_url ? <img src={course.cover_url} alt={title} /> : <IconCategoryAI />}
        </div>
      </SubHero>

      <section className="lms-section" aria-label={title}>
        <div className="page-shell course-layout">
          <div className="course-story">
            {desc ? (
              <article className="pro-card">
                <h2>{ar ? "عن الدورة" : "About this course"}</h2>
                <p className="course-desc">{desc}</p>
              </article>
            ) : null}

            {facts.length > 0 && (
              <article className="pro-card">
                <h2>{ar ? "تفاصيل الدورة" : "Course details"}</h2>
                <dl className="course-facts">
                  {facts.map((f) => (
                    <div key={f.label}>
                      <dt>{f.label}</dt>
                      <dd>{f.value}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            )}

            <article className="pro-card">
              <h2>{tr.syllabus}</h2>
              {sections.length === 0 ? (
                <p className="syllabus-empty">{tr.comingSoon}</p>
              ) : (
                <div className="syllabus">
                  {sections.map((s) => (
                    <div key={s.id} className="syllabus-section">
                      <h3>{s.title}</h3>
                      <ul>
                        {lessons.filter((l) => l.section_id === s.id).map((l) => {
                          const open = enrolled || l.is_preview;
                          return (
                            <li key={l.id} className={open ? "is-open" : undefined}>
                              {open ? <PlayCircle /> : <Lock />}
                              <span className="lesson-title">{l.title}</span>
                              {l.is_preview && !enrolled && (
                                <span className="lesson-preview">{ar ? "معاينة" : "Preview"}</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <div className="pro-card skin-reviews">
              <CourseReviews courseId={course.id} canReview={enrolled} />
            </div>
          </div>

          <aside className="course-side">
            <article className="pro-card">
              <p className="side-label">{ar ? "السعر" : "Price"}</p>
              <div className="course-price">
                <CoursePrice
                  price={Number(course.price)}
                  salePrice={course.sale_price == null ? null : Number(course.sale_price)}
                  isFree={course.is_free}
                  lang={lang}
                  freeLabel={tr.free}
                />
              </div>
              <div className="enroll-actions">{enrollPanel}</div>
            </article>

            {allInstructors.length > 0 && (
              <article className="pro-card">
                <p className="side-label">
                  {allInstructors.length > 1 ? (ar ? "المدرّبون" : "Instructors") : tr.byInstructor}
                </p>
                <ul className="instructor-list">
                  {allInstructors.map((ins) => {
                    const insName = (ar ? ins.full_name_ar : ins.full_name_en) || ins.full_name;
                    const insSpec = (ar ? ins.specialty_ar : ins.specialty_en) || ins.specialty;
                    return (
                      <li key={ins.slug}>
                        <Link to="/learning-management-system/instructors/$id" params={{ id: ins.slug }}>
                          <span className="instructor-avatar">
                            {ins.avatar_url ? <img src={ins.avatar_url} alt={insName} /> : insName.charAt(0)}
                          </span>
                          <span className="instructor-who">
                            <strong>{insName}</strong>
                            {insSpec && <span>{insSpec}</span>}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </article>
            )}
          </aside>
        </div>
      </section>

      <EnrollmentFormDialog
        open={formDialogOpen && teaching.status === "no" && !!user}
        onOpenChange={setFormDialogOpen}
        courseId={course?.id ?? id}
        notes={manualNotes || null}
        onSubmitted={() => { setPendingRequest(true); setManualOpen(false); setManualNotes(""); }}
      />
    </>
  );
}
