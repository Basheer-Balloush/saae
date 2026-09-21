import { useEffect, useState } from "react";
import { toUserMessage } from "@/lib/safe-error";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Trash2, Upload, Eye, MessageSquare, BookOpen, BarChart3, MessageSquarePlus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  listConversations,
  getConversationMessages,
  deleteConversation,
  getChatStats,
  
  listVisitorProfiles,
  deleteVisitorProfile,
  type VisitorProfile,
  listKnowledgeDocuments,
  addKnowledgeText,
  deleteKnowledgeDocument,
} from "@/lib/admin-chat.functions";
import { confirmDialog } from "@/hooks/useConfirm";
import { ChatFeedbackPanel } from "@/components/admin/ChatFeedbackPanel";

type SubTab = "stats" | "conversations" | "profiles" | "feedback" | "knowledge";

const T = {
  ar: {
    title: "الشات بوت",
    stats: "إحصائيات",
    conversations: "المحادثات",
    feedback: "الملاحظات",
    leads: "الـ Leads",
    profiles: "ملفات الزوار",
    knowledge: "قاعدة المعرفة (تدريب)",
    conversationsTotal: "إجمالي المحادثات",
    conversations7d: "آخر 7 أيام",
    conversations30d: "آخر 30 يوم",
    messagesTotal: "إجمالي الرسائل",
    indLeads: "Leads أفراد",
    compLeads: "Leads شركات",
    session: "الجلسة",
    started: "بدأت",
    msgs: "رسائل",
    actions: "إجراءات",
    view: "عرض",
    delete: "حذف",
    confirmDelete: "حذف هذه المحادثة؟",
    deleted: "تم الحذف",
    noConv: "لا توجد محادثات بعد",
    closeView: "إغلاق",
    individuals: "أفراد",
    companies: "شركات",
    name: "الاسم",
    email: "إيميل",
    phone: "هاتف",
    specialty: "اختصاص",
    description: "وصف",
    date: "تاريخ",
    company: "الشركة",
    field: "المجال",
    contact: "جهة التواصل",
    noLeads: "لا يوجد",
    viewChat: "عرض المحادثة",
    noChatLinked: "لا توجد محادثة مرتبطة",
    addKnowledge: "إضافة معرفة",
    addText: "إضافة نص جديد",
    docTitle: "العنوان",
    docContent: "المحتوى النصي",
    save: "حفظ",
    saving: "جاري المعالجة...",
    knowledgeHint:
      "النصوص التي تضيفها هنا سيستخدمها البوت كمرجع إضافي عند الإجابة على الأسئلة (نظام RAG).",
    docs: "الملفات",
    chunks: "مقاطع",
    status: "الحالة",
    statusReady: "جاهز",
    statusProcessing: "قيد المعالجة",
    statusFailed: "فشل",
    addedOk: "تمت الإضافة وتدريب البوت",
    error: "خطأ",
  },
  en: {
    title: "Chatbot",
    stats: "Stats",
    conversations: "Conversations",
    feedback: "Feedback",
    leads: "Leads",
    profiles: "Visitor profiles",
    knowledge: "Knowledge base (training)",
    conversationsTotal: "Total conversations",
    conversations7d: "Last 7 days",
    conversations30d: "Last 30 days",
    messagesTotal: "Total messages",
    indLeads: "Individual leads",
    compLeads: "Company leads",
    session: "Session",
    started: "Started",
    msgs: "Msgs",
    actions: "Actions",
    view: "View",
    delete: "Delete",
    confirmDelete: "Delete this conversation?",
    deleted: "Deleted",
    noConv: "No conversations yet",
    closeView: "Close",
    individuals: "Individuals",
    companies: "Companies",
    name: "Name",
    email: "Email",
    phone: "Phone",
    specialty: "Specialty",
    description: "Description",
    date: "Date",
    company: "Company",
    field: "Field",
    contact: "Contact",
    noLeads: "None",
    viewChat: "View chat",
    noChatLinked: "No linked chat",
    addKnowledge: "Add knowledge",
    addText: "Add new text",
    docTitle: "Title",
    docContent: "Text content",
    save: "Save",
    saving: "Processing...",
    knowledgeHint:
      "Text you add here will be used by the bot as additional reference when answering (RAG).",
    docs: "Documents",
    chunks: "chunks",
    status: "Status",
    statusReady: "Ready",
    statusProcessing: "Processing",
    statusFailed: "Failed",
    addedOk: "Added and trained the bot",
    error: "Error",
  },
};

