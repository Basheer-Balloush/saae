import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wallet, ArrowDownLeft, ArrowUpRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/learning-management-system/student/wallet")({
  head: () => ({ meta: [{ title: "LMS · Wallet" }] }),
  component: WalletPage,
});

type Wallet = { balance: number; pending_payout: number };
type Tx = { id: string; type: string; amount: number; created_at: string; course_id: string | null };

function WalletPage() {
  const { user } = useLmsAuth();
  const { lang } = useLang();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: w }, { data: t }] = await Promise.all([
        supabase.from("lms_wallets").select("balance,pending_payout").eq("user_id", user.id).maybeSingle(),
        supabase.from("lms_transactions").select("id,type,amount,created_at,course_id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      ]);
      setWallet((w as Wallet) ?? { balance: 0, pending_payout: 0 });
      setTxs((t as Tx[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <p className="text-center py-20 text-muted-foreground">{lang === "ar" ? "جاري التحميل..." : "Loading..."}</p>;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <Wallet className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">{lang === "ar" ? "محفظتي" : "My Wallet"}</h1>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 to-accent/5 p-6">
          <div className="text-xs text-muted-foreground uppercase font-semibold">{lang === "ar" ? "الرصيد المتاح" : "Available balance"}</div>
          <div className="mt-2 text-3xl font-bold text-foreground">{Number(wallet?.balance ?? 0).toLocaleString()} <span className="text-base font-medium text-muted-foreground">SYP</span></div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="text-xs text-muted-foreground uppercase font-semibold">{lang === "ar" ? "قيد السحب" : "Pending payout"}</div>
          <div className="mt-2 text-3xl font-bold text-foreground">{Number(wallet?.pending_payout ?? 0).toLocaleString()} <span className="text-base font-medium text-muted-foreground">SYP</span></div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-3">{lang === "ar" ? "لشحن الرصيد، تواصل مع الإدارة." : "To top up your balance, contact the administration."}</p>

      <h2 className="text-lg font-bold text-foreground mb-3">{lang === "ar" ? "سجل العمليات" : "Transactions"}</h2>
      <div className="rounded-2xl border border-border bg-card divide-y divide-border">
        {txs.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">{lang === "ar" ? "لا توجد عمليات" : "No transactions yet"}</p>}
        {txs.map((tx) => {
          const positive = tx.amount > 0;
          return (
            <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
              <div className={`h-9 w-9 rounded-full flex items-center justify-center ${positive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                {positive ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-foreground capitalize">{tx.type}</div>
                <div className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</div>
              </div>
              <div className={`font-bold text-sm ${positive ? "text-emerald-500" : "text-rose-500"}`}>
                {positive ? "+" : ""}{Number(tx.amount).toLocaleString()} SYP
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
