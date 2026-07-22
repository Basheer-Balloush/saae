import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { exportRowsToXlsx, type XlsxColumn } from "@/lib/admin-xlsx-export";

type Row = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  specialization: string | null;
  heard_from: string | null;
  ai_relationship: string | null;
  ai_tools_used: string | null;
  learning_interests: string[] | null;
  biggest_obstacle: string | null;
  learning_method: string | null;
  device: string | null;
  commitment_level: number | null;
  main_motivation: string | null;
  current_status: string | null;
  extra_notes: string | null;
  subscription_type: string | null;
  donation_amount: number | null;
  created_at: string;
};

const SUB_LABEL: Record<string, string> = {
  waitlist: "قائمة الانتظار",
  self: "ادفع عن نفسي",
  self_and_donate: "دفع + تبرّع",
};

const COLUMNS: XlsxColumn<Row>[] = [
  { header: "التاريخ", type: "date", width: 20, get: (r) => r.created_at },
  { header: "الاسم", type: "text", width: 26, get: (r) => r.full_name },
  { header: "الهاتف", type: "text", width: 18, get: (r) => r.phone },
  { header: "البريد", type: "text", width: 28, get: (r) => r.email },
  { header: "العنوان", type: "text", width: 24, get: (r) => r.address },
  { header: "الاختصاص", type: "text", width: 20, get: (r) => r.specialization },
  {
    header: "نمط الاشتراك",
    type: "text",
    width: 18,
    get: (r) => (r.subscription_type ? SUB_LABEL[r.subscription_type] ?? r.subscription_type : ""),
  },
  { header: "مبلغ التبرّع", type: "number", width: 14, get: (r) => r.donation_amount },
  { header: "الوضع", type: "text", width: 18, get: (r) => r.current_status },
  { header: "الدافع", type: "text", width: 24, get: (r) => r.main_motivation },
  { header: "الالتزام", type: "number", width: 12, get: (r) => r.commitment_level },
  { header: "الجهاز", type: "text", width: 14, get: (r) => r.device },
  { header: "الطريقة", type: "text", width: 16, get: (r) => r.learning_method },
  { header: "العائق", type: "text", width: 24, get: (r) => r.biggest_obstacle },
  { header: "الاهتمامات", type: "text", width: 30, get: (r) => r.learning_interests },
  { header: "علاقته بالـAI", type: "text", width: 20, get: (r) => r.ai_relationship },
  { header: "أدوات استخدمها", type: "text", width: 24, get: (r) => r.ai_tools_used },
  { header: "سمع من", type: "text", width: 18, get: (r) => r.heard_from },
  { header: "ملاحظات", type: "text", width: 40, get: (r) => r.extra_notes },
];

export function InitiativeSurveyDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("initiative_survey_responses")
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
        filenameBase: "initiative-survey",
        sheetName: "استبيان المبادرة",
        rtl: true,
        columns: COLUMNS,
        rows,
      });
      if (!rows.length) toast.info("لا توجد بيانات — تم تنزيل ملف بالعناوين فقط");
      else toast.success("تم التصدير");
    } catch (e) {
      toast.error("تعذّر إنشاء الملف");
      console.error("initiative-survey export failed", e);
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
          </Button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm min-w-[1400px]">
          <thead className="bg-muted/50">
            <tr className="text-start">
              <Th>التاريخ</Th><Th>الاسم</Th><Th>الهاتف</Th><Th>البريد</Th>
              <Th>العنوان</Th><Th>الاختصاص</Th>
              <Th>نمط الاشتراك</Th><Th>مبلغ التبرّع</Th><Th>الوضع</Th><Th>الدافع</Th>
              <Th>الالتزام</Th><Th>الجهاز</Th><Th>الطريقة</Th>
              <Th>العائق</Th><Th>الاهتمامات</Th><Th>علاقته بالـAI</Th>
              <Th>أدوات استخدمها</Th>
              <Th>سمع من</Th><Th>ملاحظات</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border align-top">
                <Td>{new Date(r.created_at).toLocaleDateString("ar")}</Td>
                <Td className="font-medium">{r.full_name}</Td>
                <Td dir="ltr">{r.phone}</Td>
                <Td dir="ltr">{r.email}</Td>
                <Td>{r.address}</Td>
                <Td>{r.specialization}</Td>
                <Td>{SUB_LABEL[r.subscription_type || ""] || r.subscription_type}</Td>
                <Td>{r.donation_amount ? `$${r.donation_amount}` : "—"}</Td>
                <Td>{r.current_status}</Td>
                <Td>{r.main_motivation}</Td>
                <Td className="text-center">{r.commitment_level ?? "—"}/5</Td>
                <Td>{r.device}</Td>
                <Td>{r.learning_method}</Td>
                <Td>{r.biggest_obstacle}</Td>
                <Td>{(r.learning_interests || []).join("، ")}</Td>
                <Td>{r.ai_relationship}</Td>
                <Td>{r.ai_tools_used}</Td>
                <Td>{r.heard_from}</Td>
                <Td className="max-w-[240px] whitespace-pre-wrap">{r.extra_notes}</Td>
              </tr>
            ))}
            {!loading && !rows.length && (
              <tr><td colSpan={19} className="p-8 text-center text-muted-foreground">لا توجد ردود بعد</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="p-3 text-start whitespace-nowrap font-semibold text-xs uppercase tracking-wide text-muted-foreground">{children}</th>;
}
function Td({ children, className = "", ...rest }: React.HTMLAttributes<HTMLTableCellElement>) {
  return <td className={`p-3 ${className}`} {...rest}>{children}</td>;
}