export function AdminChatbotSection({ lang }: { lang: "ar" | "en" }) {
  const tr = T[lang];
  const [sub, setSub] = useState<SubTab>("stats");

  const tabs: Array<{ key: SubTab; label: string; icon: typeof BarChart3 }> = [
    { key: "stats", label: tr.stats, icon: BarChart3 },
    { key: "conversations", label: tr.conversations, icon: MessageSquare },
    { key: "profiles", label: tr.profiles, icon: UserRound },
    { key: "feedback", label: tr.feedback, icon: MessageSquarePlus },
    { key: "knowledge", label: tr.knowledge, icon: BookOpen },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = sub === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setSub(t.key)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {sub === "stats" && <StatsPanel tr={tr} />}
      {sub === "conversations" && <ConversationsPanel tr={tr} lang={lang} />}
      
      {sub === "profiles" && <ProfilesPanel lang={lang} />}
      {sub === "feedback" && <ChatFeedbackPanel lang={lang} />}
      {sub === "knowledge" && <KnowledgePanel tr={tr} lang={lang} />}
    </div>
  );
}

/* One row per completed intake: who the visitor is, what was recommended, and the
   single next step — so the team can act without reading the conversation. */
function ProfilesPanel({ lang }: { lang: "ar" | "en" }) {
  const ar = lang === "ar";
  const fetchProfiles = useServerFn(listVisitorProfiles);
  const removeProfile = useServerFn(deleteVisitorProfile);
  const [profiles, setProfiles] = useState<VisitorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<VisitorProfile | null>(null);

  const load = () => {
    setLoading(true);
    fetchProfiles()
      .then((r) => setProfiles(r.profiles))
      .catch((e) => toast.error(toUserMessage(e)))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const WHO: Record<string, [string, string]> = {
    student: ["طالب أو خريج", "Student / graduate"],
    professional: ["محترف", "Professional"],
    company: ["شركة", "Company"],
    trainer: ["مدرّب أو خبير", "Trainer / expert"],
  };
  const INTENT: Record<string, [string, string]> = {
    opportunity: ["فرصة", "Opportunity"],
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
    lt2: ["< ساعتين", "< 2h"],
    "2to5": ["2-5 ساعات", "2-5h"],
    gt5: ["> 5 ساعات", "> 5h"],
  };
  const label = (map: Record<string, [string, string]>, key: string | null) =>
    (key && map[key]?.[ar ? 0 : 1]) || key || "—";

  const handleDelete = async (id: string) => {
    if (!(await confirmDialog({ title: ar ? "حذف هذا الملف؟" : "Delete this profile?", destructive: true }))) return;
    try {
      await removeProfile({ data: { profileId: id } });
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      toast.success(ar ? "تم الحذف" : "Deleted");
    } catch (e) {
      toast.error(toUserMessage(e));
    }
  };

  if (loading) {
    return (
      <p className="flex justify-center py-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </p>
    );
  }
  if (profiles.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        {ar ? "لا توجد ملفات زوار بعد." : "No visitor profiles yet."}
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-start">{ar ? "التاريخ" : "Date"}</th>
              <th className="px-4 py-3 text-start">{ar ? "الزائر" : "Visitor"}</th>
              <th className="px-4 py-3 text-start">{ar ? "المجال" : "Field"}</th>
              <th className="px-4 py-3 text-start">{ar ? "يريد" : "Wants"}</th>
              <th className="px-4 py-3 text-start">{ar ? "التوصية" : "Recommendation"}</th>
              <th className="px-4 py-3 text-start">{ar ? "التواصل" : "Contact"}</th>
              <th className="px-4 py-3 text-end">{ar ? "إجراءات" : "Actions"}</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id} className="border-t border-border align-top">
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString(lang)}
                </td>
                <td className="px-4 py-3">{label(WHO, p.who)}</td>
                <td className="px-4 py-3" dir="auto">{p.field || "—"}</td>
                <td className="px-4 py-3">{label(INTENT, p.intent)}</td>
                <td className="px-4 py-3" dir="auto">
                  {p.recommendation === "course" ? (
                    p.recommended_course_url ? (
                      <a className="text-primary hover:underline" href={p.recommended_course_url} target="_blank" rel="noreferrer">
                        {p.recommended_course_title || (ar ? "دورة" : "Course")}
                      </a>
                    ) : (
                      p.recommended_course_title || (ar ? "دورة" : "Course")
                    )
                  ) : p.recommendation === "lead" ? (
                    ar ? "تحوّل إلى Lead" : "Became a lead"
                  ) : (
                    ar ? "تواصل هاتفي" : "Phone contact"
                  )}
                </td>
                <td className="px-4 py-3 text-xs" dir="auto">
                  {p.contact_name || "—"}
                  {p.contact_email ? <><br />{p.contact_email}</> : null}
                  {p.contact_phone ? <><br />{p.contact_phone}</> : null}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setOpen(p)} aria-label={ar ? "عرض" : "View"}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} aria-label={ar ? "حذف" : "Delete"}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{ar ? "ملف الزائر" : "Visitor profile"}</DialogTitle>
          </DialogHeader>
          {open && (
            <dl className="space-y-3 text-sm" dir="auto">
              {[
                [ar ? "الخلاصة" : "Summary", open.summary],
                [ar ? "الهدف" : "Goal", open.goal],
                [ar ? "الزائر" : "Visitor", label(WHO, open.who)],
                [ar ? "المجال" : "Field", open.field],
                [ar ? "المستوى" : "AI level", label(LEVEL, open.ai_level)],
                [ar ? "يريد" : "Wants", label(INTENT, open.intent)],
                [ar ? "يستطيع تقديم" : "Can offer", open.can_offer],
                [ar ? "الوقت أسبوعياً" : "Weekly time", label(HOURS, open.weekly_hours)],
                [ar ? "ما يعيقه" : "Blocker", open.blocker],
                [ar ? "الخطوة خلال أسبوع" : "Step this week", open.next_step],
                [ar ? "يُذكر في اللقاء القادم" : "Remember next time", open.remember_note],
              ]
                .filter(([, v]) => v && v !== "—")
                .map(([k, v]) => (
                  <div key={k as string}>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{k}</dt>
                    <dd className="mt-0.5 text-foreground">{v}</dd>
                  </div>
                ))}
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatsPanel({ tr }: { tr: (typeof T)["ar"] }) {
  const fetchStats = useServerFn(getChatStats);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getChatStats>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats()
      .then((s) => setStats(s))
      .catch((e) => toast.error(toUserMessage(e)))
      .finally(() => setLoading(false));
  }, [fetchStats]);

  if (loading) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />;
  if (!stats) return null;

  const cards = [
    { label: tr.conversationsTotal, value: stats.conversationsTotal },
    { label: tr.conversations7d, value: stats.conversations7d },
    { label: tr.conversations30d, value: stats.conversations30d },
    { label: tr.messagesTotal, value: stats.messagesTotal },
    { label: tr.indLeads, value: stats.individualLeads },
    { label: tr.compLeads, value: stats.companyLeads },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

type Conversation = {
  id: string;
  session_id: string;
  lang: string | null;
  message_count: number;
  started_at: string;
  last_message_at: string;
};
type Message = { id: string; role: string; content: string; created_at: string };

function ConversationsPanel({ tr, lang }: { tr: (typeof T)["ar"]; lang: "ar" | "en" }) {
  const fetchConvs = useServerFn(listConversations);
  const fetchMsgs = useServerFn(getConversationMessages);
  const delConv = useServerFn(deleteConversation);
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);

  const load = () => {
    setLoading(true);
    fetchConvs()
      .then((r) => setItems(r.conversations as Conversation[]))
      .catch((e) => toast.error(toUserMessage(e)))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const openConv = (id: string) => {
    setOpenId(id);
    setMsgsLoading(true);
    fetchMsgs({ data: { conversationId: id } })
      .then((r) => setMsgs(r.messages as Message[]))
      .catch((e) => toast.error(toUserMessage(e)))
      .finally(() => setMsgsLoading(false));
  };

  const remove = async (id: string) => {
    if (!(await confirmDialog({ title: tr.confirmDelete, destructive: true }))) return;
    try {
      await delConv({ data: { conversationId: id } });
      toast.success(tr.deleted);
      setItems((p) => p.filter((c) => c.id !== id));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (loading) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />;

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-start">{tr.session}</th>
              <th className="px-4 py-3 text-start">{tr.started}</th>
              <th className="px-4 py-3 text-start">{tr.msgs}</th>
              <th className="px-4 py-3 text-end">{tr.actions}</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">{tr.noConv}</td></tr>
            )}
            {items.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-3 font-mono text-xs text-foreground">{c.session_id.slice(0, 14)}...</td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(c.last_message_at).toLocaleString(lang === "ar" ? "ar" : "en")}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.message_count}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => openConv(c.id)}>
                      <Eye className="h-4 w-4" /> {tr.view}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => remove(c.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tr.conversations}</DialogTitle>
          </DialogHeader>
          {msgsLoading ? (
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <div className="space-y-3">
              {msgs.map((m) => {
                const isUser = m.role === "user";
                return (
                  <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                      isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}>
                      {m.content || <em className="opacity-60">[{m.role}]</em>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}


type Doc = {
  id: string;
  title: string;
  source_type: string;
  status: string;
  error_message: string | null;
  chunk_count: number;
  created_at: string;
};

function KnowledgePanel({ tr, lang }: { tr: (typeof T)["ar"]; lang: "ar" | "en" }) {
  const fetchDocs = useServerFn(listKnowledgeDocuments);
  const addText = useServerFn(addKnowledgeText);
  const delDoc = useServerFn(deleteKnowledgeDocument);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetchDocs()
      .then((r) => setDocs(r.documents as Doc[]))
      .catch((e) => toast.error(toUserMessage(e)))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const submit = async () => {
    if (!title.trim() || text.trim().length < 10) return;
    setSaving(true);
    try {
      await addText({ data: { title: title.trim(), text: text.trim() } });
      toast.success(tr.addedOk);
      setTitle("");
      setText("");
      setShowForm(false);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!(await confirmDialog({ title: "?", destructive: true }))) return;
    try {
      await delDoc({ data: { documentId: id } });
      setDocs((p) => p.filter((d) => d.id !== id));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div>
      <p className="mb-4 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        {tr.knowledgeHint}
      </p>

      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold">{tr.docs} ({docs.length})</h3>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Upload className="h-4 w-4" /> {tr.addKnowledge}
        </Button>
      </div>

      {showForm && (
        <div className="mb-6 space-y-3 rounded-xl border border-border bg-card p-4">
          <div>
            <Label>{tr.docTitle}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </div>
          <div>
            <Label>{tr.docContent}</Label>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} maxLength={200000} />
          </div>
          <Button onClick={submit} disabled={saving || !title.trim() || text.trim().length < 10}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> {tr.saving}</> : tr.save}
          </Button>
        </div>
      )}

      {loading ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-start">{tr.docTitle}</th>
                <th className="px-4 py-3 text-start">{tr.status}</th>
                <th className="px-4 py-3 text-start">{tr.chunks}</th>
                <th className="px-4 py-3 text-start">{tr.date}</th>
                <th className="px-4 py-3 text-end">{tr.actions}</th>
              </tr>
            </thead>
            <tbody>
              {docs.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">—</td></tr>
              )}
              {docs.map((d) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{d.title}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      d.status === "ready" ? "bg-emerald-500/15 text-emerald-600" :
                      d.status === "failed" ? "bg-destructive/15 text-destructive" :
                      "bg-amber-500/15 text-amber-600"
                    }`}>
                      {d.status === "ready" ? tr.statusReady : d.status === "failed" ? tr.statusFailed : tr.statusProcessing}
                    </span>
                    {d.error_message && <p className="mt-1 text-xs text-destructive">{d.error_message}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{d.chunk_count}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(d.created_at).toLocaleDateString(lang === "ar" ? "ar" : "en")}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" onClick={() => remove(d.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
