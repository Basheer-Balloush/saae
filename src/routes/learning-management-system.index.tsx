import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, BookOpen, Award, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/learning-management-system/")({
  head: () => ({
    meta: [
      { title: "Learning Platform — Home" },
      { name: "description", content: "Discover thousands of courses and grow your skills." },
    ],
  }),
  component: LmsHome,
});

type Category = { id: string; name_ar: string; name_en: string | null; slug: string };

function LmsHome() {
  const { lang } = useLang();
  const tr = lmsT[lang];
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState({ courses: 0, students: 0, instructors: 0 });

  useEffect(() => {
    (async () => {
      const { data: cats } = await supabase
        .from("lms_categories")
        .select("id, name_ar, name_en, slug")
        .order("display_order");
      setCategories((cats as Category[]) ?? []);

      const [{ count: cCount }, { count: eCount }, { count: iCount }] = await Promise.all([
        supabase.from("lms_courses").select("*", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("lms_enrollments").select("*", { count: "exact", head: true }),
        supabase.from("lms_instructors").select("*", { count: "exact", head: true }).eq("approved", true),
      ]);
      setStats({ courses: cCount ?? 0, students: eCount ?? 0, instructors: iCount ?? 0 });
    })();
  }, []);

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/10 via-background to-accent/10 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center">
          <h1 className="mt-4 text-3xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
            {tr.heroTitle}
          </h1>
            {tr.heroTitle}
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground">
            {tr.heroSubtitle}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/learning-management-system/catalog">
              <Button size="lg" className="gap-2">
                {tr.heroBrowse} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
            </Link>
            <Link to="/learning-management-system/signup">
              <Button size="lg" variant="outline">{tr.heroBecomeInstructor}</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-b border-border">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 grid grid-cols-3 gap-4 sm:gap-8 text-center">
          <Stat icon={<BookOpen className="h-5 w-5" />} value={stats.courses} label={tr.statCourses} />
          <Stat icon={<Users className="h-5 w-5" />} value={stats.students} label={tr.statStudents} />
          <Stat icon={<Award className="h-5 w-5" />} value={stats.instructors} label={tr.statInstructors} />
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{tr.categories}</h2>
            <Link
              to="/learning-management-system/catalog"
              className="text-sm font-semibold text-primary hover:underline"
            >
              {tr.viewAll}
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {categories.map((c) => (
              <Link
                key={c.id}
                to="/learning-management-system/catalog"
                className="group rounded-2xl border border-border bg-card p-5 text-center transition-all hover:border-primary hover:shadow-soft"
              >
                <div className="mx-auto h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="mt-3 font-semibold text-foreground text-sm">
                  {lang === "ar" ? c.name_ar : c.name_en || c.name_ar}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Coming soon notice */}
      <section className="pb-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
            <h3 className="text-lg font-bold text-foreground">{tr.featuredCourses}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{tr.comingSoon}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
        {icon}
      </div>
      <div className="mt-2 text-2xl sm:text-3xl font-bold text-foreground">{value.toLocaleString()}</div>
      <div className="text-xs sm:text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
