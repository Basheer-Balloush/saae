import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bot,
  ClipboardList,
  FileText,
  Handshake,
  Link2,
  Mail,
  MessageSquareHeart,
  Newspaper,
  Plus,
  Sparkles,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { supabase } from "@/integrations/supabase/client";
import { useConsoleCounts } from "@/components/console/useConsoleCounts";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, fmtDate, fmtNum, useT } from "@/components/console/ui";

export const Route = createFileRoute("/admin/website")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [{ title: "Website — Admin — SAAE" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: WebsiteOverview,
});

type Snapshot = {
  messages: { id: string; full_name: string; subject: string; created_at: string }[];
  leads: { id: string; full_name: string; source: string; created_at: string }[];
  feedback: { id: string; message: string; created_at: string }[];
  answers: {
    id: string;
    form_id: string;
    submitted_at: string;
    dynamic_forms: { name_ar: string; name_en: string } | null;
  }[];
  answersWeek: number;
  news: {
    id: string;
    title_ar: string | null;
    title_en: string | null;
    image_url: string | null;
    published_at: string | null;
  }[];
  counts: { news: number; members: number; partners: number; liveForms: number; links: number };
};

async function n(q: PromiseLike<{ count: number | null; error: unknown }>) {
  const { count, error } = await q;
  return error ? 0 : (count ?? 0);
}

function useSnapshot() {
  return useQuery({
    queryKey: ["website-overview"],
    staleTime: 30_000,
    queryFn: async (): Promise<Snapshot> => {
      const head = { count: "exact" as const, head: true };
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const [
        messages,
        leads,
        feedback,
        answers,
        answersWeek,
        news,
        cNews,
        cMembers,
        cPartners,
        cForms,
        cLinks,
      ] = await Promise.all([
        supabase
          .from("contact_messages")
          .select("id, full_name, subject, created_at")
          .eq("status", "new")
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("individual_leads")
          .select("id, full_name, source, created_at")
          .eq("status", "new")
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("chat_feedback")
          .select("id, message, created_at")
          .eq("handled", false)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("dynamic_form_submissions")
          .select("id, form_id, submitted_at, dynamic_forms(name_ar, name_en)")
          .order("submitted_at", { ascending: false })
          .limit(6),
        n(
          supabase.from("dynamic_form_submissions").select("id", head).gte("submitted_at", weekAgo),
        ),
        supabase
          .from("news")
          .select("id, title_ar, title_en, image_url, published_at")
          .order("published_at", { ascending: false })
          .limit(3),
        n(supabase.from("news").select("id", head)),
        n(supabase.from("members").select("id", head)),
        n(supabase.from("partners").select("id", head)),
        n(supabase.from("dynamic_forms").select("id", head).eq("status", "published")),
        n(supabase.from("crm_registration_links").select("id", head).eq("is_active", true)),
      ]);
      return {
        messages: messages.data ?? [],
        leads: leads.data ?? [],
        feedback: feedback.data ?? [],
        answers: (answers.data ?? []) as unknown as Snapshot["answers"],
        answersWeek,
        news: news.data ?? [],
        counts: {
          news: cNews,
          members: cMembers,
          partners: cPartners,
          liveForms: cForms,
          links: cLinks,
        },
      };
    },
  });
}

/* The website at a glance: what came in, what's on the site, and where
   everything lives. */
