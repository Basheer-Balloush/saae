import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  Inbox,
  MessageSquareHeart,
  Newspaper,
  Plus,
  Star,
  UsersRound,
  Briefcase,
  ShieldCheck,
  Globe,
  Mail,
  type LucideIcon,
} from "lucide-react";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useConsoleCounts, type ConsoleCounts } from "@/components/console/useConsoleCounts";
import { LMS_ADMIN } from "@/components/console/nav";
import { Panel, fmtNum, useT } from "@/components/console/ui";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [{ title: "Admin home — SAAE" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminHome,
});

type HubStats = {
  news: number;
  forms: number;
  publishedCourses: number;
  enrollments: number;
  instructors: number;
  amsCourses: number;
  sessionsThisWeek: number;
  registrants: number;
};

async function headCount(q: PromiseLike<{ count: number | null; error: unknown }>) {
  const { count, error } = await q;
  return error ? 0 : (count ?? 0);
}

function useHubStats() {
  return useQuery({
    queryKey: ["admin-hub-stats"],
    staleTime: 60_000,
    queryFn: async (): Promise<HubStats> => {
      const head = { count: "exact" as const, head: true };
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 3);
      const weekEnd = new Date(today);
      weekEnd.setDate(today.getDate() + 4);
      const d = (x: Date) => x.toISOString().slice(0, 10);
      const [
        news,
        forms,
        publishedCourses,
        enrollments,
        instructors,
        amsCourses,
        sessionsThisWeek,
        registrants,
      ] = await Promise.all([
        headCount(supabase.from("news").select("id", head)),
        headCount(supabase.from("dynamic_forms").select("id", head)),
        headCount(supabase.from("lms_courses").select("id", head).eq("status", "published")),
        headCount(supabase.from("lms_enrollments").select("id", head)),
        headCount(supabase.from("lms_instructors").select("user_id", head).eq("approved", true)),
        headCount(supabase.from("ams_courses").select("id", head)),
        headCount(
          supabase
            .from("ams_sessions")
            .select("id", head)
            .gte("session_date", d(weekStart))
            .lte("session_date", d(weekEnd)),
        ),
        headCount(supabase.from("ams_registrants").select("id", head)),
      ]);
      return {
        news,
        forms,
        publishedCourses,
        enrollments,
        instructors,
        amsCourses,
        sessionsThisWeek,
        registrants,
      };
    },
  });
}

type Attention = {
  key: keyof ConsoleCounts;
  ar: string;
  en: string;
  to: string;
  icon: LucideIcon;
  system: "cms" | "lms";
};

const ATTENTION: Attention[] = [
  {
    key: "coursesToReview",
    ar: "دورات بانتظار المراجعة",
    en: "Courses waiting for review",
    to: `${LMS_ADMIN}/requests?tab=courses`,
    icon: BookOpen,
    system: "lms",
  },
  {
    key: "enrollmentRequests",
    ar: "طلبات تسجيل بانتظار القرار",
    en: "Enrollment requests to decide",
    to: `${LMS_ADMIN}/requests?tab=enrollments`,
    icon: Inbox,
    system: "lms",
  },
  {
    key: "trainerApplications",
    ar: "طلبات اعتماد مدرّبين جديدة",
    en: "New instructor accreditation applications",
    to: `${LMS_ADMIN}/requests?tab=instructors`,
    icon: ShieldCheck,
    system: "lms",
  },
  {
    key: "internshipApplications",
    ar: "طلبات تدريب بانتظار المراجعة",
    en: "Internship applications to review",
    to: `${LMS_ADMIN}/requests?tab=internships`,
    icon: Briefcase,
    system: "lms",
  },
  {
    key: "reviewsToModerate",
    ar: "تقييمات بانتظار الاعتماد",
    en: "Reviews to moderate",
    to: `${LMS_ADMIN}/requests?tab=reviews`,
    icon: Star,
    system: "lms",
  },
  {
    key: "newMessages",
    ar: "رسائل تواصل جديدة",
    en: "New contact messages",
    to: "/admin/messages",
    icon: Mail,
    system: "cms",
  },
  {
    key: "newLeads",
    ar: "عملاء محتملون جدد",
    en: "New leads",
    to: "/admin/leads",
    icon: UsersRound,
    system: "cms",
  },
  {
    key: "chatFeedback",
    ar: "ملاحظات محادثة لم تُعالج",
    en: "Unhandled chat feedback",
    to: "/admin/chatbot?tab=feedback",
    icon: MessageSquareHeart,
    system: "cms",
  },
];

