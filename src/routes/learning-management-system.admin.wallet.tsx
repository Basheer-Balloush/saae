import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Wallet, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/learning-management-system/admin/wallet")({
  head: () => ({ meta: [{ title: "LMS Admin · Wallet topup" }] }),
  component: AdminWallet,
});

function AdminWallet() {
  const { lang } = useLang();
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState("");
  const [minPayout, setMinPayout] = useState("");

  const topup = async () => {
    if (!userId.trim() || !amount) return;
    setBusy(true);
    const { error } = await supabase.rpc("lms_admin_topup", { _user_id: userId.trim(), _amount: parseFloat(amount), _notes: notes || undefined });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success(lang === "ar" ? "تم شحن الرصيد" : "Wallet topped up"); setAmount(""); setNotes(""); }
  };

  const saveSettings = async () => {
    const patch: { commission_pct?: number; min_payout?: number } = {};
    if (pct) patch.commission_pct = parseFloat(pct);
    if (minPayout) patch.min_payout = parseFloat(minPayout);
    if (!Object.keys(patch).length) return;
    const { error } = await supabase.from("lms_settings").update(patch).eq("id", true);
    if (error) toast.error(error.message);
    else toast.success(lang === "ar" ? "تم الحفظ" : "Saved");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Wallet className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">{lang === "ar" ? "شحن رصيد مستخدم" : "Top up user wallet"}</h1>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
          <Input placeholder={lang === "ar" ? "User ID (UUID)" : "User ID (UUID)"} value={userId} onChange={(e) => setUserId(e.target.value)} />
          <Input type="number" placeholder={lang === "ar" ? "المبلغ (ل.س)" : "Amount (SYP)"} value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Input placeholder={lang === "ar" ? "ملاحظات (اختياري)" : "Notes (optional)"} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button onClick={topup} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin mx-2" />}
            {lang === "ar" ? "شحن الرصيد" : "Top up"}
          </Button>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-foreground mb-4">{lang === "ar" ? "إعدادات المنصة" : "Platform settings"}</h2>
        <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground font-semibold">{lang === "ar" ? "نسبة العمولة %" : "Commission %"}</label>
              <Input type="number" placeholder="20" value={pct} onChange={(e) => setPct(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-semibold">{lang === "ar" ? "الحد الأدنى للسحب" : "Min payout"}</label>
              <Input type="number" placeholder="50000" value={minPayout} onChange={(e) => setMinPayout(e.target.value)} />
            </div>
          </div>
          <Button onClick={saveSettings}>{lang === "ar" ? "حفظ" : "Save"}</Button>
        </div>
      </div>
    </div>
  );
}
