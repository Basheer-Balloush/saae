import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/learning-management-system/admin/payouts")({
  head: () => ({ meta: [{ title: "LMS Admin · Payouts" }] }),
  component: AdminPayouts,
});

type Row = { id: string; instructor_id: string; amount: number; status: string; method: string | null; notes: string | null; created_at: string };

function AdminPayouts() {
  const { lang } = useLang();
  const [rows, setRows] = useState<Row[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("lms_payouts").select("*").order("created_at", { ascending: false });
    const list = (data as Row[]) ?? [];
    setRows(list);
    const ids = Array.from(new Set(list.map((r) => r.instructor_id)));
    if (ids.length) {
      const { data: ins } = await supabase.from("lms_instructors").select("user_id,full_name").in("user_id", ids);
      const map: Record<string, string> = {};
      (ins as { user_id: string; full_name: string }[] | null)?.forEach((i) => { map[i.user_id] = i.full_name; });
      setNames(map);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const act = async (id: string, approve: boolean) => {
    const { error } = await supabase.rpc("lms_process_payout", { _payout_id: id, _approve: approve });
    if (error) toast.error(error.message);
    else { toast.success(approve ? (lang === "ar" ? "تمت الموافقة" : "Approved") : (lang === "ar" ? "تم الرفض" : "Rejected")); load(); }
  };

  if (loading) return <p className="text-center py-20 text-muted-foreground">{lang === "ar" ? "جارٍ التحميل..." : "Loading...‎"}</p>;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-2xl font-bold text-foreground mb-6">{lang === "ar" ? "طلبات السحب" : "Payout Requests"}</h1>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {rows.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">{lang === "ar" ? "لا توجد طلبات" : "No requests"}</p>}
        <div className="divide-y divide-border">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-4 px-4 py-4">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground">{names[r.instructor_id] ?? r.instructor_id.slice(0, 8)}</div>
                <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()} {r.method && `· ${r.method}`}</div>
                {r.notes && <div className="text-xs text-muted-foreground mt-1">{r.notes}</div>}
              </div>
              <div className="text-lg font-bold text-foreground">{Number(r.amount).toLocaleString()} SYP</div>
              {r.status === "pending" ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="default" onClick={() => act(r.id, true)}><Check className="h-4 w-4" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => act(r.id, false)}><X className="h-4 w-4" /></Button>
                </div>
              ) : (
                <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${
                  r.status === "paid" ? "bg-emerald-500/10 text-emerald-500" :
                  r.status === "rejected" ? "bg-rose-500/10 text-rose-500" :
                  "bg-amber-500/10 text-amber-500"
                }`}>{r.status}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
