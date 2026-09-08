import type ExcelJS from "exceljs";

export type XlsxColumn<T> = {
  header: string;
  key?: string;
  width?: number;
  type?: "text" | "number" | "date" | "boolean";
  get: (row: T) => unknown;
};

export type ExportOpts<T> = {
  filenameBase: string;
  sheetName: string;
  rtl?: boolean;
  columns: XlsxColumn<T>[];
  rows: T[];
  boolLabels?: { true: string; false: string };
};

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Excel worksheet names: max 31 chars, cannot contain : \ / ? * [ ]
function sanitizeSheetName(name: string): string {
  return (name.replace(/[:\\/?*[\]]/g, " ").trim() || "Sheet1").slice(0, 31);
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function buildXlsxFilename(base: string): string {
  const safeBase =
    base
      .normalize("NFKD")
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "export";
  const d = new Date();
  const ts = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
  return `${safeBase}_${ts}.xlsx`;
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke on next tick so the download starts reliably.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// Prefix with a single apostrophe so Excel treats the text literally and
// never evaluates it as a formula. Applied only to text-typed cells.
function safeText(s: string): string {
  if (!s) return s;
  const first = s.charCodeAt(0);
  // = + - @ TAB CR
  if (first === 61 || first === 43 || first === 45 || first === 64 || first === 9 || first === 13) {
    return `'${s}`;
  }
  return s;
}

function toCellValue<T>(col: XlsxColumn<T>, row: T): ExcelJS.CellValue {
  const raw = col.get(row);
  if (raw === null || raw === undefined) return "";
  const type = col.type ?? "text";

  if (type === "number") {
    if (raw === "") return "";
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : "";
  }

  if (type === "boolean") return typeof raw === "boolean" ? raw : Boolean(raw);

  if (type === "date") {
    if (raw instanceof Date) return raw;
    if (typeof raw === "string" || typeof raw === "number") {
      const d = new Date(raw);
      return isNaN(d.getTime()) ? "" : d;
    }
    return "";
  }

  // text
  let s: string;
  if (Array.isArray(raw)) s = raw.map((v) => (v == null ? "" : String(v))).join(", ");
  else if (typeof raw === "object") {
    try {
      s = JSON.stringify(raw);
    } catch {
      s = "";
    }
  } else s = String(raw);
  return safeText(s);
}

export async function exportRowsToXlsx<T>(opts: ExportOpts<T>): Promise<void> {
  const { filenameBase, sheetName, rtl = false, columns, rows, boolLabels } = opts;

  const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  const ws = wb.addWorksheet(sanitizeSheetName(sheetName), {
    views: [{ rightToLeft: rtl }],
  });

  // Header row
  ws.addRow(columns.map((c) => c.header));
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", horizontal: rtl ? "right" : "left" };

  // Column widths and default number formats.
  ws.columns = columns.map((c) => {
    const width = Math.min(Math.max(c.width ?? 22, 12), 60);
    const col: Partial<ExcelJS.Column> = { width };
    if (c.type === "date") col.numFmt = "yyyy-mm-dd hh:mm";
    return col as ExcelJS.Column;
  });

  const trueLabel = boolLabels?.true ?? (rtl ? "نعم" : "Yes");
  const falseLabel = boolLabels?.false ?? (rtl ? "لا" : "No");

  for (const row of rows) {
    const values = columns.map((c) => {
      const v = toCellValue(c, row);
      if (c.type === "boolean" && typeof v === "boolean") return v ? trueLabel : falseLabel;
      return v;
    });
    ws.addRow(values);
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: XLSX_MIME });
  triggerBlobDownload(blob, buildXlsxFilename(filenameBase));
}
