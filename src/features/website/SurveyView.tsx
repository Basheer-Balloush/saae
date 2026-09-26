import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Inbox, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { exportRowsToXlsx, type XlsxColumn } from "@/lib/admin-xlsx-export";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  EmptyState,
  Loading,
  Panel,
  SearchInput,
  StatTile,
  fmtDate,
  fmtNum,
  useT,
} from "@/components/console/ui";

export type SurveyField<R> = {
  key: keyof R & string;
  ar: string;
  en: string;
  /** How to show the value (defaults to plain text). */
  show?: (v: R[keyof R], row: R) => string;
  ltr?: boolean;
  link?: boolean;
  width?: number;
};

type Base = { id: string; created_at: string };

/* One built-in survey's answers: a short list, one answer in full on the
   side, search and Excel export. Replaces the wide 19-column tables. */
export function SurveyView<R extends Base>({
  table,
  fields,
  titleKey,
  subKeys,
  filename,
}: {
  table: "initiative_survey_responses" | "event_survey_responses";
  fields: SurveyField<R>[];
  titleKey: keyof R & string;
  subKeys: (keyof R & string)[];
  filename: string;
}) {
  const { t, ar, lang } = useT();
  const [rows, setRows] = useState<R[] | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<R | null>(null);

  const load = useCallback(async () => {
    setRows(null);
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as unknown as R[]) ?? []);
  }, [table]);
  useEffect(() => {
    load();
  }, [load]);

  const val = (f: SurveyField<R>, r: R) => {
    const v = r[f.key];
    if (f.show) return f.show(v, r);
    if (Array.isArray(v)) return v.join("، ");
    return v === null || v === undefined || v === "" ? "" : String(v);
  };
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => !s || JSON.stringify(r).toLowerCase().includes(s));
  }, [rows, q]);
  const week = (rows ?? []).filter(
    (r) => Date.now() - new Date(r.created_at).getTime() < 7 * 86400000,
  ).length;

  const exportXlsx = () =>
    exportRowsToXlsx<R>({
      filenameBase: filename,
      sheetName: filename.slice(0, 30),
      rtl: ar,
      rows: shown,
      columns: [
        { header: t("التاريخ", "Date"), type: "date", width: 20, get: (r) => r.created_at },
        ...fields.map<XlsxColumn<R>>((f) => ({
          header: ar ? f.ar : f.en,
          type: "text",
          width: f.width ?? 22,
          get: (r) => val(f, r),
        })),
      ],
    });

  return (
    <div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <StatTile
          icon={Inbox}
          label={t("كل الردود", "All answers")}
          value={rows ? fmtNum(rows.length, lang) : "…"}
        />
        <StatTile
          icon={Inbox}
          tone="green"
          label={t("هذا الأسبوع", "This week")}
          value={rows ? fmtNum(week, lang) : "…"}
        />
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder={t("ابحث في الردود", "Search the answers")}
        />
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
                : t("لا توجد ردود بعد", "No answers yet")
            }
          />
        ) : (
          <ul className="divide-y divide-[var(--cx-line-2)]">
            {shown.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setOpen(r)}
                  className="flex w-full items-center gap-3 px-5 py-3 text-start transition-colors hover:bg-[var(--cx-hover)]"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--cx-teal-50)] font-extrabold text-[var(--cx-teal)]">
                    {(String(r[titleKey] ?? "?").trim() || "?").slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold" dir="auto">
                      {String(r[titleKey] ?? "—")}
                    </span>
                    <span
                      className="block truncate text-[12.5px] text-[var(--cx-muted)]"
                      dir="auto"
                    >
                      {subKeys
                        .map((k) => fields.find((f) => f.key === k))
                        .filter(Boolean)
                        .map((f) => val(f!, r))
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </span>
                  </span>
                  <span className="shrink-0 text-[12px] text-[var(--cx-muted)]">
                    {fmtDate(r.created_at, lang)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent
          side={ar ? "left" : "right"}
          className="w-full overflow-y-auto sm:max-w-lg"
          dir={ar ? "rtl" : "ltr"}
        >
          {open && (
            <div className="space-y-3 pb-8">
              <SheetHeader className="text-start">
                <SheetTitle dir="auto">{String(open[titleKey] ?? "—")}</SheetTitle>
                <p className="text-[13px] text-[var(--cx-muted)]">
                  {fmtDate(open.created_at, lang, true)}
                </p>
              </SheetHeader>
              {fields.map((f) => {
                const v = val(f, open);
                if (!v) return null;
                return (
                  <div key={f.key} className="rounded-xl border border-[var(--cx-line)] p-3">
                    <div className="text-[12px] font-bold text-[var(--cx-muted)]">
                      {ar ? f.ar : f.en}
                    </div>
                    {f.link ? (
                      <a
                        href={v}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 block break-all text-[14px] text-[var(--cx-teal)] hover:underline"
                        dir="ltr"
                      >
                        {v}
                      </a>
                    ) : (
                      <div
                        className="mt-0.5 whitespace-pre-wrap text-[14.5px]"
                        dir={f.ltr ? "ltr" : "auto"}
                      >
                        {v}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
