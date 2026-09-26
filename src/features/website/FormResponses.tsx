import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, Inbox, RefreshCw } from "lucide-react";
import { toUserMessage } from "@/lib/safe-error";
import type { DynamicForm, FormField } from "@/lib/dynamic-forms";
import { listDynamicFormSubmissions } from "@/lib/dynamic-forms.functions";
import { buildXlsxFilename, exportRowsToXlsx, type XlsxColumn } from "@/lib/admin-xlsx-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  EmptyState,
  Loading,
  Panel,
  SearchInput,
  fmtDate,
  fmtNum,
  useT,
} from "@/components/console/ui";

type Sub = {
  id: string;
  values: Record<string, unknown>;
  field_snapshot: FormField[];
  submitted_at: string;
};

const show = (v: unknown, yes: string, no: string) =>
  Array.isArray(v)
    ? v.join("، ")
    : v == null || v === ""
      ? "—"
      : typeof v === "boolean"
        ? v
          ? yes
          : no
        : String(v);

/* The answers one form has collected: search, date range, read one, export all. */
export function FormResponses({
  form,
  onCount,
}: {
  form: DynamicForm;
  onCount?: (n: number) => void;
}) {
  const { t, ar, lang } = useT();
  const fetchSubs = useServerFn(listDynamicFormSubmissions);
  const [rows, setRows] = useState<Sub[] | null>(null);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [open, setOpen] = useState<Sub | null>(null);

  const load = useCallback(async () => {
    setRows(null);
    try {
      const s = (await fetchSubs({ data: { formId: form.id } })) as Sub[];
      setRows(s);
      onCount?.(s.length);
    } catch (e) {
      toast.error(toUserMessage(e));
      setRows([]);
    }
  }, [fetchSubs, form.id, onCount]);
  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    const a = from ? new Date(from).getTime() : null;
    const b = to ? new Date(to).getTime() + 86400000 : null;
    return (rows ?? []).filter((r) => {
      const at = new Date(r.submitted_at).getTime();
      if (a !== null && at < a) return false;
      if (b !== null && at >= b) return false;
      return (
        !s ||
        JSON.stringify(r.values ?? {})
          .toLowerCase()
          .includes(s)
      );
    });
  }, [rows, q, from, to]);

  const label = (f: FormField) => (ar ? f.label_ar || f.label_en : f.label_en || f.label_ar);
  const cols = form.fields.slice(0, 3);

  const exportXlsx = () => {
    const columns: XlsxColumn<Sub>[] = [
      { header: t("التاريخ", "Date"), type: "date", width: 20, get: (r) => r.submitted_at },
      ...form.fields.map<XlsxColumn<Sub>>((f) => ({
        header: label(f),
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
    void exportRowsToXlsx<Sub>({
      rows: shown,
      columns,
      filenameBase: buildXlsxFilename(form.slug),
      sheetName: form.slug.slice(0, 30),
      rtl: ar,
    });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder={t("ابحث في الإجابات", "Search the answers")}
          />
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-10 w-[150px]"
            aria-label={t("من", "From")}
          />
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-10 w-[150px]"
            aria-label={t("إلى", "To")}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load} aria-label={t("تحديث", "Refresh")}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={exportXlsx} disabled={!shown.length}>
            <Download className="h-4 w-4" />
            {t("تصدير Excel", "Export Excel")}
          </Button>
        </div>
      </div>
      <Panel flush>
        {rows === null ? (
          <Loading />
        ) : shown.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={
              rows.length
                ? t("لا نتائج مطابقة", "No matching answers")
                : t("لا توجد إجابات بعد", "No answers yet")
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="cx-table min-w-[640px]">
              <thead>
                <tr>
                  <th>{t("التاريخ", "Date")}</th>
                  {cols.map((f) => (
                    <th key={f.id}>{label(f)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} data-link="true" onClick={() => setOpen(r)}>
                    <td className="whitespace-nowrap text-[13px] text-[var(--cx-muted)]">
                      {fmtDate(r.submitted_at, lang, true)}
                    </td>
                    {cols.map((f) => (
                      <td key={f.id} className="max-w-[260px] truncate" dir="auto">
                        {show(r.values?.[f.id], t("نعم", "Yes"), t("لا", "No"))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {rows && (
        <p className="mt-2 text-[12.5px] text-[var(--cx-muted)]">
          {fmtNum(shown.length, lang)} / {fmtNum(rows.length, lang)}
        </p>
      )}

      <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent
          side={ar ? "left" : "right"}
          className="w-full overflow-y-auto sm:max-w-lg"
          dir={ar ? "rtl" : "ltr"}
        >
          {open && (
            <div className="space-y-3 pb-8">
              <SheetHeader className="text-start">
                <SheetTitle>{t("إجابة", "Answer")}</SheetTitle>
                <p className="text-[13px] text-[var(--cx-muted)]">
                  {fmtDate(open.submitted_at, lang, true)}
                </p>
              </SheetHeader>
              {(open.field_snapshot?.length ? open.field_snapshot : form.fields).map((f) => (
                <div key={f.id} className="rounded-xl border border-[var(--cx-line)] p-3">
                  <div className="text-[12px] font-bold text-[var(--cx-muted)]">{label(f)}</div>
                  <div className="mt-0.5 whitespace-pre-wrap text-[14.5px]" dir="auto">
                    {show(open.values?.[f.id], t("نعم", "Yes"), t("لا", "No"))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
