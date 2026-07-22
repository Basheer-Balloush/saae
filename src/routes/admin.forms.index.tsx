import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  Pencil,
  Eye,
  EyeOff,
  Archive,
  Trash2,
  ExternalLink,
  Send,
  RotateCcw,
} from "lucide-react";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toUserMessage } from "@/lib/safe-error";
import {
  listDynamicForms,
  setDynamicFormStatus,
  deleteDynamicForm,
} from "@/lib/dynamic-forms.functions";
import type { FormStatus } from "@/lib/dynamic-forms";

export const Route = createFileRoute("/admin/forms/")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Forms management — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FormsList,
});

type Row = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  status: FormStatus;
  updated_at: string;
  submissions_count: number;
};

const STATUS_FILTER: Array<{ value: "all" | FormStatus; ar: string; en: string }> = [
  { value: "all", ar: "الكل", en: "All" },
  { value: "draft", ar: "مسودة", en: "Draft" },
  { value: "published", ar: "منشور", en: "Published" },
  { value: "hidden", ar: "مخفي", en: "Hidden" },
  { value: "archived", ar: "مؤرشف", en: "Archived" },
];

function statusColor(status: FormStatus): string {
  switch (status) {
    case "published":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "draft":
      return "bg-amber-500/10 text-amber-700 border-amber-500/20";
    case "hidden":
      return "bg-slate-500/10 text-slate-600 border-slate-500/20";
    case "archived":
      return "bg-muted text-muted-foreground border-border";
  }
}

function FormsList() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const list = useServerFn(listDynamicForms);
  const setStatus = useServerFn(setDynamicFormStatus);
  const doDelete = useServerFn(deleteDynamicForm);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | FormStatus>("all");
  const [pending, setPending] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ row: Row; count: number } | null>(null);
  const [alsoDeleteSubs, setAlsoDeleteSubs] = useState(false);

  const load = async () => {
    try {
      const data = (await list()) as Row[];
      setRows(data);
    } catch (e) {
      toast.error(toUserMessage(e));
      setRows([]);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = (rows ?? []).filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (!q.trim()) return true;
    const s = q.trim().toLowerCase();
    return (
      r.name_ar.toLowerCase().includes(s) ||
      r.name_en.toLowerCase().includes(s) ||
      r.slug.toLowerCase().includes(s)
    );
  });

  const changeStatus = async (row: Row, next: FormStatus) => {
    setPending(row.id);
    try {
      await setStatus({ data: { id: row.id, status: next } });
      toast.success(ar ? "تم التحديث" : "Updated");
      await load();
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setPending(null);
    }
  };

  const requestDelete = (row: Row) => {
    setAlsoDeleteSubs(false);
    setConfirm({ row, count: row.submissions_count });
  };

  const confirmDelete = async () => {
    if (!confirm) return;
    setPending(confirm.row.id);
    try {
      await doDelete({
        data: {
          id: confirm.row.id,
          deleteSubmissions: confirm.count > 0 ? alsoDeleteSubs : false,
        },
      });
      toast.success(ar ? "تم الحذف" : "Deleted");
      setConfirm(null);
      await load();
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {ar ? "إدارة النماذج" : "Forms management"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {ar
              ? "أنشئ وحرّر النماذج الديناميكية. لعرض الاستجابات انتقل إلى CRM."
              : "Create and manage dynamic forms. View responses in CRM."}
          </p>
        </div>
        <Button asChild size="sm">
          <Link to="/admin/forms/new">
            <Plus className="h-4 w-4" /> {ar ? "إنشاء نموذج" : "Create form"}
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder={ar ? "بحث بالاسم أو المعرف" : "Search by name or slug"}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {ar ? s.ar : s.en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load}>
          {ar ? "تحديث" : "Refresh"}
        </Button>
      </div>

      {rows === null ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
          {ar ? "لا توجد نماذج" : "No forms"}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="p-3 text-start">{ar ? "الاسم" : "Name"}</th>
                <th className="p-3 text-start">{ar ? "الرابط" : "Slug"}</th>
                <th className="p-3 text-start">{ar ? "الحالة" : "Status"}</th>
                <th className="p-3 text-start">{ar ? "الاستجابات" : "Responses"}</th>
                <th className="p-3 text-start">{ar ? "آخر تحديث" : "Updated"}</th>
                <th className="p-3 text-end">{ar ? "الإجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3">
                    <div className="font-medium text-foreground">
                      {ar ? r.name_ar : r.name_en}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {ar ? r.name_en : r.name_ar}
                    </div>
                  </td>
                  <td className="p-3">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      /forms/{r.slug}
                    </code>
                  </td>
                  <td className="p-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs",
                        statusColor(r.status),
                      )}
                    >
                      {STATUS_FILTER.find((s) => s.value === r.status)?.[ar ? "ar" : "en"]}
                    </span>
                  </td>
                  <td className="p-3">{r.submissions_count}</td>
                  <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(r.updated_at).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      {r.status === "published" && (
                        <Button variant="ghost" size="icon" asChild title={ar ? "معاينة" : "Preview"}>
                          <a href={`/forms/${r.slug}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" asChild title={ar ? "تعديل" : "Edit"}>
                        <Link to="/admin/forms/$formId/edit" params={{ formId: r.id }}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      {r.status !== "published" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={pending === r.id}
                          onClick={() => changeStatus(r, "published")}
                          title={ar ? "نشر" : "Publish"}
                        >
                          <Send className="h-4 w-4 text-emerald-600" />
                        </Button>
                      )}
                      {r.status === "published" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={pending === r.id}
                          onClick={() => changeStatus(r, "hidden")}
                          title={ar ? "إخفاء" : "Hide"}
                        >
                          <EyeOff className="h-4 w-4" />
                        </Button>
                      )}
                      {r.status === "hidden" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={pending === r.id}
                          onClick={() => changeStatus(r, "published")}
                          title={ar ? "إظهار" : "Show"}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {r.status !== "archived" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={pending === r.id}
                          onClick={() => changeStatus(r, "archived")}
                          title={ar ? "أرشفة" : "Archive"}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={pending === r.id}
                          onClick={() => changeStatus(r, "draft")}
                          title={ar ? "إعادة" : "Restore"}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={pending === r.id}
                        onClick={() => requestDelete(r)}
                        title={ar ? "حذف" : "Delete"}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ar ? "حذف النموذج؟" : "Delete form?"}</DialogTitle>
            <DialogDescription>
              {confirm && confirm.count > 0
                ? ar
                  ? `يحتوي هذا النموذج على ${confirm.count} استجابة. لا يمكن حذفه ما لم تختر حذف الاستجابات معه.`
                  : `This form has ${confirm.count} submission(s). It cannot be deleted unless you also delete its submissions.`
                : ar
                  ? "لا يمكن التراجع عن هذا الإجراء."
                  : "This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          {confirm && confirm.count > 0 && (
            <label className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <Checkbox
                checked={alsoDeleteSubs}
                onCheckedChange={(v) => setAlsoDeleteSubs(!!v)}
                className="mt-0.5"
              />
              <span className="text-destructive">
                {ar
                  ? `نعم، احذف النموذج و ${confirm.count} استجابة نهائياً.`
                  : `Yes, permanently delete the form and its ${confirm.count} submission(s).`}
              </span>
            </label>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              {ar ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={
                pending === confirm?.row.id ||
                (!!confirm && confirm.count > 0 && !alsoDeleteSubs)
              }
            >
              {ar ? "حذف" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
