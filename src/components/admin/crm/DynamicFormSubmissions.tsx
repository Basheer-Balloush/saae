import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Download, RefreshCw, Pencil, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useLang } from "@/lib/i18n";
import { toUserMessage } from "@/lib/safe-error";
import type { DynamicForm, FormField } from "@/lib/dynamic-forms";
import {
  deleteDynamicForm,
  getDynamicFormById,
  listDynamicFormSubmissions,
} from "@/lib/dynamic-forms.functions";
import { buildXlsxFilename, exportRowsToXlsx, type XlsxColumn } from "@/lib/admin-xlsx-export";

type SubRow = { id: string; values: Record<string, unknown>; field_snapshot: FormField[]; submitted_at: string };

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

  const exportXlsx = () => {
    if (!form || !rows) return;
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
      rows,
      columns: cols,
      filenameBase: buildXlsxFilename(form.slug),
      sheetName: form.slug.slice(0, 30),
      rtl: ar,
    });
  };

  const handleDelete = async () => {
    try {
      await doDelete({ data: { id: formId } });
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
          <p className="text-xs text-muted-foreground">
            /forms/{form.slug} · {form.status === "published" ? (ar ? "منشور" : "Published") : (ar ? "مسودة" : "Draft")} · {rows.length} {ar ? "استجابة" : "responses"}
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
            <Link to="/admin/crm/forms/$formSlug/edit" params={{ formSlug: form.slug }}>
              <Pencil className="h-4 w-4" /> {ar ? "تعديل" : "Edit"}
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={exportXlsx} disabled={rows.length === 0}>
            <Download className="h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" className="text-destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
          {ar ? "لا توجد استجابات بعد" : "No submissions yet"}
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
              {rows.map((r) => (
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
              {ar ? "سيتم حذف النموذج وكل الاستجابات نهائياً." : "The form and all its submissions will be permanently deleted."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>{ar ? "إلغاء" : "Cancel"}</Button>
            <Button variant="destructive" onClick={handleDelete}>{ar ? "حذف" : "Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
