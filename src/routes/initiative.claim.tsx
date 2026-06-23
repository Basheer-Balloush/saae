import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { claimSeatAccount } from "@/lib/initiative.functions";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, KeyRound } from "lucide-react";

type Search = { token?: string };

export const Route = createFileRoute("/initiative/claim")({
  validateSearch: (s: Record<string, unknown>): Search => ({ token: typeof s.token === "string" ? s.token : undefined }),
  head: () => ({ meta: [{ title: "تفعيل مقعد المبادرة" }] }),
  component: ClaimPage,
});

function ClaimPage() {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const claimFn = useServerFn(claimSeatAccount);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ email: string } | null>(null);

  const t = isAr ? {
    title: "تفعيل مقعدك في المبادرة",
    desc: "تم تغطية مقعدك. ضع كلمة مرور لإنشاء حسابك في منصة LMS والوصول الفوري للكورس.",
    pw: "كلمة المرور (8 أحرف على الأقل)",
    activate: "تفعيل وإنشاء الحساب",
    success: "تم تفعيل حسابك بنجاح",
    successDesc: "يمكنك الآن تسجيل الدخول والبدء بالكورس.",
    goLogin: "تسجيل الدخول",
    invalid: "رابط غير صالح أو منتهي.",
  } : {
    title: "Activate your seat",
    desc: "Your seat is covered. Set a password to create your LMS account and access the course immediately.",
    pw: "Password (min 8 chars)",
    activate: "Activate & create account",
    success: "Account activated",
    successDesc: "You can now log in and start the course.",
    goLogin: "Log in",
    invalid: "Invalid or expired link.",
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-32 pb-20 container mx-auto px-4 text-center"><p className="text-destructive">{t.invalid}</p></main>
        <Footer />
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error(isAr ? "كلمة المرور قصيرة جداً" : "Password too short"); return; }
    setLoading(true);
    try {
      const res: any = await claimFn({ data: { token, password } });
      // sign the user in
      if (res?.email) {
        await supabase.auth.signInWithPassword({ email: res.email, password });
      }
      setDone({ email: res.email });
      toast.success(t.success);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-32 pb-20 container mx-auto px-4 max-w-md">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-soft">
          {done ? (
            <div className="text-center">
              <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
              <h1 className="text-2xl font-bold mt-4">{t.success}</h1>
              <p className="text-muted-foreground mt-2">{t.successDesc}</p>
              <Button className="mt-6 w-full" onClick={() => navigate({ to: "/learning-management-system/student" })}>
                {isAr ? "الانتقال للكورس" : "Go to course"}
              </Button>
            </div>
          ) : (
            <>
              <KeyRound className="h-12 w-12 text-primary mx-auto" />
              <h1 className="text-2xl font-bold text-center mt-4">{t.title}</h1>
              <p className="text-muted-foreground text-center mt-2">{t.desc}</p>
              <form onSubmit={onSubmit} className="space-y-4 mt-6">
                <div>
                  <Label>{t.pw}</Label>
                  <Input type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
                </div>
                <Button type="submit" disabled={loading} className="w-full">{loading ? "..." : t.activate}</Button>
              </form>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
