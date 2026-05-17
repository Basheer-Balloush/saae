import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
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
  const { lang, dir } = useLang();
  const isRtl = dir === "rtl";
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
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/10 via-background to-accent/10 py-32 sm:py-44 lg:py-52 min-h-[80vh] flex items-center">
        {/* Animated blurred background blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-primary/30 blur-3xl animate-blob-1" />
          <div className="absolute top-1/3 -right-32 h-[32rem] w-[32rem] rounded-full bg-accent/30 blur-3xl animate-blob-2" />
          <div className="absolute -bottom-40 left-1/3 h-[26rem] w-[26rem] rounded-full bg-primary/20 blur-3xl animate-blob-3" />
          <div className="absolute top-1/2 left-1/2 h-[18rem] w-[18rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-2xl animate-blob-4" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 text-center w-full">
          <h1 className="mt-4 text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold text-foreground leading-tight tracking-tight">
            {tr.heroTitle}
          </h1>
          <p className="mt-6 max-w-3xl mx-auto text-lg sm:text-xl lg:text-2xl text-muted-foreground">
            {tr.heroSubtitle}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/learning-management-system/catalog">
              <Button size="lg" className="gap-2 h-12 px-7 text-base">
                {tr.heroBrowse} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
            </Link>
            <Link to="/learning-management-system/signup">
              <Button size="lg" variant="outline" className="h-12 px-7 text-base">{tr.heroBecomeInstructor}</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats — Achievements-style */}
      <section className="relative overflow-hidden bg-background py-24 lg:py-32">
        <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
          <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-16">
            {/* Headline column */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-5"
            >
              <h2
                className="mt-4 text-display-1 text-foreground"
                style={{
                  fontFamily: '"Cairo", system-ui, sans-serif',
                  fontWeight: 900,
                  lineHeight: isRtl ? 1.45 : 1.02,
                  letterSpacing: "-0.02em",
                }}
              >
                {lang === "ar" ? "أرقامنا تحكي قصّتنا" : "Our numbers tell our story"}
              </h2>
              <p className="mt-6 max-w-lg text-body text-muted-foreground">
                {lang === "ar"
                  ? "منصة تعليمية متنامية تجمع المتعلّمين والمدرّسين حول محتوى عربي عالي الجودة في الذكاء الاصطناعي وريادة الأعمال."
                  : "A growing learning platform bringing learners and instructors together around high-quality Arabic content in AI and entrepreneurship."}
              </p>
              <div className="mt-8 h-[3px] w-20 bg-gradient-brand" />
            </motion.div>

            {/* Stat grid */}
            <div className="lg:col-span-7">
              <div
                className="grid grid-cols-1 sm:grid-cols-2"
                style={{ columnGap: "32px", rowGap: "40px" }}
              >
                <LmsStatCard
                  value={`+${stats.courses.toLocaleString()}`}
                  label={tr.statCourses}
                  index={0}
                  heightClass="min-h-[260px] lg:min-h-[300px]"
                  isRtl={isRtl}
                />
                <LmsStatCard
                  value={`+${stats.students.toLocaleString()}`}
                  label={tr.statStudents}
                  index={1}
                  heightClass="min-h-[180px] lg:min-h-[200px]"
                  isRtl={isRtl}
                />
                <LmsStatCard
                  value={`+${stats.instructors.toLocaleString()}`}
                  label={tr.statInstructors}
                  index={2}
                  heightClass="min-h-[180px] lg:min-h-[200px] sm:col-span-2"
                  isRtl={isRtl}
                />
              </div>
            </div>
          </div>
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

    </div>
  );
}

function LmsStatCard({
  value,
  label,
  index,
  heightClass,
  isRtl,
}: {
  value: string;
  label: string;
  index: number;
  heightClass: string;
  isRtl: boolean;
}) {
  const PADDING = 28;
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay: index * 0.07 }}
      className={`group relative flex flex-col justify-center overflow-hidden rounded-2xl bg-muted/40 dark:bg-muted/20 ${heightClass}`}
      style={{ padding: `${PADDING}px` }}
    >
      <div className={`flex flex-col ${isRtl ? "items-end text-right" : "items-start text-left"}`}>
        <span
          className="block leading-none"
          style={{
            color: "#048090",
            fontFamily: '"Cairo", system-ui, sans-serif',
            fontWeight: 900,
            letterSpacing: "-0.03em",
            fontSize: "clamp(2.75rem, 5vw, 4rem)",
          }}
        >
          {value}
        </span>
        <span aria-hidden className="mt-5 block h-[2px] w-full" style={{ backgroundColor: "#048090" }} />
        <span
          className="mt-5 block text-muted-foreground"
          style={{
            fontFamily: '"Cairo", system-ui, sans-serif',
            fontWeight: 400,
            fontSize: "14px",
            letterSpacing: "0.01em",
          }}
        >
          {label}
        </span>
      </div>
    </motion.div>
  );
}

