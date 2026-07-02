import { createFileRoute, Link } from "@tanstack/react-router";
import { requireAdminBeforeLoad } from "@/lib/admin-route-guard";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/initiative-survey")({
  ssr: false,
  beforeLoad: requireAdminBeforeLoad,
  head: () => ({ meta: [{ title: "إدارة استبيان المبادرة" }] }),
  component: AdminSurvey,
});

type Row = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  heard_from: string | null;
  ai_relationship: string | null;
  learning_interests: string[] | null;
  biggest_obstacle: string | null;
  learning_method: string | null;
  device: string | null;
  commitment_level: number | null;
  main_motivation: string | null;
  current_status: string | null;
  extra_notes: string | null;
  subscription_type: string | null;
  created_at: string;
};

const SUB_LABEL: Record<string, string> = {
  waitlist: "قائمة الانتظار",
  self: "ادفع عن نفسي",
  self_and_donate: "دفع + تبرّع",
};

function AdminSurvey() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

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

  const downloadCSV = () => {
    if (!rows.length) { toast.info("لا توجد بيانات"); return; }
    const headers = [
      "created_at", "full_name", "email", "phone", "heard_from", "ai_relationship",
      "learning_interests", "biggest_obstacle", "learning_method", "device",
      "commitment_level", "main_motivation", "current_status", "subscription_type", "extra_notes",
    ];
    const esc = (v: any) => {
      if (v === null || v === undefined) return "";
      const s = Array.isArray(v) ? v.join(" | ") : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => esc((r as any)[h])).join(",")),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `initiative-survey-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div dir="rtl" className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link to="/admin"><Button variant="ghost"><ArrowLeft className="h-4 w-4 ms-2 rotate-180" />العودة</Button></Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ms-2 ${loading ? "animate-spin" : ""}`} /> تحديث
          </Button>
          <Button onClick={downloadCSV}>
            <Download className="h-4 w-4 ms-2" /> تنزيل CSV
          </Button>
        </div>
      </div>

      <h1 className="text-3xl font-bold mt-4">استبيان المبادرة</h1>
      <p className="text-muted-foreground mt-1">إجمالي الردود: <span className="font-bold text-foreground">{rows.length}</span></p>

      <div className="mt-6 rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm min-w-[1400px]">
          <thead className="bg-muted/50">
            <tr className="text-start">
              <Th>التاريخ</Th><Th>الاسم</Th><Th>الهاتف</Th><Th>البريد</Th>
              <Th>نمط الاشتراك</Th><Th>الوضع</Th><Th>الدافع</Th>
              <Th>الالتزام</Th><Th>الجهاز</Th><Th>الطريقة</Th>
              <Th>العائق</Th><Th>الاهتمامات</Th><Th>علاقته بالـAI</Th>
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
                <Td>{SUB_LABEL[r.subscription_type || ""] || r.subscription_type}</Td>
                <Td>{r.current_status}</Td>
                <Td>{r.main_motivation}</Td>
                <Td className="text-center">{r.commitment_level ?? "—"}/5</Td>
                <Td>{r.device}</Td>
                <Td>{r.learning_method}</Td>
                <Td>{r.biggest_obstacle}</Td>
                <Td>{(r.learning_interests || []).join("، ")}</Td>
                <Td>{r.ai_relationship}</Td>
                <Td>{r.heard_from}</Td>
                <Td className="max-w-[240px] whitespace-pre-wrap">{r.extra_notes}</Td>
              </tr>
            ))}
            {!loading && !rows.length && (
              <tr><td colSpan={15} className="p-8 text-center text-muted-foreground">لا توجد ردود بعد</td></tr>
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
