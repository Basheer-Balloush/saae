import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  Bot,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mail,
  MessageSquare,
  MessageSquareHeart,
  Plus,
  RotateCcw,
  Trash2,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { toUserMessage } from "@/lib/safe-error";
import {
  addKnowledgeText,
  deleteChatFeedback,
  deleteConversation,
  deleteKnowledgeDocument,
  deleteVisitorProfile,
  getChatStats,
  getConversationMessages,
  listChatFeedback,
  listConversations,
  listKnowledgeDocuments,
  listVisitorProfiles,
  setChatFeedbackHandled,
  type VisitorProfile,
} from "@/lib/admin-chat.functions";
import { FEEDBACK_CATEGORIES, feedbackCategoryLabel } from "@/lib/chat-feedback";
import { confirmDialog } from "@/hooks/useConfirm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  EmptyState,
  Field,
  Loading,
  PageHeader,
  Panel,
  Pill,
  Seg,
  fmtDate,
  fmtNum,
  useT,
} from "@/components/console/ui";
import { CONSOLE_COUNTS_KEY } from "@/components/console/useConsoleCounts";

type Stream = "feedback" | "profiles" | "conversations" | "knowledge";
const STREAMS: Stream[] = ["feedback", "profiles", "conversations", "knowledge"];

export const Route = createFileRoute("/admin/chatbot")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [{ title: "Chatbot — Admin — SAAE" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  validateSearch: (s: Record<string, unknown>): { tab?: Stream } => ({
    tab: STREAMS.includes(s.tab as Stream) ? (s.tab as Stream) : undefined,
  }),
  component: ChatbotPage,
});

type Feedback = {
  id: string;
  session_id: string | null;
  category: string;
  name: string | null;
  email: string | null;
  message: string;
  lang: string | null;
  handled: boolean;
  created_at: string;
};
type Conversation = {
  id: string;
  session_id: string;
  lang: string | null;
  message_count: number;
  started_at: string;
  last_message_at: string;
};
type Message = { id: string; role: string; content: string; created_at: string };
type Doc = {
  id: string;
  title: string;
  source_type: string;
  status: string;
  error_message: string | null;
  chunk_count: number;
  created_at: string;
};
type Stats = Awaited<ReturnType<typeof getChatStats>>;
type SetRows<R> = (fn: (p: R[] | null) => R[] | null) => void;

/* Everything the site's assistant touches: what visitors told us, who it
   qualified, the raw conversations, and what it knows. */
