import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  CalendarCheck,
  FilePen,
  MapPin,
  MonitorPlay,
  Plus,
  UserCircle,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { toUserMessage } from "@/lib/safe-error";
import { Button } from "@/components/ui/button";
import { CoursePrice } from "@/components/lms/CoursePrice";
import {
  CourseStatusPill,
  EmptyState,
  ErrorNote,
  Loading,
  PageHeader,
  Pill,
  SearchInput,
  Seg,
  StatTile,
  fmtNum,
  useT,
} from "@/components/console/ui";
import { NewCourseDialog } from "@/features/lms-console/NewCourseDialog";

export const Route = createFileRoute("/learning-management-system/instructor/")({
  head: () => ({ meta: [{ title: "My courses — SAAE Training and Learning Platform" }] }),
  component: InstructorHome,
});

type Course = {
  id: string;
  title_ar: string;
  title_en: string | null;
  status: string;
  cover_url: string | null;
  students_count: number;
  is_free: boolean;
  price: number;
  sale_price: number | null;
  instructor_id: string;
  delivery_mode: string | null;
  ams_courses?: { id: string } | { id: string }[] | null;
};
type Filter = "all" | "published" | "draft" | "pending" | "rejected";

function amsCourseId(c: Course): string | null {
  const a = c.ams_courses;
  if (!a) return null;
  return Array.isArray(a) ? (a[0]?.id ?? null) : a.id;
}

