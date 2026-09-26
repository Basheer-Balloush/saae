import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  Award,
  BookOpen,
  Briefcase,
  CheckCircle2,
  GraduationCap,
  Inbox,
  Plus,
  ShieldCheck,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useConsoleCounts, type ConsoleCounts } from "@/components/console/useConsoleCounts";
import { LMS_ADMIN } from "@/components/console/nav";
import {
  EmptyState,
  PageHeader,
  Panel,
  Pill,
  StatTile,
  fmtDate,
  fmtNum,
  useT,
} from "@/components/console/ui";
import { NewCourseDialog } from "@/features/lms-console/NewCourseDialog";

export const Route = createFileRoute("/learning-management-system/admin/")({
  head: () => ({ meta: [{ title: "Learning platform — Admin — SAAE" }] }),
  component: LmsOverview,
});

function useOverview() {
  return useQuery({
    queryKey: ["lms-admin-overview"],
    staleTime: 30_000,
    queryFn: async () => {
      const head = { count: "exact" as const, head: true };
      const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const [
        courses,
        published,
        instructors,
        enrollments,
        newEnrollments,
        certificates,
        top,
        payments,
      ] = await Promise.all([
        supabase.from("lms_courses").select("id", head),
        supabase.from("lms_courses").select("id", head).eq("status", "published"),
        supabase.from("lms_instructors").select("user_id", head).eq("approved", true),
        supabase.from("lms_enrollments").select("id", head),
        supabase.from("lms_enrollments").select("id", head).gte("enrolled_at", monthAgo),
        supabase.from("lms_certificates").select("id", head),
        supabase
          .from("lms_courses")
          .select("id,title_ar,title_en,students_count,rating_avg")
          .order("students_count", { ascending: false })
          .limit(6),
        supabase
          .from("lms_payments")
          .select("id,status,amount,created_at")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);
      return {
        courses: courses.count ?? 0,
        published: published.count ?? 0,
        instructors: instructors.count ?? 0,
        enrollments: enrollments.count ?? 0,
        newEnrollments: newEnrollments.count ?? 0,
        certificates: certificates.count ?? 0,
        top:
          (top.data as {
            id: string;
            title_ar: string;
            title_en: string | null;
            students_count: number;
            rating_avg: number;
          }[]) ?? [],
        payments:
          (payments.data as { id: string; status: string; amount: number; created_at: string }[]) ??
          [],
      };
    },
  });
}

const WAITING: { k: keyof ConsoleCounts; tab: string; icon: LucideIcon; ar: string; en: string }[] =
  [
    {
      k: "enrollmentRequests",
      tab: "enrollments",
      icon: Inbox,
      ar: "طلبات تسجيل",
      en: "Enrollment requests",
    },
    {
      k: "coursesToReview",
      tab: "courses",
      icon: BookOpen,
      ar: "دورات للنشر",
      en: "Courses to publish",
    },
    {
      k: "trainerApplications",
      tab: "instructors",
      icon: ShieldCheck,
      ar: "طلبات اعتماد مدرّبين",
      en: "Instructor accreditation",
    },
    { k: "reviewsToModerate", tab: "reviews", icon: Star, ar: "تقييمات للاعتماد", en: "Reviews" },
    {
      k: "internshipApplications",
      tab: "internships",
      icon: Briefcase,
      ar: "طلبات تدريب",
      en: "Internship applications",
    },
  ];

function LmsOverview() {
  const { t, ar, lang } = useT();
  const { data } = useOverview();
  const { data: counts } = useConsoleCounts(true);
  const [newOpen, setNewOpen] = useState(false);
  const n = (v: number | undefined) => (data ? fmtNum(v, lang) : "…");
  const totalWaiting = WAITING.reduce((s, w) => s + (counts?.[w.k] ?? 0), 0);

  return (
    <div>
      <PageHeader
        eyebrow={t("منصّة التعلّم", "Learning platform")}
        title={t("نظرة عامة", "Overview")}
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/learning-management-system/admin/requests">
                <Inbox className="h-4 w-4" />
                {t("الطلبات", "Requests")}
                {totalWaiting > 0 && (
                  <span className="rounded-full bg-[var(--cx-badge)] px-1.5 text-[11.5px] font-extrabold text-[var(--cx-badge-ink)]">
                    {fmtNum(totalWaiting, lang)}
                  </span>
                )}
              </Link>
            </Button>
            <Button onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4" />
              {t("دورة جديدة", "New course")}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatTile
          icon={BookOpen}
          label={t("دورات منشورة", "Published courses")}
          value={n(data?.published)}
          hint={
            data
              ? t(`من أصل ${fmtNum(data.courses, lang)}`, `of ${fmtNum(data.courses, lang)}`)
              : undefined
          }
          to={`${LMS_ADMIN}/courses`}
        />
        <StatTile
          icon={Users}
          tone="green"
          label={t("كل التسجيلات", "All enrollments")}
          value={n(data?.enrollments)}
          hint={
            data
              ? t(
                  `${fmtNum(data.newEnrollments, lang)} في آخر 30 يوماً`,
                  `${fmtNum(data.newEnrollments, lang)} in the last 30 days`,
                )
              : undefined
          }
        />
        <StatTile
          icon={GraduationCap}
          label={t("مدرّبون معتمَدون", "Approved instructors")}
          value={n(data?.instructors)}
          to={`${LMS_ADMIN}/people`}
        />
        <StatTile
          icon={Award}
          tone="green"
          label={t("شهادات صادرة", "Certificates issued")}
          value={n(data?.certificates)}
        />
        <StatTile
          icon={Inbox}
          tone={totalWaiting ? "teal" : "gray"}
          label={t("بانتظار قرارك", "Waiting for you")}
          value={counts ? fmtNum(totalWaiting, lang) : "…"}
          to={`${LMS_ADMIN}/requests`}
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Panel title={t("بانتظار قرارك", "Waiting for your decision")} flush>
          <ul>
            {WAITING.map((w) => {
              const Icon = w.icon;
              const v = counts?.[w.k] ?? 0;
              return (
                <li key={w.k} className="border-b border-[var(--cx-line-2)] last:border-0">
                  <Link
                    to="/learning-management-system/admin/requests"
                    search={{ tab: w.tab as never }}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--cx-hover)]"
                  >
                    <Icon
                      className={`h-[18px] w-[18px] ${v ? "text-[var(--cx-teal)]" : "text-[var(--cx-muted)]"}`}
                    />
                    <span className="flex-1 text-[14px] font-semibold">{ar ? w.ar : w.en}</span>
                    {v > 0 ? (
                      <span className="rounded-full bg-[var(--cx-badge)] px-2 py-0.5 text-[12px] font-extrabold text-[var(--cx-badge-ink)]">
                        {fmtNum(v, lang)}
                      </span>
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-[var(--cx-green)]" />
                    )}
                    <ArrowLeft className="h-4 w-4 text-[var(--cx-muted)] ltr:rotate-180" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>

        <div className="space-y-5">
          <Panel title={t("الأكثر تسجيلاً", "Most enrolled")} flush>
            {!data?.top.length ? (
              <EmptyState
                compact
                icon={BookOpen}
                title={t("لا توجد دورات بعد", "No courses yet")}
              />
            ) : (
              <ol>
                {data.top.map((c, i) => (
                  <li key={c.id} className="border-b border-[var(--cx-line-2)] last:border-0">
                    <Link
                      to="/learning-management-system/admin/courses/$id"
                      params={{ id: c.id }}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--cx-hover)]"
                    >
                      <span className="w-4 text-[13px] font-extrabold text-[var(--cx-muted)]">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">
                        {ar ? c.title_ar : c.title_en || c.title_ar}
                      </span>
                      <span className="text-[12.5px] text-[var(--cx-muted)]">
                        {fmtNum(c.students_count, lang)} {t("طالب", "students")}
                        {Number(c.rating_avg) > 0 && ` · ★ ${Number(c.rating_avg).toFixed(1)}`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
          {!!data?.payments.length && (
            <Panel title={t("آخر المدفوعات", "Latest payments")} flush>
              <ul>
                {data.payments.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between border-b border-[var(--cx-line-2)] px-5 py-2.5 text-[13.5px] last:border-0"
                  >
                    <span>
                      <Pill
                        tone={p.status === "succeeded" || p.status === "paid" ? "green" : "gray"}
                      >
                        {p.status}
                      </Pill>
                      <span className="ms-2 text-[var(--cx-muted)]">
                        {fmtDate(p.created_at, lang)}
                      </span>
                    </span>
                    <span className="font-bold tabular-nums">{fmtNum(p.amount, lang)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>

      <NewCourseDialog open={newOpen} onOpenChange={setNewOpen} mode="admin" />
    </div>
  );
}
