import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, PlayCircle, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { Button } from "@/components/ui/button";
import { courseDestination } from "@/lib/lms-course-destination";
import { isCourseEnded } from "@/lib/lms-course-ended";
import { CourseEndedStamp } from "@/components/lms/CourseCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/learning-management-system/student/")({
  head: () => ({ meta: [{ title: "LMS · My Courses" }] }),
  component: StudentHome,
});

type CourseRow = {
  id: string;
  title_ar: string;
  title_en: string | null;
  cover_url: string | null;
  delivery_mode: string | null;
  end_date: string | null;
};
type Row = {
  id: string;
  progress: number;
  course: CourseRow | null;
};
type Cert = { id: string; serial: string; issued_at: string; course_id: string; title?: string };

function StudentHome() {
  const { user } = useLmsAuth();
  const { lang } = useLang();
  const tr = lmsT[lang];
  const [rows, setRows] = useState<Row[]>([]);
  const [certs, setCerts] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: enrolls }, { data: cs }] = await Promise.all([
        supabase
          .from("lms_enrollments")
          .select("id, progress, course_id")
          .eq("student_id", user.id)
          .order("enrolled_at", { ascending: false }),
        supabase
          .from("lms_certificates")
          .select("id,serial,issued_at,course_id")
          .eq("student_id", user.id)
          .order("issued_at", { ascending: false }),
      ]);
      const list = (enrolls as { id: string; progress: number; course_id: string }[] | null) ?? [];
      const certList = (cs as Cert[] | null) ?? [];
      const ids = Array.from(new Set([...list.map((r) => r.course_id), ...certList.map((c) => c.course_id)]));
      let courses: CourseRow[] = [];
      if (ids.length) {
        const { data: csR } = await supabase
          .from("lms_courses")
          .select("id,title_ar,title_en,cover_url,delivery_mode,end_date")
          .in("id", ids);
        courses = (csR as CourseRow[] | null) ?? [];
      }
      setRows(list.map((r) => ({ id: r.id, progress: r.progress, course: courses.find((c) => c.id === r.course_id) ?? null })));
      setCerts(certList.map((c) => ({
        ...c,
        title: (() => {
          const co = courses.find((x) => x.id === c.course_id);
          return co ? (lang === "ar" ? co.title_ar : co.title_en || co.title_ar) : "";
        })(),
      })));
      setLoading(false);
    })();
  }, [user, lang]);

  const avg = rows.length ? Math.round(rows.reduce((s, r) => s + Number(r.progress), 0) / rows.length) : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{tr.welcomeBack}</h1>
          <p className="mt-2 text-muted-foreground">{tr.continueLesson}</p>
        </div>
        <Link to="/learning-management-system/student/requests">
          <Button variant="outline" size="sm">📋 {lang === "ar" ? "طلبات التسجيل" : "My requests"}</Button>
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <Stat value={rows.length} label={tr.enrolledCourses} />
        <Stat value={`${avg}%`} label={tr.avgProgress} />
        <Stat value={rows.filter((r) => Number(r.progress) >= 100).length} label={tr.completed} />
      </div>

      <h2 className="mt-10 text-xl font-bold text-foreground">{tr.myCourses}</h2>
      {loading ? (
        <p className="mt-6 text-muted-foreground">{tr.loading}</p>
      ) : rows.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-muted-foreground">{tr.noEnrollments}</p>
          <Link to="/learning-management-system/catalog">
            <Button className="mt-4">{tr.heroBrowse}</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((r) => r.course && (
            <Link
              key={r.id}
              {...courseDestination(r.course.id, r.course.delivery_mode)}
              className={cn(
                "group rounded-2xl border border-border bg-card overflow-hidden hover:border-primary transition-colors",
                isCourseEnded(r.course) && "course-card-ended",
              )}
            >
              <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                {isCourseEnded(r.course) && <CourseEndedStamp short />}
                {r.course.cover_url ? <img src={r.course.cover_url} alt="" className={cn("w-full h-full object-cover", isCourseEnded(r.course) && "course-card-ended-media")} /> : <PlayCircle className="h-12 w-12 text-primary/50" />}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-foreground line-clamp-1">{lang === "ar" ? r.course.title_ar : r.course.title_en || r.course.title_ar}</h3>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{tr.progress}</span><span>{Math.round(Number(r.progress))}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${Number(r.progress)}%` }} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {certs.length > 0 && (
        <>
          <h2 className="mt-12 text-xl font-bold text-foreground">{tr.certificate}</h2>
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {certs.map((c) => (
              <Link
                key={c.id}
                to="/learning-management-system/certificate/$id"
                params={{ id: c.id }}
                className="group rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10 p-5 hover:border-primary transition-colors"
              >
                <Award className="h-8 w-8 text-primary" />
                <div className="mt-3 font-bold text-foreground line-clamp-2">{c.title}</div>
                <div className="mt-2 text-xs font-mono text-muted-foreground">{c.serial}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {new Date(c.issued_at).toLocaleDateString(lang === "ar" ? "ar" : "en")}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-center">
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
