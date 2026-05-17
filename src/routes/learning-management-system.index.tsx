import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import {
  ArrowRight,
  BookOpen,
  Code2,
  Brain,
  Briefcase,
  Palette,
  LineChart,
  Megaphone,
  Camera,
  Languages,
  Music,
  HeartPulse,
  Cpu,
  Database,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { Button } from "@/components/ui/button";

// Icon mapping for category slugs (fallback: BookOpen)
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  programming: Code2,
  development: Code2,
  "web-development": Code2,
  ai: Brain,
  "artificial-intelligence": Brain,
  "machine-learning": Brain,
  "data-science": Database,
  data: Database,
  business: Briefcase,
  entrepreneurship: Briefcase,
  design: Palette,
  "ui-ux": Palette,
  marketing: Megaphone,
  finance: LineChart,
  photography: Camera,
  languages: Languages,
  music: Music,
  health: HeartPulse,
  technology: Cpu,
};

// Category card surfaces — cycled by category index
const CATEGORY_SURFACES = [
  "var(--category-card-1)",
  "var(--category-card-2)",
  "var(--category-card-3)",
  "var(--category-card-4)",
  "var(--category-card-5)",
  "var(--category-card-6)",
];

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
  const navigate = useNavigate();
  const { user, role } = useLmsAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState({ courses: 0, students: 0, instructors: 0 });
  const [coursesByCategory, setCoursesByCategory] = useState<Record<string, number>>({});
  const [applying, setApplying] = useState(false);

  const handleBecomeInstructor = async () => {
    if (!user) {
      navigate({ to: "/learning-management-system/signup" });
      return;
    }
    if (role === "lms_instructor" || role === "lms_admin") {
      navigate({ to: "/learning-management-system/instructor" });
      return;
    }
    setApplying(true);
    try {
      const { data: existing } = await supabase
        .from("lms_instructors")
        .select("approved")
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing) {
        toast.info(lang === "ar" ? "طلبك قيد المراجعة" : "Your application is under review");
      } else {
        const fullName = (user.user_metadata?.full_name as string) || user.email || "";
        const { error } = await supabase
          .from("lms_instructors")
          .insert({ user_id: user.id, full_name: fullName, approved: false });
        if (error) throw error;
        toast.success(
          lang === "ar"
            ? "تم استلام طلبك — قيد المراجعة من قبل الإدارة"
            : "Application received — pending admin review",
        );
      }
    } catch {
      toast.error(lang === "ar" ? "تعذّر إرسال الطلب" : "Could not submit application");
    } finally {
      setApplying(false);
    }
  };

  useEffect(() => {
    (async () => {
      const { data: cats } = await supabase
        .from("lms_categories")
        .select("id, name_ar, name_en, slug")
        .order("display_order");
      setCategories((cats as Category[]) ?? []);

      const [{ count: cCount }, { count: eCount }, { count: iCount }, { data: courseRows }] =
        await Promise.all([
          supabase
            .from("lms_courses")
            .select("*", { count: "exact", head: true })
            .eq("status", "published"),
          supabase.from("lms_enrollments").select("*", { count: "exact", head: true }),
          supabase
            .from("lms_instructors")
            .select("*", { count: "exact", head: true })
            .eq("approved", true),
          supabase.from("lms_courses").select("category_id").eq("status", "published"),
        ]);
      setStats({ courses: cCount ?? 0, students: eCount ?? 0, instructors: iCount ?? 0 });

      const counts: Record<string, number> = {};
      ((courseRows as { category_id: string | null }[]) ?? []).forEach((r) => {
        if (r.category_id) counts[r.category_id] = (counts[r.category_id] ?? 0) + 1;
      });
      setCoursesByCategory(counts);
    })();
  }, []);

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/10 via-background to-accent/10 py-20 sm:py-28 lg:py-36 min-h-[60vh] flex items-center">
        {/* Animated blurred background blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-primary/30 blur-3xl animate-blob-1" />
          <div className="absolute top-1/3 -right-32 h-[32rem] w-[32rem] rounded-full bg-accent/30 blur-3xl animate-blob-2" />
          <div className="absolute -bottom-40 left-1/3 h-[26rem] w-[26rem] rounded-full bg-primary/20 blur-3xl animate-blob-3" />
          <div className="absolute top-1/2 left-1/2 h-[18rem] w-[18rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-2xl animate-blob-4" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 text-center w-full">
          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight tracking-tight">
            {tr.heroTitle}
          </h1>
          <p className="mt-6 max-w-3xl mx-auto text-base sm:text-lg lg:text-xl text-muted-foreground">
            {tr.heroSubtitle}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/learning-management-system/catalog">
              <Button size="lg" className="gap-2 h-12 px-7 text-base">
                {tr.heroBrowse} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
            </Link>
            <Link to="/learning-management-system/signup">
              <Button size="lg" variant="outline" className="h-12 px-7 text-base">
                {tr.heroBecomeInstructor}
              </Button>
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

      {/* Categories — large gradient cards */}
      <section className="py-16 sm:py-24 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                {tr.categories}
              </h2>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground">
                {lang === "ar"
                  ? "اختر مجالك وابدأ رحلتك التعليميّة"
                  : "Pick your field and start your learning journey"}
              </p>
            </div>
            <Link
              to="/learning-management-system/catalog"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              {tr.viewAll}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {categories.map((c, i) => {
              const Icon = CATEGORY_ICONS[c.slug] ?? BookOpen;
              const surface = CATEGORY_SURFACES[i % CATEGORY_SURFACES.length];
              const count = coursesByCategory[c.id] ?? 0;
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: (i % 6) * 0.06 }}
                >
                  <Link
                    to="/learning-management-system/catalog"
                    className="group relative block overflow-hidden rounded-3xl border border-white/20 min-h-[200px] sm:min-h-[220px] p-6 sm:p-7 shadow-lift transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                    style={{ background: surface }}
                  >
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.24)_0%,rgba(255,255,255,0.05)_38%,rgba(0,0,0,0.16)_100%)]"
                    />
                    <div
                      aria-hidden
                      className={`absolute -top-10 ${isRtl ? "-left-10" : "-right-10"} h-40 w-40 rounded-full bg-white/18 blur-3xl transition-opacity group-hover:opacity-70`}
                    />
                    <div className="relative flex h-full flex-col justify-between">
                      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/25 backdrop-blur-sm text-white shadow-inner ring-1 ring-white/30">
                        <Icon className="h-7 w-7" strokeWidth={1.75} />
                      </div>
                      <div className="mt-8">
                        <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight drop-shadow-sm">
                          {lang === "ar" ? c.name_ar : c.name_en || c.name_ar}
                        </h3>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-white/90">
                            <BookOpen className="h-3.5 w-3.5" />
                            {count} {lang === "ar" ? "دورة" : count === 1 ? "course" : "courses"}
                          </span>
                          <ArrowRight
                            className={`h-5 w-5 text-white transition-transform duration-300 ${
                              isRtl
                                ? "-scale-x-100 group-hover:-translate-x-1"
                                : "group-hover:translate-x-1"
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
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
        <span
          aria-hidden
          className="mt-5 block h-[2px] w-full"
          style={{ backgroundColor: "#048090" }}
        />
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