function AdminHome() {
  const { t, ar, lang } = useT();
  const { user } = useLmsAuth();
  const { data: counts } = useConsoleCounts(true);
  const { data: stats } = useHubStats();
  const name =
    (user?.user_metadata?.full_name as string | undefined) || user?.email?.split("@")[0] || "";
  const waiting = ATTENTION.filter((a) => (counts?.[a.key] ?? 0) > 0);
  const n = (v: number | undefined) => (stats ? fmtNum(v, lang) : "…");
  const today = new Date().toLocaleDateString(ar ? "ar-SY" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const lmsWaiting = ATTENTION.filter((a) => a.system === "lms").reduce(
    (s, a) => s + (counts?.[a.key] ?? 0),
    0,
  );
  const cmsWaiting = ATTENTION.filter((a) => a.system === "cms").reduce(
    (s, a) => s + (counts?.[a.key] ?? 0),
    0,
  );

  return (
    <div>
      <section
        className="relative mb-6 overflow-hidden rounded-[20px] px-6 py-7 text-white sm:px-8"
        style={{
          background:
            "radial-gradient(90% 140% at 100% 0%, rgba(119,224,232,0.28), transparent 55%), radial-gradient(70% 120% at 0% 100%, rgba(105,143,63,0.35), transparent 60%), linear-gradient(135deg, #06232a 0%, #04171c 100%)",
        }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-6 end-4 h-44 w-40 opacity-[0.13]"
          style={{
            background: "#77e0e8",
            WebkitMask: "url(/cinematic/saae-tree.svg) center / contain no-repeat",
            mask: "url(/cinematic/saae-tree.svg) center / contain no-repeat",
          }}
        />
        <div className="text-[13px] font-semibold text-[#9fd3d7]">{today}</div>
        <h1 className="mt-1 text-[26px] font-extrabold leading-tight sm:text-[30px]">
          {t("أهلاً", "Welcome")}
          {name ? `${ar ? "،" : ","} ${name}` : ""}
        </h1>
        <p className="mt-1.5 max-w-xl text-[14.5px] text-[#c9e3e5]">
          {waiting.length
            ? t(
                `لديك ${waiting.reduce((s, a) => s + (counts?.[a.key] ?? 0), 0)} أمراً بانتظارك. ابدأ من القائمة أدناه.`,
                `${waiting.reduce((s, a) => s + (counts?.[a.key] ?? 0), 0)} things are waiting for you. Start with the list below.`,
              )
            : t(
                "لا شيء بانتظارك الآن. كل شيء محدَّث.",
                "Nothing is waiting for you right now. Everything is up to date.",
              )}
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <SystemCard
          to="/admin/website"
          icon={Globe}
          accent="#698f3f"
          title={t("إدارة الموقع", "Website")}
          desc={t(
            "الأخبار، الأعضاء، الشركاء، النماذج وجهات الاتصال",
            "News, members, partners, forms and contacts",
          )}
          waiting={cmsWaiting}
          stats={[
            {
              label: t("رسالة جديدة", "New messages"),
              value: counts ? fmtNum(counts.newMessages, lang) : "…",
            },
            {
              label: t("عميل جديد", "New leads"),
              value: counts ? fmtNum(counts.newLeads, lang) : "…",
            },
            { label: t("خبر", "News"), value: n(stats?.news) },
          ]}
        />
        <SystemCard
          to={LMS_ADMIN}
          icon={GraduationCap}
          accent="#048090"
          title={t("منصّة التعلّم", "Learning platform")}
          desc={t(
            "الدورات، التسجيل، المدرّبون والطلاب",
            "Courses, enrollments, instructors and students",
          )}
          waiting={lmsWaiting}
          stats={[
            { label: t("دورة منشورة", "Published"), value: n(stats?.publishedCourses) },
            { label: t("تسجيل", "Enrollments"), value: n(stats?.enrollments) },
            { label: t("مدرّب", "Instructors"), value: n(stats?.instructors) },
          ]}
        />
        <SystemCard
          to="/admin/attendance"
          icon={CalendarCheck}
          accent="#f99c00"
          title={t("نظام الحضور", "Attendance")}
          desc={t("الجلسات، المسجّلون وتسجيل الحضور", "Sessions, registrants and attendance")}
          waiting={0}
          stats={[
            { label: t("دورة", "Courses"), value: n(stats?.amsCourses) },
            {
              label: t("جلسة هذا الأسبوع", "Sessions this week"),
              value: n(stats?.sessionsThisWeek),
            },
            { label: t("مسجَّل", "Registrants"), value: n(stats?.registrants) },
          ]}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel
          title={t("بانتظارك", "Needs your attention")}
          description={t(
            "كل ما ينتظر قراراً في الأنظمة الثلاثة",
            "Everything waiting for a decision, across the three systems",
          )}
          flush
        >
          {waiting.length === 0 ? (
            <div className="flex items-center gap-3 px-5 py-6 text-[14px] text-[var(--cx-muted)]">
              <CheckCircle2 className="h-5 w-5 text-[var(--cx-green)]" />
              {t("لا توجد طلبات معلّقة.", "No pending items.")}
            </div>
          ) : (
            <ul>
              {waiting.map((a) => {
                const Icon = a.icon;
                return (
                  <li key={a.key} className="border-b border-[var(--cx-line-2)] last:border-0">
                    <Link
                      to={a.to as never}
                      className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[var(--cx-hover)]"
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--cx-teal-50)] text-[var(--cx-teal)]">
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <span className="flex-1 text-[14.5px] font-bold text-[var(--cx-ink)]">
                        {ar ? a.ar : a.en}
                      </span>
                      <span className="rounded-full bg-[var(--cx-badge)] px-2.5 py-0.5 text-[13px] font-extrabold text-[var(--cx-badge-ink)]">
                        {fmtNum(counts?.[a.key], lang)}
                      </span>
                      <ArrowLeft className="h-4 w-4 text-[var(--cx-muted)] ltr:rotate-180" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title={t("اختصارات", "Quick actions")}>
          <div className="grid gap-2">
            <QuickAction
              to="/admin/news/new"
              icon={Newspaper}
              label={t("خبر جديد", "New news article")}
            />
            <QuickAction
              to={`${LMS_ADMIN}/courses?new=1`}
              icon={Plus}
              label={t("دورة جديدة", "New course")}
            />
            <QuickAction
              to="/admin/forms/new"
              icon={ClipboardList}
              label={t("نموذج جديد", "New form")}
            />
            <QuickAction
              to="/admin/attendance"
              icon={CalendarCheck}
              label={t("تسجيل الحضور", "Take attendance")}
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function SystemCard({
  to,
  icon: Icon,
  accent,
  title,
  desc,
  waiting,
  stats,
}: {
  to: string;
  icon: LucideIcon;
  accent: string;
  title: string;
  desc: string;
  waiting: number;
  stats: { label: string; value: string }[];
}) {
  const { t, lang } = useT();
  return (
    <Link
      to={to as never}
      className="cx-card group flex flex-col p-5 transition-shadow hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="grid h-12 w-12 place-items-center rounded-2xl text-white"
          style={{ background: accent }}
        >
          <Icon className="h-6 w-6" />
        </span>
        {waiting > 0 ? (
          <span className="rounded-full bg-[var(--cx-teal-50)] px-2.5 py-1 text-[12px] font-extrabold text-[var(--cx-teal)]">
            {t(`${fmtNum(waiting, lang)} بانتظارك`, `${fmtNum(waiting, lang)} waiting`)}
          </span>
        ) : (
          <span className="rounded-full bg-[var(--cx-green-50)] px-2.5 py-1 text-[12px] font-bold text-[var(--cx-green)]">
            {t("محدَّث", "Up to date")}
          </span>
        )}
      </div>
      <h2 className="mt-4 text-[18px] font-extrabold text-[var(--cx-ink)]">{title}</h2>
      <p className="mt-1 text-[13.5px] text-[var(--cx-muted)]">{desc}</p>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[var(--cx-line-2)] pt-4">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-[20px] font-extrabold tabular-nums text-[var(--cx-ink)]">
              {s.value}
            </div>
            <div className="text-[12px] text-[var(--cx-muted)]">{s.label}</div>
          </div>
        ))}
      </div>
      <span className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] font-bold text-[var(--cx-teal)]">
        {t("فتح", "Open")}
        <ArrowLeft className="h-4 w-4 transition-transform ltr:rotate-180 group-hover:-translate-x-1 ltr:group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: LucideIcon; label: string }) {
  return (
    <Link
      to={to as never}
      className="flex items-center gap-3 rounded-xl border border-[var(--cx-line)] px-3.5 py-3 text-[14px] font-bold text-[var(--cx-ink)] transition-colors hover:border-[var(--cx-teal)] hover:text-[var(--cx-teal)]"
    >
      <Icon className="h-[18px] w-[18px] text-[var(--cx-teal)]" />
      {label}
    </Link>
  );
}
