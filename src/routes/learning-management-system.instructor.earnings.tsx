import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DollarSign, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/learning-management-system/instructor/earnings")({
  head: () => ({ meta: [{ title: "LMS · Earnings" }] }),
  component: EarningsPage,
});

type Wallet = { balance: number; pending_payout: number };
type Earning = { id: string; course_id: string; gross: number; commission: number; net: number; created_at: string };
type Payout = { id: string; amount: number; status: string; created_at: string; method: string | null };

function EarningsPage() {
  const { user } = useLmsAuth();
  const { lang } = useLang();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [minPayout, setMinPayout] = useState(50000);

  const load = async () => {
    if (!user) return;
    const [{ data: w }, { data: e }, { data: p }, { data: s }] = await Promise.all([
      supabase.from("lms_wallets").select("balance,pending_payout").eq("user_id", user.id).maybeSingle(),
      supabase.from("lms_instructor_earnings").select("id,course_id,gross,commission,net,created_at").eq("instructor_id", user.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("lms_payouts").select("id,amount,status,created_at,method").eq("instructor_id", user.id).order("created_at", { ascending: false }),
      supabase.from("lms_settings").select("min_payout").eq("id", true).maybeSingle(),
    ]);
    setWallet((w as Wallet) ?? { balance: 0, pending_payout: 0 });
    setEarnings((e as Earning[]) ?? []);
    setPayouts((p as Payout[]) ?? []);
    if (s) setMinPayout(Number((s as { min_payout: number }).min_payout));
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const requestPayout = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("lms_request_payout", { _amount: amt, _method: method || undefined });
      if (error) throw error;
      toast.success(lang === "ar" ? "تم تقديم طلب السحب" : "Payout request submitted");
      setAmount(""); setMethod("");
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally { setSubmitting(false); }
  };

  if (loading) return <p className="text-center py-20 text-muted-foreground">{lang === "ar" ? "جارٍ التحميل..." : "Loading...‎"}</p>;

  const total = earnings.reduce((s, x) => s + Number(x.net), 0);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <DollarSign className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">{lang === "ar" ? "أرباحي" : "My Earnings"}</h1>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Stat label={lang === "ar" ? "الرصيد المتاح" : "Available"} value={wallet?.balance ?? 0} highlight />
        <Stat label={lang === "ar" ? "قيد السحب" : "Pending payout"} value={wallet?.pending_payout ?? 0} />
        <Stat label={lang === "ar" ? "إجمالي الأرباح" : "Lifetime earnings"} value={total} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 mb-8">
        <h2 className="font-bold text-foreground mb-1">{lang === "ar" ? "طلب سحب" : "Request payout"}</h2>
        <p className="text-xs text-muted-foreground mb-4">{lang === "ar" ? `الحد الأدنى ${minPayout.toLocaleString()} ل.س` : `Minimum ${minPayout.toLocaleString()} SYP`}</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <Input type="number" placeholder={lang === "ar" ? "المبلغ" : "Amount"} value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Input placeholder={lang === "ar" ? "طريقة الاستلام (شام كاش، حوالة...)" : "Payment method"} value={method} onChange={(e) => setMethod(e.target.value)} className="sm:col-span-2" />
        </div>
        <Button onClick={requestPayout} disabled={submitting} className="mt-4">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin mx-2" /> : <Send className="h-4 w-4 mx-2" />}
          {lang === "ar" ? "إرسال الطلب" : "Submit request"}
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <h2 className="font-bold text-foreground mb-3">{lang === "ar" ? "آخر الأرباح" : "Recent earnings"}</h2>
          <div className="rounded-2xl border border-border bg-card divide-y divide-border">
            {earnings.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">—</p>}
            {earnings.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</span>
                <span className="font-bold text-emerald-500">+{Number(e.net).toLocaleString()} SYP</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="font-bold text-foreground mb-3">{lang === "ar" ? "طلبات السحب" : "Payout requests"}</h2>
          <div className="rounded-2xl border border-border bg-card divide-y divide-border">
            {payouts.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">—</p>}
            {payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <div className="font-semibold text-foreground">{Number(p.amount).toLocaleString()} SYP</div>
                  <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()} {p.method && `· ${p.method}`}</div>
                </div>
                <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${
                  p.status === "paid" ? "bg-emerald-500/10 text-emerald-500" :
                  p.status === "rejected" ? "bg-rose-500/10 text-rose-500" :
                  "bg-amber-500/10 text-amber-500"
                }`}>{p.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border border-border p-6 ${highlight ? "bg-gradient-to-br from-primary/10 to-accent/5" : "bg-card"}`}>
      <div className="text-xs text-muted-foreground uppercase font-semibold">{label}</div>
      <div className="mt-2 text-2xl font-bold text-foreground">{Number(value).toLocaleString()} <span className="text-sm font-medium text-muted-foreground">SYP</span></div>
    </div>
  );
}
