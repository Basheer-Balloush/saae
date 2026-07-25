import { createFileRoute } from "@tanstack/react-router";
import { toUserMessage } from "@/lib/safe-error";
import { useEffect, useState } from "react";
import { Plus, Trash2, Ticket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/learning-management-system/admin/coupons")({
  head: () => ({ meta: [{ title: "Training & Learning Platform Admin · Coupons" }] }),
  component: AdminCoupons,
});

type Coupon = { id: string; code: string; percent_off: number; max_uses: number | null; used_count: number; active: boolean; expires_at: string | null };

function AdminCoupons() {
  const { lang } = useLang();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [code, setCode] = useState("");
  const [pct, setPct] = useState("10");
  const [maxUses, setMaxUses] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("lms_coupons").select("*").order("created_at", { ascending: false });
    setCoupons((data as Coupon[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!code.trim()) return;
    const { error } = await supabase.from("lms_coupons").insert({
      code: code.trim().toUpperCase(),
      percent_off: parseInt(pct) || 10,
      max_uses: maxUses ? parseInt(maxUses) : null,
    });
    if (error) toast.error(toUserMessage(error));
    else { toast.success(lang === "ar" ? "تم إنشاء الكوبون" : "Coupon created"); setCode(""); setMaxUses(""); load(); }
  };

  const toggle = async (id: string, active: boolean) => {
    await supabase.from("lms_coupons").update({ active }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("lms_coupons").delete().eq("id", id);
    load();
  };

  if (loading) return <p className="text-center py-20 text-muted-foreground">{lang === "ar" ? "جارٍ التحميل..." : "Loading...‎"}</p>;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center gap-3 mb-6">
        <Ticket className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">{lang === "ar" ? "أكواد الخصم" : "Coupons"}</h1>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 mb-6">
        <h2 className="font-bold text-foreground mb-4">{lang === "ar" ? "إنشاء كوبون" : "Create coupon"}</h2>
        <div className="grid sm:grid-cols-4 gap-3">
          <Input placeholder={lang === "ar" ? "الكود" : "Code"} value={code} onChange={(e) => setCode(e.target.value)} />
          <Input type="number" placeholder="% off" value={pct} onChange={(e) => setPct(e.target.value)} />
          <Input type="number" placeholder={lang === "ar" ? "حد الاستخدام (اختياري)" : "Max uses (opt)"} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
          <Button onClick={create}><Plus className="h-4 w-4 mx-1" />{lang === "ar" ? "إضافة" : "Add"}</Button>
        </div>
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
            <Switch checked={c.active} onCheckedChange={(v) => toggle(c.id, v)} />
            <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