function ChatbotPage() {
  const { t, lang } = useT();
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const qc = useQueryClient();

  const statsFn = useServerFn(getChatStats);
  const feedbackFn = useServerFn(listChatFeedback);
  const profilesFn = useServerFn(listVisitorProfiles);
  const convsFn = useServerFn(listConversations);
  const docsFn = useServerFn(listKnowledgeDocuments);

  const [stats, setStats] = useState<Stats | null>(null);
  const [feedback, setFeedback] = useState<Feedback[] | null>(null);
  const [profiles, setProfiles] = useState<VisitorProfile[] | null>(null);
  const [convs, setConvs] = useState<Conversation[] | null>(null);
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);

  const loadDocs = useCallback(
    () =>
      docsFn()
        .then((r) => setDocs(r.documents as Doc[]))
        .catch((e) => {
          toast.error(toUserMessage(e));
          setDocs([]);
        }),
    [docsFn],
  );

  useEffect(() => {
    statsFn()
      .then(setStats)
      .catch(() => {});
    feedbackFn({ data: { category: "all" } })
      .then((r) => setFeedback(r.feedback as Feedback[]))
      .catch((e) => {
        toast.error(toUserMessage(e));
        setFeedback([]);
      });
    profilesFn()
      .then((r) => setProfiles(r.profiles))
      .catch(() => setProfiles([]));
    convsFn()
      .then((r) => setConvs(r.conversations as Conversation[]))
      .catch(() => setConvs([]));
    loadDocs();
  }, [statsFn, feedbackFn, profilesFn, convsFn, loadDocs]);

  const newFeedback = (feedback ?? []).filter((f) => !f.handled).length;
  const active: Stream = tab ?? "feedback";
  const go = (s: Stream) =>
    navigate({ search: { tab: s === "feedback" ? undefined : s }, replace: true });
  const convBySession = useMemo(
    () => new Map((convs ?? []).map((c) => [c.session_id, c.id])),
    [convs],
  );

  const tiles: {
    key: Stream;
    icon: LucideIcon;
    label: string;
    value: number | null;
    hint: string;
    alert?: boolean;
  }[] = [
    {
      key: "feedback",
      icon: MessageSquareHeart,
      label: t("ملاحظات الزوار", "Visitor feedback"),
      value: feedback ? newFeedback : null,
      hint: t("جديدة بانتظار المعالجة", "new, waiting to be handled"),
      alert: newFeedback > 0,
    },
    {
      key: "profiles",
      icon: UserRound,
      label: t("ملفات الزوار", "Visitor profiles"),
      value: profiles?.length ?? null,
      hint: t("زوار عرّفوا بأنفسهم وبحاجتهم", "visitors who said who they are and what they need"),
    },
    {
      key: "conversations",
      icon: MessageSquare,
      label: t("المحادثات", "Conversations"),
      value: stats?.conversationsTotal ?? convs?.length ?? null,
      hint: stats
        ? t(
            `${fmtNum(stats.conversations7d, lang)} هذا الأسبوع`,
            `${fmtNum(stats.conversations7d, lang)} this week`,
          )
        : "",
    },
    {
      key: "knowledge",
      icon: BookOpen,
      label: t("ما يعرفه البوت", "What the bot knows"),
      value: docs?.length ?? null,
      hint: t("نصوص يعتمد عليها في إجاباته", "texts it relies on to answer"),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={t("إدارة الموقع", "Website")}
        title={t("المساعد الذكي", "Chatbot")}
        description={t(
          "ما قاله الزوار للمساعد على الموقع، ومن أحالهم إليكم، وما يعرفه.",
          "What visitors told the site's assistant, who it passed on to you, and what it knows.",
        )}
        meta={
          stats && (
            <span className="text-[13px] text-[var(--cx-muted)]">
              {t(
                `${fmtNum(stats.messagesTotal, lang)} رسالة · ${fmtNum(stats.conversations30d, lang)} محادثة في 30 يوماً · ${fmtNum(stats.individualLeads + stats.companyLeads, lang)} عميل محتمل`,
                `${fmtNum(stats.messagesTotal, lang)} messages · ${fmtNum(stats.conversations30d, lang)} conversations in 30 days · ${fmtNum(stats.individualLeads + stats.companyLeads, lang)} leads`,
              )}
            </span>
          )
        }
      />

      <div className="-mx-1 mb-6 flex snap-x gap-3 overflow-x-auto px-1 pb-1 md:grid md:grid-cols-4 md:overflow-visible">
        {tiles.map((x) => (
          <button
            key={x.key}
            type="button"
            onClick={() => go(x.key)}
            data-active={active === x.key}
            aria-pressed={active === x.key}
            className="cx-card min-w-[210px] snap-start p-4 text-start transition-all hover:border-[var(--cx-teal-100)] data-[active=true]:border-[var(--cx-teal)] data-[active=true]:shadow-[0_0_0_3px_var(--cx-teal-50),0_18px_40px_-20px_rgba(119,224,232,0.45)]"
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={`grid h-10 w-10 place-items-center rounded-xl ${x.alert ? "bg-[var(--cx-teal-50)] text-[var(--cx-teal)]" : "bg-[var(--cx-teal-50)] text-[var(--cx-teal)]"}`}
              >
                <x.icon className="h-5 w-5" />
              </span>
              <span
                className={`text-[28px] font-extrabold leading-none tabular-nums ${x.alert ? "text-[var(--cx-teal)]" : ""}`}
              >
                {x.value === null ? "·" : fmtNum(x.value, lang)}
              </span>
            </div>
            <div className="mt-3 font-extrabold">{x.label}</div>
            <div className="text-[12.5px] text-[var(--cx-muted)]">{x.hint}</div>
          </button>
        ))}
      </div>

      {active === "feedback" && (
        <FeedbackStream
          rows={feedback}
          setRows={setFeedback}
          onChanged={() => qc.invalidateQueries({ queryKey: CONSOLE_COUNTS_KEY })}
          chatFor={(sid) => (sid ? (convBySession.get(sid) ?? null) : null)}
          onChat={setTranscript}
        />
      )}
      {active === "profiles" && (
        <ProfilesStream rows={profiles} setRows={setProfiles} onChat={setTranscript} />
      )}
      {active === "conversations" && <ConversationsStream rows={convs} setRows={setConvs} />}
      {active === "knowledge" && (
        <KnowledgeStream rows={docs} setRows={setDocs} reload={loadDocs} />
      )}

      <Sheet open={!!transcript} onOpenChange={(v) => !v && setTranscript(null)}>
        <SheetContent
          side={lang === "ar" ? "left" : "right"}
          className="w-full overflow-y-auto sm:max-w-xl"
          dir={lang === "ar" ? "rtl" : "ltr"}
        >
          <SheetHeader className="mb-4 text-start">
            <SheetTitle>{t("المحادثة", "Conversation")}</SheetTitle>
          </SheetHeader>
          {transcript && <Transcript id={transcript} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ---------- Feedback ---------- */

function FeedbackStream({
  rows,
  setRows,
  onChanged,
  chatFor,
  onChat,
}: {
  rows: Feedback[] | null;
  setRows: SetRows<Feedback>;
  onChanged: () => void;
  chatFor: (sessionId: string | null) => string | null;
  onChat: (conversationId: string) => void;
}) {
  const { t, lang } = useT();
  const labels = feedbackCategoryLabel[lang];
  const handledFn = useServerFn(setChatFeedbackHandled);
  const deleteFn = useServerFn(deleteChatFeedback);
  const [show, setShow] = useState<"new" | "handled" | "all">("new");
  const [cat, setCat] = useState<string>("all");
  const [busy, setBusy] = useState<string | null>(null);

  const toggle = async (r: Feedback) => {
    setBusy(r.id);
    try {
      await handledFn({ data: { id: r.id, handled: !r.handled } });
      setRows((p) => (p ?? []).map((x) => (x.id === r.id ? { ...x, handled: !r.handled } : x)));
      toast.success(
        r.handled ? t("أُعيدت كجديدة", "Marked as new") : t("تمت المعالجة", "Marked handled"),
      );
      onChanged();
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setBusy(null);
    }
  };
  const remove = async (r: Feedback) => {
    const ok = await confirmDialog({
      title: t("حذف هذه الملاحظة؟", "Delete this feedback?"),
      description: t("لا يمكن التراجع.", "This cannot be undone."),
      confirmLabel: t("حذف", "Delete"),
      destructive: true,
    });
    if (!ok) return;
    setBusy(r.id);
    try {
      await deleteFn({ data: { id: r.id } });
      setRows((p) => (p ?? []).filter((x) => x.id !== r.id));
      toast.success(t("حُذفت", "Deleted"));
      onChanged();
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const all = rows ?? [];
  const shown = all.filter(
    (r) =>
      (show === "all" || (show === "new" ? !r.handled : r.handled)) &&
      (cat === "all" || r.category === cat),
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Seg
          value={show}
          onChange={setShow}
          options={[
            { value: "new", label: t("جديدة", "New"), count: all.filter((r) => !r.handled).length },
            { value: "handled", label: t("تمت معالجتها", "Handled") },
            { value: "all", label: t("الكل", "All") },
          ]}
        />
        <select
          className="h-10 rounded-[10px] border border-[var(--cx-line)] bg-[var(--cx-field)] px-3 text-[14px]"
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          aria-label={t("التصنيف", "Category")}
        >
          <option value="all">{t("كل التصنيفات", "All categories")}</option>
          {FEEDBACK_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {labels[c]}
            </option>
          ))}
        </select>
      </div>
      {rows === null ? (
        <Loading />
      ) : shown.length === 0 ? (
        <Panel>
          <EmptyState
            icon={CheckCircle2}
            title={
              show === "new"
                ? t("لا ملاحظات جديدة. كل شيء معالج.", "No new feedback. All handled.")
                : t("لا شيء هنا", "Nothing here")
            }
          />
        </Panel>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {shown.map((r) => {
            const chat = chatFor(r.session_id);
            return (
              <article
                key={r.id}
                className={`cx-card flex flex-col p-4 ${r.handled ? "opacity-75" : ""}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Pill
                    tone={
                      r.category === "complaint" || r.category === "bug"
                        ? "red"
                        : r.category === "praise"
                          ? "green"
                          : "teal"
                    }
                  >
                    {labels[r.category] ?? r.category}
                  </Pill>
                  {r.handled && <Pill tone="gray">{t("تمت المعالجة", "Handled")}</Pill>}
                  <span className="ms-auto text-[12px] text-[var(--cx-muted)]">
                    {fmtDate(r.created_at, lang, true)}
                  </span>
                </div>
                <p
                  className="mt-3 flex-1 whitespace-pre-wrap text-[14.5px] leading-relaxed"
                  dir="auto"
                >
                  {r.message}
                </p>
                {(r.name || r.email) && (
                  <div className="mt-3 text-[13px] text-[var(--cx-ink-2)]">
                    {r.name}
                    {r.email && (
                      <span className="text-[var(--cx-muted)]" dir="ltr">
                        {r.name ? " · " : ""}
                        {r.email}
                      </span>
                    )}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--cx-line-2)] pt-3">
                  <Button
                    size="sm"
                    variant={r.handled ? "outline" : "default"}
                    disabled={busy === r.id}
                    onClick={() => toggle(r)}
                  >
                    {r.handled ? (
                      <RotateCcw className="h-4 w-4" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {r.handled
                      ? t("إرجاعها كجديدة", "Mark as new")
                      : t("تمت المعالجة", "Mark handled")}
                  </Button>
                  {r.email && (
                    <Button asChild size="sm" variant="outline">
                      <a href={`mailto:${r.email}`}>
                        <Mail className="h-4 w-4" />
                        {t("رد", "Reply")}
                      </a>
                    </Button>
                  )}
                  {chat && (
                    <Button size="sm" variant="ghost" onClick={() => onChat(chat)}>
                      <MessageSquare className="h-4 w-4" />
                      {t("المحادثة", "Chat")}
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="ms-auto h-8 w-8 text-[var(--cx-muted)] hover:text-[var(--cx-red)]"
                    disabled={busy === r.id}
                    onClick={() => remove(r)}
                    aria-label={t("حذف", "Delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- Visitor profiles ---------- */

const WHO: Record<string, [string, string]> = {
  student: ["طالب أو خريج", "Student / graduate"],
  professional: ["محترف", "Professional"],
  company: ["شركة", "Company"],
  trainer: ["مدرّب أو خبير", "Trainer / expert"],
};
const INTENT: Record<string, [string, string]> = {
  opportunity: ["يبحث عن فرصة", "Looking for an opportunity"],
  academic: ["نمو أكاديمي", "Academic growth"],
  business: ["تطوير أعمال", "Business"],
  collaboration: ["تعاون", "Collaboration"],
};
const LEVEL: Record<string, [string, string]> = {
  beginner: ["مبتدئ", "Beginner"],
  basics: ["أساسيات", "Basics"],
  working: ["يعمل عليه", "Working with it"],
};
const HOURS: Record<string, [string, string]> = {
  lt2: ["أقل من ساعتين", "Under 2h"],
  "2to5": ["2-5 ساعات", "2-5h"],
  gt5: ["أكثر من 5 ساعات", "Over 5h"],
};

function ProfilesStream({
  rows,
  setRows,
  onChat,
}: {
  rows: VisitorProfile[] | null;
  setRows: SetRows<VisitorProfile>;
  onChat: (conversationId: string) => void;
}) {
  const { t, ar, lang } = useT();
  const deleteFn = useServerFn(deleteVisitorProfile);
  const [who, setWho] = useState<string>("all");
  const [open, setOpen] = useState<VisitorProfile | null>(null);
  const label = (map: Record<string, [string, string]>, key: string | null) =>
    (key && map[key]?.[ar ? 0 : 1]) || key || "—";

  const remove = async (p: VisitorProfile) => {
    const ok = await confirmDialog({
      title: t("حذف ملف هذا الزائر؟", "Delete this visitor profile?"),
      description: t("لا يمكن التراجع.", "This cannot be undone."),
      confirmLabel: t("حذف", "Delete"),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteFn({ data: { profileId: p.id } });
      setRows((prev) => (prev ?? []).filter((x) => x.id !== p.id));
      setOpen(null);
      toast.success(t("حُذف", "Deleted"));
    } catch (e) {
      toast.error(toUserMessage(e));
    }
  };

  const recommendation = (p: VisitorProfile): ReactNode =>
    p.recommendation === "course"
      ? t(
          `اقترح دورة: ${p.recommended_course_title ?? ""}`,
          `Suggested a course: ${p.recommended_course_title ?? ""}`,
        )
      : p.recommendation === "lead"
        ? t("أُضيف إلى العملاء المحتملين", "Added to leads")
        : t("طلب اتصالاً هاتفياً", "Asked for a call");

  if (rows === null) return <Loading />;
  const shown = rows.filter((p) => who === "all" || p.who === who);

  return (
    <div>
      <div className="mb-4">
        <Seg
          value={who}
          onChange={setWho}
          options={[
            { value: "all", label: t("الكل", "All"), count: rows.length },
            ...Object.entries(WHO).map(([k, v]) => ({
              value: k,
              label: ar ? v[0] : v[1],
              count: rows.filter((p) => p.who === k).length,
            })),
          ]}
        />
      </div>
      {shown.length === 0 ? (
        <Panel>
          <EmptyState
            icon={UserRound}
            title={t("لا توجد ملفات زوار هنا", "No visitor profiles here")}
          />
        </Panel>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setOpen(p)}
              className="cx-card flex flex-col p-4 text-start transition-colors hover:border-[var(--cx-teal-100)]"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <Pill tone="teal">{label(WHO, p.who)}</Pill>
                {p.intent && <Pill tone="gray">{label(INTENT, p.intent)}</Pill>}
                <span className="ms-auto text-[12px] text-[var(--cx-muted)]">
                  {fmtDate(p.created_at, lang)}
                </span>
              </div>
              <div className="mt-3 font-extrabold" dir="auto">
                {p.contact_name || p.field || t("زائر", "Visitor")}
              </div>
              <p className="mt-1 line-clamp-3 text-[13.5px] text-[var(--cx-ink-2)]" dir="auto">
                {p.summary}
              </p>
              {p.next_step && (
                <div
                  className="mt-3 rounded-xl bg-[var(--cx-teal-50)] px-3 py-2 text-[13px]"
                  dir="auto"
                >
                  <span className="font-bold text-[var(--cx-teal)]">
                    {t("الخطوة التالية: ", "Next step: ")}
                  </span>
                  {p.next_step}
                </div>
              )}
              <div className="mt-auto pt-3 text-[12.5px] text-[var(--cx-muted)]">
                {recommendation(p)}
              </div>
            </button>
          ))}
        </div>
      )}

      <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent
          side={ar ? "left" : "right"}
          className="w-full overflow-y-auto sm:max-w-lg"
          dir={ar ? "rtl" : "ltr"}
        >
          {open && (
            <div className="space-y-4 pb-8">
              <SheetHeader className="text-start">
                <SheetTitle>{open.contact_name || t("ملف الزائر", "Visitor profile")}</SheetTitle>
                <p className="text-[13px] text-[var(--cx-muted)]">
                  {fmtDate(open.created_at, lang, true)}
                </p>
              </SheetHeader>
              {(open.contact_email || open.contact_phone) && (
                <div className="flex flex-wrap gap-2">
                  {open.contact_email && (
                    <Button asChild size="sm" variant="outline">
                      <a href={`mailto:${open.contact_email}`} dir="ltr">
                        <Mail className="h-4 w-4" />
                        {open.contact_email}
                      </a>
                    </Button>
                  )}
                  {open.contact_phone && (
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={`https://wa.me/${open.contact_phone.replace(/[^\d]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        dir="ltr"
                      >
                        WhatsApp {open.contact_phone}
                      </a>
                    </Button>
                  )}
                </div>
              )}
              <dl className="space-y-2">
                {(
                  [
                    [t("الخلاصة", "Summary"), open.summary],
                    [t("الهدف", "Goal"), open.goal],
                    [t("الخطوة خلال أسبوع", "Step this week"), open.next_step],
                    [t("الزائر", "Visitor"), label(WHO, open.who)],
                    [t("المجال", "Field"), open.field],
                    [t("مستواه في الذكاء الاصطناعي", "AI level"), label(LEVEL, open.ai_level)],
                    [t("يريد", "Wants"), label(INTENT, open.intent)],
                    [t("يستطيع تقديم", "Can offer"), open.can_offer],
                    [t("وقته أسبوعياً", "Weekly time"), label(HOURS, open.weekly_hours)],
                    [t("ما يعيقه", "Blocker"), open.blocker],
                    [t("يُذكر في اللقاء القادم", "Remember next time"), open.remember_note],
                  ] as [string, string | null][]
                )
                  .filter(([, v]) => v && v !== "—")
                  .map(([k, v]) => (
                    <div key={k} className="rounded-xl border border-[var(--cx-line)] p-3">
                      <dt className="text-[12px] font-bold text-[var(--cx-muted)]">{k}</dt>
                      <dd className="mt-0.5 whitespace-pre-wrap text-[14px]" dir="auto">
                        {v}
                      </dd>
                    </div>
                  ))}
              </dl>
              <div className="rounded-xl bg-[var(--cx-raise)] p-3 text-[13.5px]">
                {recommendation(open)}
                {open.recommendation === "course" && open.recommended_course_url && (
                  <a
                    href={open.recommended_course_url}
                    target="_blank"
                    rel="noreferrer"
                    className="ms-2 inline-flex items-center gap-1 font-bold text-[var(--cx-teal)]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {t("فتح", "Open")}
                  </a>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {open.conversation_id && (
                  <Button
                    variant="outline"
                    onClick={() => open.conversation_id && onChat(open.conversation_id)}
                  >
                    <MessageSquare className="h-4 w-4" />
                    {t("قراءة المحادثة", "Read the conversation")}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="text-[var(--cx-red)]"
                  onClick={() => remove(open)}
                >
                  <Trash2 className="h-4 w-4" />
                  {t("حذف الملف", "Delete profile")}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ---------- Conversations: list and transcript side by side ---------- */

function ConversationsStream({
  rows,
  setRows,
}: {
  rows: Conversation[] | null;
  setRows: SetRows<Conversation>;
}) {
  const { t, lang } = useT();
  const deleteFn = useServerFn(deleteConversation);
  const [open, setOpen] = useState<string | null>(null);
  const [period, setPeriod] = useState<"7" | "30" | "all">("30");

  const remove = async (c: Conversation) => {
    const ok = await confirmDialog({
      title: t("حذف هذه المحادثة؟", "Delete this conversation?"),
      description: t(
        "تُحذف رسائلها أيضاً. لا يمكن التراجع.",
        "Its messages go too. This cannot be undone.",
      ),
      confirmLabel: t("حذف", "Delete"),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteFn({ data: { conversationId: c.id } });
      setRows((p) => (p ?? []).filter((x) => x.id !== c.id));
      if (open === c.id) setOpen(null);
      toast.success(t("حُذفت", "Deleted"));
    } catch (e) {
      toast.error(toUserMessage(e));
    }
  };

  if (rows === null) return <Loading />;
  const since = period === "all" ? 0 : Date.now() - Number(period) * 86400000;
  const shown = rows.filter((c) => new Date(c.last_message_at).getTime() >= since);
  const current = rows.find((c) => c.id === open) ?? null;

  return (
    <div>
      <div className="mb-4">
        <Seg
          value={period}
          onChange={setPeriod}
          options={[
            { value: "7", label: t("آخر 7 أيام", "Last 7 days") },
            { value: "30", label: t("آخر 30 يوماً", "Last 30 days") },
            { value: "all", label: t("الكل", "All"), count: rows.length },
          ]}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <Panel flush>
          {shown.length === 0 ? (
            <EmptyState
              compact
              icon={MessageSquare}
              title={t("لا محادثات في هذه الفترة", "No conversations in this period")}
            />
          ) : (
            <ul className="max-h-[640px] divide-y divide-[var(--cx-line-2)] overflow-y-auto">
              {shown.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setOpen(c.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-[var(--cx-hover)] ${open === c.id ? "bg-[var(--cx-teal-50)]" : ""}`}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--cx-raise-2)] text-[var(--cx-teal)]">
                      <Bot className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-bold">
                        {fmtDate(c.last_message_at, lang, true)}
                      </span>
                      <span className="block text-[12px] text-[var(--cx-muted)]">
                        {t(
                          `${fmtNum(c.message_count, lang)} رسالة`,
                          `${fmtNum(c.message_count, lang)} messages`,
                        )}
                        {c.lang ? ` · ${c.lang.toUpperCase()}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel
          title={
            current
              ? fmtDate(current.started_at, lang, true)
              : t("اختر محادثة", "Pick a conversation")
          }
          description={
            current ? (
              <span className="font-mono text-[11.5px]" dir="ltr">
                {current.session_id}
              </span>
            ) : undefined
          }
          actions={
            current && (
              <Button
                size="sm"
                variant="ghost"
                className="text-[var(--cx-red)]"
                onClick={() => remove(current)}
              >
                <Trash2 className="h-4 w-4" />
                {t("حذف", "Delete")}
              </Button>
            )
          }
        >
          {current ? (
            <Transcript key={current.id} id={current.id} />
          ) : (
            <EmptyState
              compact
              icon={MessageSquare}
              title={t(
                "اختر محادثة من القائمة لقراءتها هنا",
                "Pick one from the list to read it here",
              )}
            />
          )}
        </Panel>
      </div>
    </div>
  );
}

function Transcript({ id }: { id: string }) {
  const { t } = useT();
  const msgsFn = useServerFn(getConversationMessages);
  const [msgs, setMsgs] = useState<Message[] | null>(null);
  useEffect(() => {
    setMsgs(null);
    msgsFn({ data: { conversationId: id } })
      .then((r) => setMsgs(r.messages as Message[]))
      .catch((e) => {
        toast.error(toUserMessage(e));
        setMsgs([]);
      });
  }, [msgsFn, id]);
  if (msgs === null) return <Loading />;
  if (!msgs.length)
    return <EmptyState compact icon={MessageSquare} title={t("لا رسائل", "No messages")} />;
  return (
    <div className="max-h-[560px] space-y-2.5 overflow-y-auto pe-1">
      {msgs.map((m) => {
        const user = m.role === "user";
        return (
          <div key={m.id} className={`flex ${user ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${user ? "rounded-ee-md bg-[var(--cx-petrol)] text-white" : "rounded-es-md border border-[var(--cx-line)] bg-[var(--cx-raise)]"}`}
              dir="auto"
            >
              {m.content || <em className="opacity-60">[{m.role}]</em>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Knowledge ---------- */

function KnowledgeStream({
  rows,
  setRows,
  reload,
}: {
  rows: Doc[] | null;
  setRows: SetRows<Doc>;
  reload: () => void;
}) {
  const { t, ar, lang } = useT();
  const addFn = useServerFn(addKnowledgeText);
  const deleteFn = useServerFn(deleteKnowledgeDocument);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await addFn({ data: { title: title.trim(), text: text.trim() } });
      toast.success(t("أُضيف النص وتعلّمه البوت", "Added. The bot has learnt it."));
      setTitle("");
      setText("");
      setAdding(false);
      reload();
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setSaving(false);
    }
  };
  const remove = async (d: Doc) => {
    const ok = await confirmDialog({
      title: t(`حذف «${d.title}»؟`, `Delete “${d.title}”?`),
      description: t("سينسى البوت هذا النص.", "The bot will forget this text."),
      confirmLabel: t("حذف", "Delete"),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteFn({ data: { documentId: d.id } });
      setRows((p) => (p ?? []).filter((x) => x.id !== d.id));
      toast.success(t("حُذف", "Deleted"));
    } catch (e) {
      toast.error(toUserMessage(e));
    }
  };
  const valid = title.trim().length > 0 && text.trim().length >= 10;

  return (
    <div>
      <Panel
        title={t("مصادر البوت", "The bot's sources")}
        description={t(
          "يقرأ البوت هذه النصوص قبل أن يجيب. أضف ما تريد أن يعرفه: أسئلة شائعة، أسعار، مواعيد، سياسات.",
          "The bot reads these texts before it answers. Add what it should know: FAQs, prices, dates, policies.",
        )}
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" />
            {t("إضافة نص", "Add text")}
          </Button>
        }
        flush
      >
        {rows === null ? (
          <Loading />
        ) : rows.length === 0 ? (
          <EmptyState icon={BookOpen} title={t("لا توجد نصوص بعد", "No texts yet")} />
        ) : (
          <ul className="divide-y divide-[var(--cx-line-2)]">
            {rows.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--cx-teal-50)] text-[var(--cx-teal)]">
                  <BookOpen className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold" dir="auto">
                    {d.title}
                  </div>
                  <div className="text-[12.5px] text-[var(--cx-muted)]">
                    {fmtDate(d.created_at, lang)} ·{" "}
                    {t(
                      `${fmtNum(d.chunk_count, lang)} مقطع`,
                      `${fmtNum(d.chunk_count, lang)} chunks`,
                    )}
                  </div>
                  {d.error_message && (
                    <div className="text-[12.5px] text-[var(--cx-red)]">{d.error_message}</div>
                  )}
                </div>
                <Pill
                  tone={d.status === "ready" ? "green" : d.status === "failed" ? "red" : "orange"}
                >
                  {d.status === "ready"
                    ? t("جاهز", "Ready")
                    : d.status === "failed"
                      ? t("فشل", "Failed")
                      : t("قيد المعالجة", "Processing")}
                </Pill>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-[var(--cx-muted)] hover:text-[var(--cx-red)]"
                  onClick={() => remove(d)}
                  aria-label={t("حذف", "Delete")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Sheet open={adding} onOpenChange={(v) => !saving && setAdding(v)}>
        <SheetContent
          side={ar ? "left" : "right"}
          className="w-full overflow-y-auto sm:max-w-2xl"
          dir={ar ? "rtl" : "ltr"}
        >
          <div className="space-y-4 pb-8">
            <SheetHeader className="text-start">
              <SheetTitle>{t("نص جديد للبوت", "New text for the bot")}</SheetTitle>
              <p className="text-[13px] text-[var(--cx-muted)]">
                {t(
                  "اكتب بلغة واضحة. العربية والإنجليزية تعملان.",
                  "Write it plainly. Arabic or English both work.",
                )}
              </p>
            </SheetHeader>
            <Field label={t("العنوان", "Title")}>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                dir="auto"
              />
            </Field>
            <Field label={t("النص", "Text")} hint={`${fmtNum(text.length, lang)} / 200,000`}>
              <Textarea
                rows={16}
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={200000}
                dir="auto"
              />
            </Field>
            <Button className="w-full" size="lg" onClick={submit} disabled={saving || !valid}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? t("يتعلّمه البوت…", "The bot is learning it…") : t("إضافة", "Add")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
