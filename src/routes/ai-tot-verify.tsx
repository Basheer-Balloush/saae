import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KeyRound, LogOut, Loader2, Search, User, Phone, Mail, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { toUserMessage } from "@/lib/safe-error";

export const Route = createFileRoute("/ai-tot-verify")({
  head: () => ({
    meta: [
      { title: "AI TOT — PIN Verification" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: VerifyPage,
});

const STORAGE_KEY = "aitot_verifier_creds";

type Creds = { username: string; password: string };
type Lookup = { full_name: string; phone: string; email: string; specialization: string };

function VerifyPage() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const [creds, setCreds] = useState<Creds | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v) setCreds(JSON.parse(v));
    } catch { /* ignore */ }
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 grid place-items-center px-4" dir={ar ? "rtl" : "ltr"}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg mb-4">
            <KeyRound className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-extrabold">
            {ar ? "التحقق من رمز الحضور" : "Attendance PIN Verification"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {ar ? "الندوة الوطنية للذكاء الاصطناعي" : "Syrian National AI Symposium"}
          </p>
        </div>

        {!creds ? (
          <LoginForm ar={ar} onLogin={(c) => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
            setCreds(c);
          }} />
        ) : (
          <VerifyPanel ar={ar} creds={creds} onLogout={() => { localStorage.removeItem(STORAGE_KEY); setCreds(null); }} />
        )}
      </div>
    </main>
  );
}

function LoginForm({ ar, onLogin }: { ar: boolean; onLogin: (c: Creds) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("verify_event_verifier_login" as never, { _username: username.trim(), _password: password } as never);
      if (error) throw error;
      if (!data) {
        toast.error(ar ? "بيانات الدخول غير صحيحة" : "Invalid credentials");
        return;
      }
      onLogin({ username: username.trim(), password });
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
      <div className="space-y-1.5">
        <Label>{ar ? "اسم المستخدم" : "Username"}</Label>
        <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
      </div>
      <div className="space-y-1.5">
        <Label>{ar ? "كلمة المرور" : "Password"}</Label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </div>
      <Button type="submit" disabled={busy} className="w-full">
        {busy && <Loader2 className="h-4 w-4 animate-spin mx-1" />}
        {ar ? "دخول" : "Sign in"}
      </Button>
    </form>
  );
}

function VerifyPanel({ ar, creds, onLogout }: { ar: boolean; creds: Creds; onLogout: () => void }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Lookup | null | "notfound">(null);

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{3}$/.test(pin)) {
      toast.error(ar ? "الرمز يجب أن يكون 3 أرقام" : "PIN must be 3 digits");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const { data, error } = await supabase.rpc("lookup_event_pin" as never, {
        _username: creds.username, _password: creds.password, _pin: pin,
      } as never);
      if (error) {
        if (String(error.message).includes("Unauthorized")) {
          toast.error(ar ? "انتهت الجلسة، يرجى تسجيل الدخول مجدداً" : "Session expired, please sign in again");
          onLogout();
          return;
        }
        throw error;
      }
      const row = Array.isArray(data) && data.length > 0 ? data[0] as Lookup : null;
      setResult(row ?? "notfound");
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2">
        <span className="text-xs text-muted-foreground">{ar ? "متصل بـ" : "Signed in as"} <strong className="text-foreground">{creds.username}</strong></span>
        <Button size="sm" variant="ghost" onClick={onLogout}><LogOut className="h-3.5 w-3.5" />{ar ? "خروج" : "Sign out"}</Button>
      </div>

      <form onSubmit={lookup} className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="space-y-1.5">
          <Label>{ar ? "رمز الدخول (3 أرقام)" : "Access PIN (3 digits)"}</Label>
          <Input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
            inputMode="numeric"
            maxLength={3}
            className="text-center text-3xl font-mono tracking-[0.6em] h-16"
            autoFocus
          />
        </div>
        <Button type="submit" disabled={busy || pin.length !== 3} className="w-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin mx-1" /> : <Search className="h-4 w-4" />}
          {ar ? "تحقق" : "Verify"}
        </Button>
      </form>

      {result === "notfound" && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 dark:bg-rose-950/30 p-5 text-center">
          <p className="font-bold text-rose-800 dark:text-rose-200">{ar ? "الرمز غير موجود" : "PIN not found"}</p>
          <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">{ar ? "تحقق من الرمز وأعد المحاولة" : "Check the PIN and try again"}</p>
        </div>
      )}

      {result && result !== "notfound" && (
        <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-5 space-y-3">
          <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200 uppercase tracking-widest">
            {ar ? "✓ تم التحقق" : "✓ Verified"}
          </p>
          <Field icon={User} label={ar ? "الاسم" : "Name"} value={result.full_name} />
          <Field icon={Phone} label={ar ? "الهاتف" : "Phone"} value={result.phone} />
          <Field icon={Mail} label={ar ? "البريد" : "Email"} value={result.email} />
          <Field icon={Briefcase} label={ar ? "الاختصاص" : "Specialization"} value={result.specialization} />
        </div>
      )}
    </div>
  );
}

function Field({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-emerald-700 dark:text-emerald-300 mt-1 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="font-semibold break-words">{value}</p>
      </div>
    </div>
  );
}