function WebsiteOverview() {
  const { t, ar, lang } = useT();
  const { data: counts } = useConsoleCounts(true);
  const { data: s } = useSnapshot();
  const dots = "…";

  return (
    <div>
      <PageHeader
        eyebrow={t("إدارة الموقع", "Website")}
        title={t("نظرة عامة", "Overview")}
        description={t(
          "ما وصل من الزوار، وما هو منشور على الموقع الآن.",
          "What visitors sent in, and what is live on the site right now.",
        )}
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/admin/forms/new">
                <ClipboardList className="h-4 w-4" />
                {t("نموذج جديد", "New form")}
              </Link>
            </Button>
            <Button asChild>
              <Link to="/admin/news/$id" params={{ id: "new" }}>
                <Plus className="h-4 w-4" />
                {t("خبر جديد", "Write news")}
              </Link>
            </Button>
          </>
        }
      />

      <h2 className="mb-3 text-[13px] font-extrabold uppercase tracking-[0.08em] text-[var(--cx-muted)]">
        {t("وصل من الزوار", "Came in from visitors")}
      </h2>
      <div className="grid gap-4 lg:grid-cols-3">
        <InboxCard
          to="/admin/messages"
          icon={Mail}
          title={t("رسائل التواصل", "Contact messages")}
          count={counts?.newMessages}
          empty={t("لا رسائل جديدة", "No new messages")}
          items={s?.messages.map((m) => ({
            id: m.id,
            title: m.full_name,
            sub: m.subject,
            at: m.created_at,
          }))}
        />
        <InboxCard
          to="/admin/leads"
          icon={UsersRound}
          title={t("العملاء المحتملون", "Leads")}
          count={counts?.newLeads}
          empty={t("لا عملاء جدد", "No new leads")}
          items={s?.leads.map((l) => ({
            id: l.id,
            title: l.full_name,
            sub: l.source,
            at: l.created_at,
          }))}
        />
        <InboxCard
          to="/admin/chatbot"
          icon={MessageSquareHeart}
          title={t("ملاحظات الزوار", "Visitor feedback")}
          count={counts?.chatFeedback}
          empty={t("لا ملاحظات جديدة", "No new feedback")}
          items={s?.feedback.map((f) => ({ id: f.id, title: f.message, at: f.created_at }))}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel
          title={t("آخر إجابات النماذج", "Latest form answers")}
          description={
            s
              ? t(
                  `${fmtNum(s.answersWeek, lang)} إجابة هذا الأسبوع`,
                  `${fmtNum(s.answersWeek, lang)} answers this week`,
                )
              : undefined
          }
          actions={
            <Link
              to="/admin/forms"
              className="text-[13px] font-bold text-[var(--cx-teal)] hover:underline"
            >
              {t("كل النماذج", "All forms")}
            </Link>
          }
          flush
        >
          {!s ? (
            <p className="px-5 py-6 text-[var(--cx-muted)]">{dots}</p>
          ) : s.answers.length === 0 ? (
            <p className="px-5 py-6 text-[14px] text-[var(--cx-muted)]">
              {t("لا إجابات بعد.", "No answers yet.")}
            </p>
          ) : (
            <ul className="divide-y divide-[var(--cx-line-2)]">
              {s.answers.map((a) => (
                <li key={a.id}>
                  <Link
                    to="/admin/forms/$formId"
                    params={{ formId: a.form_id }}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[var(--cx-hover)]"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--cx-teal-50)] text-[var(--cx-teal)]">
                      <FileText className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-bold">
                      {a.dynamic_forms
                        ? ar
                          ? a.dynamic_forms.name_ar
                          : a.dynamic_forms.name_en
                        : "—"}
                    </span>
                    <span className="shrink-0 text-[12.5px] text-[var(--cx-muted)]">
                      {fmtDate(a.submitted_at, lang, true)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title={t("آخر الأخبار", "Latest news")}
          actions={
            <Link
              to="/admin/news"
              className="text-[13px] font-bold text-[var(--cx-teal)] hover:underline"
            >
              {t("كل الأخبار", "All news")}
            </Link>
          }
          flush
        >
          {!s ? (
            <p className="px-5 py-6 text-[var(--cx-muted)]">{dots}</p>
          ) : (
            <ul className="divide-y divide-[var(--cx-line-2)]">
              {s.news.map((x) => (
                <li key={x.id}>
                  <Link
                    to="/admin/news/$id"
                    params={{ id: x.id }}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[var(--cx-hover)]"
                  >
                    {x.image_url ? (
                      <img
                        src={x.image_url}
                        alt=""
                        loading="lazy"
                        className="h-11 w-16 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="grid h-11 w-16 shrink-0 place-items-center rounded-lg bg-[var(--cx-raise-2)] text-[var(--cx-muted)]">
                        <Newspaper className="h-4 w-4" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-[14px] font-bold" dir="auto">
                        {(ar ? x.title_ar || x.title_en : x.title_en || x.title_ar) ?? "—"}
                      </span>
                      <span className="block text-[12px] text-[var(--cx-muted)]">
                        {fmtDate(x.published_at, lang)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <h2 className="mb-3 mt-8 text-[13px] font-extrabold uppercase tracking-[0.08em] text-[var(--cx-muted)]">
        {t("أين تجد كل شيء", "Where everything lives")}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Place
          to="/admin/news"
          icon={Newspaper}
          title={t("الأخبار", "News")}
          value={s?.counts.news}
          desc={t("مقالات الموقع وصورها وفيديوهاتها", "Site articles with photos and videos")}
        />
        <Place
          to="/admin/members"
          icon={Users}
          title={t("الفريق", "Team")}
          value={s?.counts.members}
          desc={t("مجلس الإدارة والفريق التنفيذي", "Board and executive team")}
        />
        <Place
          to="/admin/partners"
          icon={Handshake}
          title={t("الشركاء", "Partners")}
          value={s?.counts.partners}
          desc={t("شعارات الشركاء وترتيبها", "Partner logos and their order")}
        />
        <Place
          to="/admin/forms"
          icon={ClipboardList}
          title={t("النماذج", "Forms")}
          value={s?.counts.liveForms}
          unit={t("منشور", "live")}
          desc={t("استبيانات وطلبات يعبّئها الزوار", "Surveys and requests visitors fill in")}
        />
        <Place
          to="/admin/crm/registration-links"
          icon={Link2}
          title={t("روابط التسجيل", "Sign-up links")}
          value={s?.counts.links}
          unit={t("فعّال", "active")}
          desc={t("روابط للفعاليات تصب في العملاء المحتملين", "Event links that feed into Leads")}
        />
        <Place
          to="/admin/initiative"
          icon={Sparkles}
          title={t("مبادرة المليون", "Initiative")}
          desc={t("التبرعات والمقاعد وقائمة الانتظار", "Donations, seats and the waiting list")}
        />
        <Place
          to="/admin/chatbot"
          icon={Bot}
          title={t("المساعد الذكي", "Chatbot")}
          desc={t("المحادثات وما يعرفه البوت", "Conversations and what the bot knows")}
        />
        <Place
          to="/admin/messages"
          icon={Mail}
          title={t("رسائل التواصل", "Messages")}
          desc={t("ما يصل من صفحة «تواصل معنا»", "What arrives from the Contact page")}
        />
      </div>
    </div>
  );
}

function InboxCard({
  to,
  icon: Icon,
  title,
  count,
  empty,
  items,
}: {
  to: string;
  icon: LucideIcon;
  title: string;
  count: number | undefined;
  empty: string;
  items: { id: string; title: string; sub?: string; at: string }[] | undefined;
}) {
  const { t, lang } = useT();
  const hot = (count ?? 0) > 0;
  return (
    <Link
      to={to as never}
      className="cx-card group flex flex-col p-5 transition-colors hover:border-[var(--cx-teal-100)]"
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={`grid h-11 w-11 place-items-center rounded-2xl ${hot ? "bg-[var(--cx-teal-50)] text-[var(--cx-teal)]" : "bg-[var(--cx-teal-50)] text-[var(--cx-teal)]"}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <span
          className={`text-[32px] font-extrabold leading-none tabular-nums ${hot ? "text-[var(--cx-teal)]" : "text-[var(--cx-muted)]"}`}
        >
          {count === undefined ? "…" : fmtNum(count, lang)}
        </span>
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className="text-[16px] font-extrabold">{title}</span>
        <span className="text-[12px] font-bold text-[var(--cx-muted)]">
          {hot ? t("جديد", "new") : ""}
        </span>
      </div>
      <ul className="mt-3 flex-1 space-y-2 border-t border-[var(--cx-line-2)] pt-3">
        {items === undefined ? (
          <li className="text-[13px] text-[var(--cx-muted)]">…</li>
        ) : items.length === 0 ? (
          <li className="text-[13px] text-[var(--cx-muted)]">{empty}</li>
        ) : (
          items.map((i) => (
            <li key={i.id} className="flex items-baseline gap-2 text-[13.5px]">
              <span className="min-w-0 flex-1 truncate" dir="auto">
                <b>{i.title}</b>
                {i.sub && <span className="text-[var(--cx-muted)]"> · {i.sub}</span>}
              </span>
              <span className="shrink-0 text-[11.5px] text-[var(--cx-muted)]">
                {fmtDate(i.at, lang)}
              </span>
            </li>
          ))
        )}
      </ul>
      <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-bold text-[var(--cx-teal)]">
        {t("فتح", "Open")}
        <ArrowLeft className="h-4 w-4 transition-transform ltr:rotate-180 group-hover:-translate-x-1 ltr:group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

function Place({
  to,
  icon: Icon,
  title,
  desc,
  value,
  unit,
}: {
  to: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  value?: number;
  unit?: string;
}) {
  const { lang } = useT();
  return (
    <Link
      to={to as never}
      className="cx-card flex items-start gap-3 p-4 transition-colors hover:border-[var(--cx-teal-100)]"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--cx-teal-50)] text-[var(--cx-teal)]">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-extrabold">{title}</span>
          {value !== undefined && (
            <span className="text-[13px] font-bold tabular-nums text-[var(--cx-ink-2)]">
              {fmtNum(value, lang)}
              {unit ? ` ${unit}` : ""}
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-[12.5px] leading-snug text-[var(--cx-muted)]">
          {desc}
        </span>
      </span>
    </Link>
  );
}
