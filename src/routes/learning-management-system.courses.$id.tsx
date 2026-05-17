import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, Users, Star, PlayCircle, Loader2, Lock, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CourseReviews } from "@/components/lms/CourseReviews";

export const Route = createFileRoute("/learning-management-system/courses/$id")({
  head: () => ({ meta: [{ title: "LMS · Course" }] }),
  component: CourseDetails,
});

type Course = {
  id: string; title_ar: string; title_en: string | null;
  description_ar: string | null; description_en: string | null;
  cover_url: string | null; level: string; price: number; is_free: boolean;
  students_count: number; rating_avg: number; instructor_id: string;
};
type Section = { id: string; title: string; display_order: number };
type Lesson = { id: string; section_id: string; title: string; duration_seconds: number; is_preview: boolean; display_order: number };
type Instructor = { user_id: string; full_name: string; avatar_url: string | null; bio: string | null };

function CourseDetails() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useLmsAuth();
  const { lang } = useLang();
  const tr = lmsT[lang];
  const [course, setCourse] = useState<Course | null>(null);
  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase.from("lms_courses").select("*").eq("id", id).maybeSingle();
      setCourse(c as Course | null);
      if (c) {
        const [{ data: ins }, { data: secs }] = await Promise.all([
          supabase.from("lms_instructors").select("user_id,full_name,avatar_url,bio").eq("user_id", c.instructor_id).maybeSingle(),
          supabase.from("lms_sections").select("id,title,display_order").eq("course_id", id).order("display_order"),
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
        if (user) {
          const [{ data: e }, { data: w }] = await Promise.all([
            supabase.from("lms_enrollments").select("id").eq("course_id", id).eq("student_id", user.id).maybeSingle(),
            supabase.from("lms_wallets").select("balance").eq("user_id", user.id).maybeSingle(),
          ]);
          setEnrolled(!!e);
          setBalance(w ? Number((w as { balance: number }).balance) : 0);
        }
      }
      setLoading(false);
    })();
  }, [id, user]);

  const onEnroll = async () => {
    if (!user) {
      navigate({ to: "/learning-management-system/login" });
      return;
    }
    setEnrolling(true);
    try {
      const { error } = await supabase.rpc("lms_checkout", { _course_id: id, _coupon: coupon || undefined });
      if (error) throw error;
      setEnrolled(true);
      toast.success(tr.enrollmentSuccess);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : tr.authFailed);
    } finally {
      setEnrolling(false);
    }
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
          {enrolled ? (
            <Link to="/learning-management-system/student/player/$courseId" params={{ courseId: course.id }}>
              <Button className="w-full mt-4" size="lg">{tr.goToCourse}</Button>
            </Link>
          ) : (
            <>
              {!course.is_free && user && (
                <>
                  <Input
                    placeholder={lang === "ar" ? "كود خصم (اختياري)" : "Coupon code (optional)"}
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                    className="mt-4"
                  />
                  {balance !== null && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Wallet className="h-3.5 w-3.5" />
                      {lang === "ar" ? "رصيدك:" : "Your balance:"}{" "}
                      <span dir="ltr" className="inline-flex flex-row items-center gap-1 font-semibold text-foreground">
                        {lang === "ar" ? (
                          <>
                            <span dir="rtl">ل.س</span>
                            <span>{balance.toLocaleString()}</span>
                          </>
                        ) : (
                          <>
                            <span>{balance.toLocaleString()}</span>
                            <span>SYP</span>
                          </>
                        )}
                      </span>
                      {balance < Number(course.price) && (
                        <Link to="/learning-management-system/student/wallet" className="text-primary underline mx-1">
                          {lang === "ar" ? "اشحن" : "Top up"}
                        </Link>
                      )}
                    </div>
                  )}
                </>
              )}
              <Button className="w-full mt-4" size="lg" onClick={onEnroll} disabled={enrolling}>
                {enrolling && <Loader2 className="h-4 w-4 animate-spin mx-2" />}
                {enrolling ? tr.enrolling : (course.is_free ? tr.enroll : (lang === "ar" ? "سجّل الآن" : "Register now"))}
              </Button>
            </>
          )}
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
                  {instructor.bio && <div className="text-xs text-muted-foreground line-clamp-2">{instructor.bio}</div>}
                </div>
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