function InstructorHome() {
  const { t, ar, lang } = useT();
  const { user } = useLmsAuth();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [newOpen, setNewOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    setError(false);
    setCourses(null);
    const cols =
      "id,title_ar,title_en,status,cover_url,students_count,is_free,price,sale_price,instructor_id,delivery_mode,ams_courses!ams_courses_lms_course_id_fkey(id)";
    // Courses I own plus the ones I co-teach.
    const { data: ids, error: idError } = await supabase.rpc("lms_my_teaching_course_ids");
    if (idError) {
      toast.error(toUserMessage(idError));
      setError(true);
      return;
    }
    const { data, error: err } = ids?.length
      ? await supabase
          .from("lms_courses")
          .select(cols)
          .in("id", ids)
          .order("created_at", { ascending: false })
      : { data: [], error: null };
    if (err) {
      toast.error(toUserMessage(err));
      setError(true);
    }
    setCourses((data as Course[]) ?? []);
  };
  useEffect(() => {
    load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const counts = useMemo(() => {
    const c = { all: 0, published: 0, draft: 0, pending: 0, rejected: 0, students: 0 };
    for (const x of courses ?? []) {
      c.all++;
      if (x.status in c) c[x.status as Filter]++;
      c.students += Number(x.students_count || 0);
    }
    return c;
  }, [courses]);

  const shown = (courses ?? []).filter(
    (c) =>
      (filter === "all" || c.status === filter) &&
      (!q.trim() ||
        `${c.title_ar} ${c.title_en ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())),
  );
  const title = (c: Course) => (ar ? c.title_ar : c.title_en || c.title_ar);

  return (
    <div>
      <PageHeader
        eyebrow={t("مساحة المدرّب", "Instructor workspace")}
        title={t("دوراتي", "My courses")}
        description={t(
          "أنشئ دوراتك وأدِر محتواها وطلابها وحضورها من مكان واحد.",
          "Create your courses and manage their content, students and attendance in one place.",
        )}
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/learning-management-system/instructor/profile">
                <UserCircle className="h-4 w-4" />
                {t("ملفي الشخصي", "My profile")}
              </Link>
            </Button>
            <Button onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4" />
              {t("دورة جديدة", "New course")}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={BookOpen}
          label={t("كل الدورات", "All courses")}
          value={courses ? fmtNum(counts.all, lang) : "…"}
        />
        <StatTile
          icon={BookOpen}
          tone="green"
          label={t("منشورة", "Published")}
          value={courses ? fmtNum(counts.published, lang) : "…"}
        />
        <StatTile
          icon={FilePen}
          tone="orange"
          label={t("مسودّات وقيد المراجعة", "Drafts & in review")}
          value={courses ? fmtNum(counts.draft + counts.pending, lang) : "…"}
        />
        <StatTile
          icon={Users}
          tone="teal"
          label={t("طلابي", "My students")}
          value={courses ? fmtNum(counts.students, lang) : "…"}
        />
      </div>

      <div className="mb-4 mt-6 flex flex-wrap items-center justify-between gap-3">
        <Seg
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all" as Filter, label: t("الكل", "All"), count: counts.all },
            {
              value: "published" as Filter,
              label: t("منشورة", "Published"),
              count: counts.published,
            },
            { value: "draft" as Filter, label: t("مسودّات", "Drafts"), count: counts.draft },
            {
              value: "pending" as Filter,
              label: t("قيد المراجعة", "In review"),
              count: counts.pending,
            },
            ...(counts.rejected
              ? [
                  {
                    value: "rejected" as Filter,
                    label: t("مرفوضة", "Rejected"),
                    count: counts.rejected,
                  },
                ]
              : []),
          ]}
        />
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder={t("ابحث في دوراتك", "Search your courses")}
        />
      </div>

      {error ? (
        <ErrorNote onRetry={load} />
      ) : courses === null ? (
        <Loading />
      ) : shown.length === 0 ? (
        <div className="cx-card">
          <EmptyState
            icon={BookOpen}
            title={
              courses.length
                ? t("لا توجد دورات مطابقة", "No matching courses")
                : t("لم تنشئ أي دورة بعد", "You haven't created a course yet")
            }
            text={
              courses.length
                ? undefined
                : t(
                    "ابدأ باسم الدورة ووصفها؛ الباقي تضيفه بعد ذلك خطوة بخطوة.",
                    "Start with the course name and description; add the rest step by step afterwards.",
                  )
            }
            action={
              courses.length ? undefined : (
                <Button onClick={() => setNewOpen(true)}>
                  <Plus className="h-4 w-4" />
                  {t("أنشئ دورتك الأولى", "Create your first course")}
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((c) => {
            const onsite = c.delivery_mode !== "online";
            const amsId = amsCourseId(c);
            const coTaught = !!user && c.instructor_id !== user.id;
            return (
              <article key={c.id} className="cx-card flex flex-col overflow-hidden">
                <Link
                  to="/learning-management-system/instructor/courses/$id"
                  params={{ id: c.id }}
                  className="block"
                >
                  {c.cover_url ? (
                    <img
                      src={c.cover_url}
                      alt=""
                      loading="lazy"
                      className="aspect-[16/8] w-full object-cover"
                    />
                  ) : (
                    <div
                      className="grid aspect-[16/8] place-items-center"
                      style={{
                        background:
                          "linear-gradient(135deg, #048090 0%, #0b5560 55%, #698f3f 130%)",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        className="h-14 w-12 bg-white/80"
                        style={{
                          WebkitMask: "url(/cinematic/saae-tree.svg) center / contain no-repeat",
                          mask: "url(/cinematic/saae-tree.svg) center / contain no-repeat",
                        }}
                      />
                    </div>
                  )}
                </Link>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <CourseStatusPill status={c.status} />
                    <Pill tone="teal" icon={onsite ? MapPin : MonitorPlay}>
                      {onsite ? t("حضوري", "In person") : t("أونلاين", "Online")}
                    </Pill>
                    {coTaught && <Pill tone="gray">{t("تدريس مشترك", "Co-taught")}</Pill>}
                  </div>
                  <Link
                    to="/learning-management-system/instructor/courses/$id"
                    params={{ id: c.id }}
                    className="mt-2 line-clamp-2 text-[16px] font-extrabold leading-snug text-[var(--cx-ink)] hover:text-[var(--cx-teal)]"
                  >
                    {title(c)}
                  </Link>
                  <div className="mt-2 flex items-center justify-between text-[13px] text-[var(--cx-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {fmtNum(c.students_count, lang)} {t("طالب", "students")}
                    </span>
                    <CoursePrice
                      price={Number(c.price ?? 0)}
                      salePrice={c.sale_price == null ? null : Number(c.sale_price)}
                      isFree={!!c.is_free}
                      lang={lang}
                      freeLabel={t("مجانية", "Free")}
                      size="sm"
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--cx-line-2)] pt-3">
                    <Button asChild size="sm" className="flex-1">
                      <Link
                        to="/learning-management-system/instructor/courses/$id"
                        params={{ id: c.id }}
                      >
                        {t("إدارة الدورة", "Manage course")}
                      </Link>
                    </Button>
                    {onsite && amsId && (
                      <Button asChild size="sm" variant="outline">
                        <Link
                          to="/learning-management-system/instructor/courses/$id"
                          params={{ id: c.id }}
                          search={{ tab: "attendance" }}
                        >
                          <CalendarCheck className="h-4 w-4" />
                          {t("الحضور", "Attendance")}
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <NewCourseDialog open={newOpen} onOpenChange={setNewOpen} mode="instructor" />
    </div>
  );
}
