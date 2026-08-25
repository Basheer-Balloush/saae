import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Linkedin, Github, BookOpen, Users, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { CourseCard } from "@/components/lms/CourseCard";

export const Route = createFileRoute("/learning-management-system/instructors/$id")({
  head: () => ({ meta: [{ title: "LMS · Instructor" }] }),
  component: InstructorProfile,
});

type Instructor = {
  slug: string;
  full_name: string;
  full_name_ar: string | null;
  full_name_en: string | null;
  bio: string | null;
  bio_ar: string | null;
  bio_en: string | null;
  specialty: string | null;
  specialty_ar: string | null;
  specialty_en: string | null;
  avatar_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
};
type Course = {
  id: string;
  title_ar: string;
  title_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  cover_url: string | null;
  level: string;
  price: number;
  sale_price: number | null;
  is_free: boolean;
  students_count: number;
  rating_avg: number;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function InstructorProfile() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { lang } = useLang();
  const tr = lmsT[lang];
  const [ins, setIns] = useState<Instructor | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErrored(false);
      const { data, error } = await supabase.rpc("get_public_instructor", { _key: id });
      if (cancelled) return;
      if (error) {
        console.error("get_public_instructor failed", error.message);
        setIns(null);
        setLoading(false);
        setErrored(true);
        return;
      }
      const row = (Array.isArray(data) ? data[0] : null) as Instructor | null;
      if (!row) {
        setIns(null);
        setCourses([]);
        setLoading(false);
        return;
      }
      // Redirect uuid URLs to canonical slug URL
      if (UUID_RE.test(id) && row.slug && row.slug !== id) {
        navigate({ to: "/learning-management-system/instructors/$id", params: { id: row.slug }, replace: true });
        return;
      }
      setIns(row);
      const { data: cs } = await supabase
        .from("lms_courses")
        .select("id,slug,title_ar,title_en,description_ar,description_en,cover_url,level,price,sale_price,is_free,students_count,rating_avg,instructor_id,delivery_mode,end_date")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      // Filter courses on client — we can't expose the instructor's user_id, so
      // rely on the primary-instructor relationship: match by slug via a second RPC pass
      // is unnecessary because published courses already carry the assignment; here we
      // just show any published course whose primary instructor matches this slug.
      // Use the public course-instructors RPC to check membership per course.
      const filtered: Course[] = [];
      for (const c of ((cs ?? []) as (Course & { instructor_id: string })[])) {
        const { data: list } = await supabase.rpc("get_public_instructors_for_course", { _course_id: c.id });
        const hit = (list as { slug: string }[] | null)?.some((x) => x.slug === row.slug);
        if (hit) filtered.push(c);
      }
      setCourses(filtered);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id, navigate]);

  if (loading) return <p className="text-center py-20 text-muted-foreground">{tr.loading}</p>;
  if (errored) return <p className="text-center py-20 text-muted-foreground">{lang === "ar" ? "تعذّر تحميل الملف. حاول مجدداً." : "Could not load profile. Please try again."}</p>;
  if (!ins) return <p className="text-center py-20 text-muted-foreground">404</p>;

  const totalStudents = courses.reduce((s, c) => s + Number(c.students_count ?? 0), 0);
  const avgRating = courses.length
    ? (courses.reduce((s, c) => s + Number(c.rating_avg), 0) / courses.length).toFixed(1)
    : "0.0";

  const name = (lang === "ar" ? ins.full_name_ar : ins.full_name_en) || ins.full_name;
  const sp = (lang === "ar" ? ins.specialty_ar : ins.specialty_en) || ins.specialty;
  const bio = (lang === "ar" ? ins.bio_ar : ins.bio_en) || ins.bio;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/5 to-accent/5 p-6 sm:p-10">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          {ins.avatar_url ? (
            <img src={ins.avatar_url} alt={name} className="h-24 w-24 sm:h-32 sm:w-32 rounded-2xl object-cover" />
          ) : (
            <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-3xl font-bold" aria-hidden="true">
              {(name ?? "?").charAt(0)}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{name}</h1>
            {sp && <p className="mt-1 text-primary font-semibold">{sp}</p>}
            {bio && <p className="mt-3 text-muted-foreground leading-relaxed">{bio}</p>}
            <div className="mt-4 flex flex-wrap gap-3">
              {ins.linkedin_url && (
                <a href={ins.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:border-primary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                </a>
              )}
              {ins.github_url && (
                <a href={ins.github_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:border-primary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <Github className="h-3.5 w-3.5" /> GitHub
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
          <Stat icon={<BookOpen className="h-4 w-4" />} value={courses.length} label={tr.navCatalog} />
          <Stat icon={<Users className="h-4 w-4" />} value={totalStudents} label={tr.students} />
          <Stat icon={<Star className="h-4 w-4 fill-amber-400 text-amber-400" />} value={avgRating} label={tr.reviews} />
        </div>
      </div>

      <h2 className="mt-10 text-xl font-bold text-foreground">{tr.featuredCourses}</h2>
      {courses.length === 0 ? (
        <p className="mt-4 text-muted-foreground">{tr.noCourses}</p>
      ) : (
        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => (
            <Link key={c.id} to="/learning-management-system/courses/$id" params={{ id: (c as { slug?: string | null }).slug ?? c.id }}>
              <CourseCard course={c} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number | string; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">{icon}{label}</div>
      <div className="mt-1 text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}
