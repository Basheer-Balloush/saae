import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmDialog } from "@/hooks/useConfirm";
import { toUserMessage } from "@/lib/safe-error";
import {
  listChatFeedback,
  setChatFeedbackHandled,
  deleteChatFeedback,
} from "@/lib/admin-chat.functions";
import {
  FEEDBACK_CATEGORIES,
  feedbackCategoryLabel,
} from "@/components/site/AssistantFeedbackForm";

type Row = {
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

const T = {
  ar: {
    title: "ملاحظات الزوّار",
    all: "الكل",
    category: "التصنيف",
    name: "الاسم",
    email: "الإيميل",
    message: "الملاحظة",
    date: "التاريخ",
    status: "الحالة",
    handled: "تمت المعالجة",
    pending: "جديدة",
    markHandled: "تحديد كمُعالجة",
    markPending: "إرجاعها كجديدة",
    empty: "لا توجد ملاحظات",
    confirmDelete: "حذف هذه الملاحظة؟",
    deleted: "تم الحذف",
    actions: "إجراءات",
  },
  en: {
    title: "Visitor feedback",
    all: "All",
    category: "Category",
    name: "Name",
    email: "Email",
    message: "Feedback",
    date: "Date",
    status: "Status",
    handled: "Handled",
    pending: "New",
    markHandled: "Mark handled",
    markPending: "Mark as new",
    empty: "No feedback yet",
    confirmDelete: "Delete this feedback?",
    deleted: "Deleted",
    actions: "Actions",
  },
};

export function ChatFeedbackPanel({ lang }: { lang: "ar" | "en" }) {
  const tr = T[lang];
  const labels = feedbackCategoryLabel[lang];
  const fetchList = useServerFn(listChatFeedback);
  const setHandled = useServerFn(setChatFeedbackHandled);
  const remove = useServerFn(deleteChatFeedback);

  const [items, setItems] = useState<Row[]>([]);
  const [category, setCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    (cat: string) => {
      setLoading(true);
      fetchList({ data: { category: cat } })
        .then((r) => setItems(r.feedback as Row[]))
        .catch((e) => toast.error(toUserMessage(e)))
        .finally(() => setLoading(false));
    },
    [fetchList],
  );

  useEffect(() => {
    load(category);
  }, [category, load]);

  const toggle = async (row: Row) => {
    try {
      await setHandled({ data: { id: row.id, handled: !row.handled } });
      setItems((p) => p.map((r) => (r.id === row.id ? { ...r, handled: !row.handled } : r)));
    } catch (e) {
      toast.error(toUserMessage(e));
    }
  };

  const del = async (id: string) => {
    if (!(await confirmDialog({ title: tr.confirmDelete, destructive: true }))) return;
    try {
      await remove({ data: { id } });
      setItems((p) => p.filter((r) => r.id !== id));
      toast.success(tr.deleted);
    } catch (e) {
      toast.error(toUserMessage(e));
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="me-auto text-lg font-semibold text-foreground">{tr.title}</h2>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="all">{tr.all}</option>
          {FEEDBACK_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {labels[c]}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-start">{tr.category}</th>
                <th className="px-4 py-3 text-start">{tr.name}</th>
                <th className="px-4 py-3 text-start">{tr.email}</th>
                <th className="px-4 py-3 text-start">{tr.message}</th>
                <th className="px-4 py-3 text-start">{tr.date}</th>
                <th className="px-4 py-3 text-start">{tr.status}</th>
                <th className="px-4 py-3 text-end">{tr.actions}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    {tr.empty}
                  </td>
                </tr>
              )}
              {items.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {labels[r.category] ?? r.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground">{r.name || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground" dir="ltr">
                    {r.email || "—"}
                  </td>
                  <td className="max-w-md whitespace-pre-wrap px-4 py-3 text-foreground">
                    {r.message}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(r.created_at).toLocaleString(lang === "ar" ? "ar" : "en")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={r.handled ? "text-emerald-600" : "text-amber-600"}>
                      {r.handled ? tr.handled : tr.pending}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => toggle(r)}>
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="hidden sm:inline">
                          {r.handled ? tr.markPending : tr.markHandled}
                        </span>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => del(r.id)}>
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
