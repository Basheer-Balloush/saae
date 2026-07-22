import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listLeads, getConversationMessages } from "@/lib/admin-chat.functions";
import { toUserMessage } from "@/lib/safe-error";
import { useLang } from "@/lib/i18n";

type Message = { id: string; role: string; content: string; created_at: string };

const T = {
  ar: {
    name: "الاسم", email: "إيميل", phone: "هاتف", specialty: "اختصاص",
    description: "وصف", date: "تاريخ", company: "الشركة", field: "المجال",
    contact: "جهة التواصل", noLeads: "لا يوجد", actions: "إجراءات",
    viewChat: "عرض المحادثة", noChatLinked: "لا توجد محادثة مرتبطة",
    conversations: "المحادثات",
  },
  en: {
    name: "Name", email: "Email", phone: "Phone", specialty: "Specialty",
    description: "Description", date: "Date", company: "Company", field: "Field",
    contact: "Contact", noLeads: "None", actions: "Actions",
    viewChat: "View chat", noChatLinked: "No linked chat",
    conversations: "Conversations",
  },
};

export function LeadsView({ variant }: { variant: "individuals" | "companies" }) {
  const { lang } = useLang();
  const tr = T[lang];
  const fetchLeads = useServerFn(listLeads);
  const fetchMsgs = useServerFn(getConversationMessages);
  const [data, setData] = useState<Awaited<ReturnType<typeof listLeads>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [openConvId, setOpenConvId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);

  const load = () => {
    setLoading(true);
    fetchLeads()
      .then(setData)
      .catch((e) => toast.error(toUserMessage(e)))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const openChat = (conversationId: string | null | undefined) => {
    if (!conversationId) { toast.error(tr.noChatLinked); return; }
    setOpenConvId(conversationId);
    setMsgsLoading(true);
    fetchMsgs({ data: { conversationId } })
      .then((r) => setMsgs(r.messages as Message[]))
      .catch((e) => toast.error(toUserMessage(e)))
      .finally(() => setMsgsLoading(false));
  };

  if (loading) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />;
  if (!data) return null;

  const rows = variant === "individuals" ? data.individuals : data.companies;

  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">
        {lang === "ar" ? "الإجمالي" : "Total"}: <span className="font-bold text-foreground">{rows.length}</span>
      </p>

      {variant === "individuals" ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-start">{tr.name}</th>
                <th className="px-3 py-2 text-start">{tr.email}</th>
                <th className="px-3 py-2 text-start">{tr.phone}</th>
                <th className="px-3 py-2 text-start">{tr.specialty}</th>
                <th className="px-3 py-2 text-start">{tr.description}</th>
                <th className="px-3 py-2 text-start">{tr.date}</th>
                <th className="px-3 py-2 text-end">{tr.actions}</th>
              </tr>
            </thead>
            <tbody>
              {data.individuals.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">{tr.noLeads}</td></tr>
              )}
              {data.individuals.map((r) => {
                const convId = (r as { conversation_id?: string | null }).conversation_id ?? null;
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{r.full_name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.email ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.phone ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.specialty ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.short_description ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{new Date(r.created_at).toLocaleDateString(lang === "ar" ? "ar" : "en")}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end">
                        <Button size="sm" variant="outline" disabled={!convId} onClick={() => openChat(convId)}>
                          <MessageSquare className="h-4 w-4" /> {tr.viewChat}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-start">{tr.company}</th>
                <th className="px-3 py-2 text-start">{tr.field}</th>
                <th className="px-3 py-2 text-start">{tr.contact}</th>
                <th className="px-3 py-2 text-start">{tr.email}</th>
                <th className="px-3 py-2 text-start">{tr.phone}</th>
                <th className="px-3 py-2 text-start">{tr.date}</th>
                <th className="px-3 py-2 text-end">{tr.actions}</th>
              </tr>
            </thead>
            <tbody>
              {data.companies.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">{tr.noLeads}</td></tr>
              )}
              {data.companies.map((r) => {
                const convId = (r as { conversation_id?: string | null }).conversation_id ?? null;
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{r.company_name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.work_field ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.contact_name ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.contact_email ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.contact_phone ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{new Date(r.created_at).toLocaleDateString(lang === "ar" ? "ar" : "en")}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end">
                        <Button size="sm" variant="outline" disabled={!convId} onClick={() => openChat(convId)}>
                          <MessageSquare className="h-4 w-4" /> {tr.viewChat}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!openConvId} onOpenChange={(o) => !o && setOpenConvId(null)}>
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
    </div>
  );
}
