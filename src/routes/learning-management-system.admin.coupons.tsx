import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2, Ticket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/learning-management-system/admin/coupons")({
  head: () => ({ meta: [{ title: "Training & Learning Platform Admin · Coupons" }] }),
  component: AdminCoupons,
});

type Coupon = { id: string; code: string; percent_off: number; max_uses: number | null; used_count: number; active: boolean; expires_at: string | null };

function AdminCoupons() {
  const { lang } = useLang();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("lms_coupons").select("*").order("created_at", { ascending: false });
    setCoupons((data as Coupon[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // Phase 8 (Branch A) — mutations disabled. Handlers preserved but no-op so
  // the UI can render controls in a disabled state without accidental writes.
  const toggle = async (_id: string, _active: boolean) => { /* disabled */ };
  const remove = async (_id: string) => { /* disabled */ };

  if (loading) return <p className="text-center py-20 text-muted-foreground">{lang === "ar" ? "جارٍ التحميل..." : "Loading...‎"}</p>;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center gap-3 mb-6">
        <Ticket className="h-7 w-7 text-muted-foreground" />
        <h1 className="text-2xl font-bold text-foreground">{lang === "ar" ? "أكواد الخصم (أرشيف)" : "Coupons (archived)"}</h1>
      </div>

      {/* Phase 8 (Branch A) — Coupons are inactive. Enrollment is manual-approval only, so
          there is no checkout to apply a discount against. The list below is retained for
          historical audit. Creating new codes is disabled. */}
      <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-4 mb-6 text-sm text-amber-900 dark:text-amber-200">
        {lang === "ar"
          ? "نظام الدفع يعمل حالياً بالموافقة اليدوية فقط، لذلك لم تعُد أكواد الخصم مفعّلة. تُعرض السجلات التالية للأرشيف فقط."
          : "Enrollment currently runs on manual approval only, so discount codes are no longer applied at checkout. The records below are shown for archival reference only."}
      </div>


      <div className="rounded-2xl border border-border bg-card divide-y divide-border">
        {coupons.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">—</p>}
        {coupons.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1">
              <div className="font-mono font-bold text-foreground">{c.code}</div>
              <div className="text-xs text-muted-foreground">
                {c.percent_off}% off · {lang === "ar" ? "استُخدم" : "used"} {c.used_count}{c.max_uses ? `/${c.max_uses}` : ""}
              </div>
            </div>
            <Switch checked={c.active} disabled onCheckedChange={(v) => toggle(c.id, v)} />
            <Button size="icon" variant="ghost" disabled onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
