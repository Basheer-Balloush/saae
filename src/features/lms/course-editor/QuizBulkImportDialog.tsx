import { useRef, useState } from "react";
import ExcelJS from "exceljs";
import { Loader2, Upload, Download, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { toUserMessage } from "@/lib/safe-error";
import { buildXlsxFilename, triggerBlobDownload } from "@/lib/admin-xlsx-export";

export type DraftQuestion = {
  question: string;
  choices: string[];
  correct_index: number;
  error?: string;
};

const HEADERS = ["question", "choice_a", "choice_b", "choice_c", "choice_d", "correct"];
const LETTERS = ["A", "B", "C", "D"];

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
      continue;
    }
    if (c === '"') {
      quoted = true;
      continue;
    }
    if (c === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    if (c === "\r") continue;
    cell += c;
  }
  row.push(cell);
  rows.push(row);
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

async function parseXlsx(file: File): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[0];
  const rows: string[][] = [];
  ws?.eachRow((r) => {
    const values = r.values as unknown[];
    const cells: string[] = [];
    for (let i = 1; i <= 6; i++) {
      const v = values[i];
      cells.push(
        v == null
          ? ""
          : typeof v === "object" && v !== null && "text" in (v as Record<string, unknown>)
            ? String((v as { text: unknown }).text ?? "")
            : String(v),
      );
    }
    if (cells.some((c) => c.trim() !== "")) rows.push(cells);
  });
  return rows;
}

function rowsToDrafts(rows: string[][], ar: boolean): DraftQuestion[] {
  const first = rows[0]?.map((c) => c.trim().toLowerCase()) ?? [];
  const hasHeader = first[0] === "question" || first.includes("choice_a");
  const body = hasHeader ? rows.slice(1) : rows;
  return body.map((r) => {
    const question = (r[0] ?? "").trim();
    const choices = [1, 2, 3, 4].map((i) => (r[i] ?? "").trim());
    const raw = (r[5] ?? "").trim().toUpperCase();
    let idx = LETTERS.indexOf(raw);
    if (idx < 0 && /^[1-4]$/.test(raw)) idx = Number(raw) - 1;
    if (idx < 0) idx = choices.findIndex((c) => c && c.toUpperCase() === raw);
    const filled = choices.filter((c) => c !== "").length;
    let error: string | undefined;
    if (!question) error = ar ? "السؤال فارغ" : "Question is empty";
    else if (filled < 2) error = ar ? "خيارات غير كافية (2 على الأقل)" : "Needs at least 2 choices";
    else if (idx < 0 || !choices[idx])
      error = ar ? "الإجابة الصحيحة غير صالحة" : "Invalid correct answer";
    return { question, choices, correct_index: Math.max(0, idx), error };
  });
}

