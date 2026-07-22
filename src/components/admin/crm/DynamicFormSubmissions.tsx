import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Download, RefreshCw, Pencil, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useLang } from "@/lib/i18n";
import { toUserMessage } from "@/lib/safe-error";
import type { DynamicForm, FormField, FormStatus } from "@/lib/dynamic-forms";
import {
  deleteDynamicForm,
  getDynamicFormById,
  listDynamicFormSubmissions,
} from "@/lib/dynamic-forms.functions";
import { buildXlsxFilename, exportRowsToXlsx, type XlsxColumn } from "@/lib/admin-xlsx-export";
import { cn } from "@/lib/utils";

type SubRow = { id: string; values: Record<string, unknown>; field_snapshot: FormField[]; submitted_at: string };

const STATUS_LABELS_AR: Record<FormStatus, string> = {
  draft: "مسودة",
  published: "منشور",
  hidden: "مخفي",
  archived: "مؤرشف",
};
const STATUS_LABELS_EN: Record<FormStatus, string> = {
  draft: "Draft",
  published: "Published",
  hidden: "Hidden",
  archived: "Archived",
};
function statusColor(s: FormStatus) {
  switch (s) {
    case "published": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "draft": return "bg-amber-500/10 text-amber-700 border-amber-500/20";
    case "hidden": return "bg-slate-500/10 text-slate-600 border-slate-500/20";
    case "archived": return "bg-muted text-muted-foreground border-border";
  }
}

