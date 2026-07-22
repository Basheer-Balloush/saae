import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Download, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { exportRowsToXlsx, type XlsxColumn } from "@/lib/admin-xlsx-export";

type Row = {
  id: string;
  project_name: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  website: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  field: string | null;
  description: string | null;
  problem_solved: string | null;
  stage: string | null;
  team_size: string | null;
  notes: string | null;
  created_at: string;
};

const COLUMNS: XlsxColumn<Row>[] = [
  { header: "التاريخ", type: "date", width: 20, get: (r) => r.created_at },
  { header: "اسم المشروع", type: "text", width: 26, get: (r) => r.project_name },
  { header: "المسؤول", type: "text", width: 22, get: (r) => r.contact_name },
  { header: "الهاتف", type: "text", width: 18, get: (r) => r.phone },
  { header: "البريد", type: "text", width: 28, get: (r) => r.email },
  { header: "المدينة", type: "text", width: 16, get: (r) => r.city },
  { header: "الموقع", type: "text", width: 30, get: (r) => r.website },
  { header: "Facebook", type: "text", width: 30, get: (r) => r.facebook_url },
  { header: "Instagram", type: "text", width: 30, get: (r) => r.instagram_url },
  { header: "LinkedIn", type: "text", width: 30, get: (r) => r.linkedin_url },
  { header: "المجال", type: "text", width: 20, get: (r) => r.field },
  { header: "الوصف", type: "text", width: 40, get: (r) => r.description },
  { header: "المشكلة التي يحلها", type: "text", width: 40, get: (r) => r.problem_solved },
  { header: "المرحلة", type: "text", width: 16, get: (r) => r.stage },
  { header: "حجم الفريق", type: "text", width: 14, get: (r) => r.team_size },
  { header: "ملاحظات", type: "text", width: 40, get: (r) => r.notes },
];

export function EventSurveyDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("event_survey_responses")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as Row[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const exportXlsx = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportRowsToXlsx<Row>({
        filenameBase: "event-survey",
        sheetName: "استبيان المشاريع",
        rtl: true,
        columns: COLUMNS,
        rows,
      });
      if (!rows.length) toast.info("لا توجد بيانات — تم تنزيل ملف بالعناوين فقط");
      else toast.success("تم التصدير");
    } catch (e) {
      toast.error("تعذّر إنشاء الملف");
      console.error("event-survey export failed", e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-muted-foreground">
          إجمالي الردود: <span className="font-bold text-foreground">{rows.length}</span>
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ms-2 ${loading ? "animate-spin" : ""}`} /> تحديث
          </Button>
          <Button onClick={exportXlsx} disabled={exporting} aria-label="تنزيل ملف Excel">
            <Download className="h-4 w-4 ms-2" /> {exporting ? "جارٍ التصدير..." : "تنزيل Excel"}
            <Download className="h-4 w-4 ms-2" /> تنزيل CSV
          </Button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm min-w-[1100px]">
          <thead className="bg-muted/50">
            <tr>
              <Th>التاريخ</Th>
              <Th>المشروع</Th>
              <Th>المسؤول</Th>
              <Th>الهاتف</Th>
              <Th>البريد</Th>
              <Th>المدينة</Th>
              <Th>المجال</Th>
              <Th>المرحلة</Th>
              <Th>الفريق</Th>
              <Th> </Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border align-top hover:bg-muted/30">
                <Td>{new Date(r.created_at).toLocaleDateString("ar")}</Td>
                <Td className="font-medium">{r.project_name}</Td>
                <Td>{r.contact_name}</Td>
                <Td dir="ltr">{r.phone}</Td>
                <Td dir="ltr">{r.email}</Td>
                <Td>{r.city}</Td>
                <Td>{r.field}</Td>
                <Td>{r.stage}</Td>
                <Td>{r.team_size}</Td>
                <Td>
                  <Button size="sm" variant="outline" onClick={() => setSelected(r)}>
                    التفاصيل
                  </Button>
                </Td>
              </tr>
            ))}
            {!loading && !rows.length && (
              <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">لا توجد ردود بعد</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{selected.project_name}</h2>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>✕</Button>
            </div>
            <div className="space-y-3 text-sm">
              <Field label="تاريخ الإرسال" value={new Date(selected.created_at).toLocaleString("ar")} />
              <Field label="اسم المسؤول" value={selected.contact_name} />
              <Field label="رقم الهاتف" value={selected.phone} ltr />
              <Field label="البريد الإلكتروني" value={selected.email} ltr />
              <Field label="المدينة" value={selected.city} />
              <LinkField label="الموقع الإلكتروني" value={selected.website} />
              <LinkField label="Facebook" value={selected.facebook_url} />
              <LinkField label="Instagram" value={selected.instagram_url} />
              <LinkField label="LinkedIn" value={selected.linkedin_url} />
              <Field label="مجال العمل" value={selected.field} />
              <Field label="وصف المشروع" value={selected.description} multiline />
              <Field label="المشكلة التي يحلها" value={selected.problem_solved} multiline />
              <Field label="المرحلة الحالية" value={selected.stage} />
              <Field label="عدد أفراد الفريق" value={selected.team_size} />
              <Field label="ملاحظات" value={selected.notes} multiline />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="p-3 text-start whitespace-nowrap font-semibold text-xs uppercase tracking-wide text-muted-foreground">{children}</th>;
}
function Td({ children, className = "", ...rest }: React.HTMLAttributes<HTMLTableCellElement>) {
  return <td className={`p-3 ${className}`} {...rest}>{children}</td>;
}

function Field({ label, value, ltr, multiline }: { label: string; value: string | null; ltr?: boolean; multiline?: boolean }) {
  return (
    <div className="border-b border-border pb-2">
      <div className="text-xs font-semibold text-muted-foreground mb-1">{label}</div>
      <div
        dir={ltr ? "ltr" : undefined}
        className={`text-foreground ${multiline ? "whitespace-pre-wrap" : ""}`}
      >
        {value || <span className="text-muted-foreground italic">—</span>}
      </div>
    </div>
  );
}

function LinkField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="border-b border-border pb-2">
      <div className="text-xs font-semibold text-muted-foreground mb-1">{label}</div>
      {value ? (
        <a href={value} target="_blank" rel="noreferrer" dir="ltr"
           className="text-primary hover:underline inline-flex items-center gap-1 break-all">
          {value} <ExternalLink className="h-3 w-3" />
        </a>
      ) : <span className="text-muted-foreground italic">—</span>}
    </div>
  );
}