export function QuizBulkImportDialog({
  open,
  onOpenChange,
  quizId,
  startOrder,
  ar,
  onImported,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  quizId: string;
  startOrder: number;
  ar: boolean;
  onImported: () => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<DraftQuestion[]>([]);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);

  const valid = drafts.filter((d) => !d.error);

  const reset = () => setDrafts([]);

  const downloadTemplate = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Questions", { views: [{ state: "frozen", ySplit: 1 }] });
    ws.addRow(HEADERS);
    ws.getRow(1).font = { bold: true };
    ws.columns = [
      { width: 60 },
      { width: 24 },
      { width: 24 },
      { width: 24 },
      { width: 24 },
      { width: 12 },
    ];
    ws.addRow(["What is 2 + 2?", "3", "4", "5", "6", "B"]);
    ws.addRow(["ما هي عاصمة سوريا؟", "حلب", "دمشق", "حمص", "اللاذقية", "B"]);
    const buf = await wb.xlsx.writeBuffer();
    triggerBlobDownload(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      buildXlsxFilename("quiz-questions-template"),
    );
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setParsing(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const rows =
        ext === "csv" || ext === "txt" ? parseCsv(await file.text()) : await parseXlsx(file);
      const list = rowsToDrafts(rows, ar);
      if (list.length === 0) {
        toast.error(ar ? "الملف لا يحتوي على أسئلة" : "No questions found in the file");
      }
      setDrafts(list);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : ar ? "تعذّر قراءة الملف" : "Could not read the file",
      );
    } finally {
      setParsing(false);
    }
  };

  const patch = (i: number, p: Partial<DraftQuestion>) =>
    setDrafts((ds) =>
      ds.map((d, idx) => {
        if (idx !== i) return d;
        const next = { ...d, ...p };
        const filled = next.choices.filter((c) => c.trim() !== "").length;
        let error: string | undefined;
        if (!next.question.trim()) error = ar ? "السؤال فارغ" : "Question is empty";
        else if (filled < 2)
          error = ar ? "خيارات غير كافية (2 على الأقل)" : "Needs at least 2 choices";
        else if (!next.choices[next.correct_index]?.trim())
          error = ar ? "الإجابة الصحيحة غير صالحة" : "Invalid correct answer";
        return { ...next, error };
      }),
    );

  const save = async () => {
    if (valid.length === 0) return;
    setSaving(true);
    const payload = valid.map((d, i) => {
      const trimmed = d.choices.map((c) => c.trim());
      // Empty choices are dropped, so the stored index must be renumbered
      // against the kept choices or it points at the wrong answer.
      const keptBeforeCorrect = trimmed
        .slice(0, d.correct_index)
        .filter((c) => c !== "").length;
      return {
        quiz_id: quizId,
        question: d.question.trim(),
        choices: trimmed.filter((c) => c !== ""),
        correct_index: keptBeforeCorrect,
        display_order: startOrder + i,
      };
    });
    const { error } = await supabase.from("lms_quiz_questions").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(toUserMessage(error));
      return;
    }
    toast.success(ar ? `تمت إضافة ${valid.length} سؤالاً` : `Added ${valid.length} questions`);
    reset();
    onOpenChange(false);
    await onImported();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir={ar ? "rtl" : "ltr"}>
        <DialogHeader className={ar ? "text-right" : "text-left"}>
          <DialogTitle>{ar ? "استيراد أسئلة من ملف" : "Import questions from a file"}</DialogTitle>
          <DialogDescription>
            {ar
              ? "نزّل النموذج، املأ الأسئلة والخيارات وحدّد الإجابة الصحيحة (A أو B أو C أو D)، ثم ارفع الملف. ستراجع الأسئلة قبل الحفظ."
              : "Download the template, fill in the questions and choices, mark the correct answer (A, B, C or D), then upload it. You review everything before saving."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mx-1" />
            {ar ? "تنزيل النموذج" : "Download template"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv"
            className="hidden"
            onChange={handleFile}
          />
          <Button
            type="button"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={parsing}
          >
            {parsing ? (
              <Loader2 className="h-4 w-4 animate-spin mx-1" />
            ) : (
              <Upload className="h-4 w-4 mx-1" />
            )}
            {ar ? "رفع ملف Excel أو CSV" : "Upload Excel or CSV"}
          </Button>
        </div>

        {drafts.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {ar
              ? `${drafts.length} صفًا — ${valid.length} جاهزة للحفظ`
              : `${drafts.length} rows — ${valid.length} ready to save`}
          </p>
        )}

        <div className="space-y-3">
          {drafts.map((d, i) => (
            <div
              key={i}
              className={`rounded-xl border p-3 space-y-2 ${d.error ? "border-destructive/50 bg-destructive/5" : "border-border"}`}
            >
              <div className="flex items-start gap-2">
                <span className="font-bold text-muted-foreground pt-2">{i + 1}.</span>
                <Textarea
                  rows={1}
                  value={d.question}
                  onChange={(e) => patch(i, { question: e.target.value })}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDrafts(drafts.filter((_, x) => x !== i))}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="space-y-1.5 ps-6">
                {d.choices.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`bulk-correct-${i}`}
                      checked={d.correct_index === idx}
                      onChange={() => patch(i, { correct_index: idx })}
                    />
                    <Input
                      value={c}
                      onChange={(e) => {
                        const next = [...d.choices];
                        next[idx] = e.target.value;
                        patch(i, { choices: next });
                      }}
                      className="flex-1 h-8"
                      placeholder={LETTERS[idx]}
                    />
                  </div>
                ))}
              </div>
              {d.error && <p className="text-xs text-destructive ps-6">{d.error}</p>}
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
          >
            {ar ? "إلغاء" : "Cancel"}
          </Button>
          <Button onClick={save} disabled={saving || valid.length === 0}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mx-1" />
            ) : (
              <Plus className="h-4 w-4 mx-1" />
            )}
            {ar ? `حفظ ${valid.length} سؤالاً` : `Save ${valid.length} questions`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