export function DynamicFormSubmissions({ formId }: { formId: string }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const fetchForm = useServerFn(getDynamicFormById);
  const fetchSubs = useServerFn(listDynamicFormSubmissions);
  const doDelete = useServerFn(deleteDynamicForm);
  const [form, setForm] = useState<DynamicForm | null>(null);
  const [rows, setRows] = useState<SubRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<SubRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [alsoDeleteSubs, setAlsoDeleteSubs] = useState(false);
  const [q, setQ] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [f, s] = await Promise.all([
        fetchForm({ data: { id: formId } }),
        fetchSubs({ data: { formId } }),
      ]);
      setForm(f);
      setRows(s as SubRow[]);
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  const filteredRows = useMemo(() => {
    if (!rows) return [];
    const s = q.trim().toLowerCase();
    const from = fromDate ? new Date(fromDate).getTime() : null;
    const to = toDate ? new Date(toDate).getTime() + 24 * 3600 * 1000 : null;
    return rows.filter((r) => {
      const t = new Date(r.submitted_at).getTime();
      if (from !== null && t < from) return false;
      if (to !== null && t >= to) return false;
      if (!s) return true;
      return JSON.stringify(r.values ?? {}).toLowerCase().includes(s);
    });
  }, [rows, q, fromDate, toDate]);

  const exportXlsx = () => {
    if (!form) return;
    const cols: XlsxColumn<SubRow>[] = [
      { header: ar ? "التاريخ" : "Date", type: "date", width: 20, get: (r) => r.submitted_at },
      ...form.fields.map<XlsxColumn<SubRow>>((f) => ({
        header: ar ? f.label_ar : f.label_en,
        type: f.type === "number" ? "number" : "text",
        width: 24,
        get: (r) => {
          const v = r.values?.[f.id];
          if (Array.isArray(v)) return v.join(", ");
          if (v === null || v === undefined) return "";
          return v as string | number;
        },
      })),
    ];
    void exportRowsToXlsx<SubRow>({
      rows: filteredRows,
      columns: cols,
      filenameBase: buildXlsxFilename(form.slug),
      sheetName: form.slug.slice(0, 30),
      rtl: ar,
    });
  };

  const handleDelete = async () => {
    try {
      await doDelete({
        data: {
          id: formId,
          deleteSubmissions: (rows?.length ?? 0) > 0 ? alsoDeleteSubs : false,
        },
      });
      toast.success(ar ? "تم الحذف" : "Deleted");
      window.location.href = "/admin/crm/forms";
    } catch (e) {
      toast.error(toUserMessage(e));
    }
  };

  if (loading || !form || !rows) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {ar ? form.name_ar : form.name_en}
          </h3>
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <span>/forms/{form.slug}</span>
            <span>·</span>
            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px]", statusColor(form.status))}>
              {ar ? STATUS_LABELS_AR[form.status] : STATUS_LABELS_EN[form.status]}
            </span>
            <span>·</span>
            <span>{rows.length} {ar ? "استجابة" : "responses"}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {form.status === "published" && (
            <Button variant="outline" size="sm" asChild>
              <a href={`/forms/${form.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" /> {ar ? "معاينة" : "Preview"}
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/forms/$formId/edit" params={{ formId: form.id }}>
              <Pencil className="h-4 w-4" /> {ar ? "تعديل" : "Edit"}
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={exportXlsx} disabled={filteredRows.length === 0}>
            <Download className="h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" className="text-destructive" onClick={() => { setAlsoDeleteSubs(false); setConfirmDelete(true); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder={ar ? "بحث في الاستجابات" : "Search submissions"}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>{ar ? "من" : "From"}</span>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
          <span>{ar ? "إلى" : "To"}</span>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
        </div>
        {(q || fromDate || toDate) && (
          <Button variant="ghost" size="sm" onClick={() => { setQ(""); setFromDate(""); setToDate(""); }}>
            {ar ? "مسح" : "Clear"}
          </Button>
        )}
        <span className="text-xs text-muted-foreground">
          {filteredRows.length} / {rows.length}
        </span>
      </div>

      {filteredRows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
          {rows.length === 0
            ? (ar ? "لا توجد استجابات بعد" : "No submissions yet")
            : (ar ? "لا نتائج مطابقة" : "No matching results")}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="p-2 text-start">{ar ? "التاريخ" : "Date"}</th>
                {form.fields.slice(0, 4).map((f) => (
                  <th key={f.id} className="p-2 text-start">{ar ? f.label_ar : f.label_en}</th>
                ))}
                <th className="p-2 text-start">{ar ? "تفاصيل" : "Details"}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-2 whitespace-nowrap">{new Date(r.submitted_at).toLocaleString()}</td>
                  {form.fields.slice(0, 4).map((f) => {
                    const v = r.values?.[f.id];
                    const disp = Array.isArray(v) ? v.join(", ") : v == null ? "—" : String(v);
                    return <td key={f.id} className="p-2 max-w-xs truncate">{disp}</td>;
                  })}
                  <td className="p-2">
                    <Button size="sm" variant="ghost" onClick={() => setDetail(r)}>{ar ? "عرض" : "View"}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{ar ? "تفاصيل الاستجابة" : "Submission details"}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-muted-foreground">
                {new Date(detail.submitted_at).toLocaleString()}
              </p>
              {(detail.field_snapshot ?? form.fields).map((f) => {
                const v = detail.values?.[f.id];
                const disp = Array.isArray(v) ? v.join(", ") : v == null ? "—" : typeof v === "boolean" ? (v ? "✓" : "✗") : String(v);
                return (
                  <div key={f.id} className="rounded border border-border p-2">
                    <div className="text-xs text-muted-foreground">{ar ? f.label_ar : f.label_en}</div>
                    <div className="text-sm text-foreground whitespace-pre-wrap">{disp}</div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ar ? "حذف النموذج؟" : "Delete form?"}</DialogTitle>
            <DialogDescription>
              {rows.length > 0
                ? ar
                  ? `يحتوي هذا النموذج على ${rows.length} استجابة. لا يمكن حذفه ما لم تختر حذف الاستجابات معه.`
                  : `This form has ${rows.length} submission(s). It cannot be deleted unless you also delete its submissions.`
                : ar
                  ? "لا يمكن التراجع عن هذا الإجراء."
                  : "This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          {rows.length > 0 && (
            <label className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <Checkbox checked={alsoDeleteSubs} onCheckedChange={(v) => setAlsoDeleteSubs(!!v)} className="mt-0.5" />
              <span className="text-destructive">
                {ar
                  ? `نعم، احذف النموذج و ${rows.length} استجابة نهائياً.`
                  : `Yes, permanently delete the form and its ${rows.length} submission(s).`}
              </span>
            </label>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>{ar ? "إلغاء" : "Cancel"}</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={rows.length > 0 && !alsoDeleteSubs}
            >
              {ar ? "حذف" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
