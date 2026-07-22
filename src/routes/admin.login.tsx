import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Globe, Sun, Moon, Eye, EyeOff } from "lucide-react";
import logoEnLight from "@/assets/saae-logo-en-light.png";
import logoEnDark from "@/assets/saae-logo-en-dark.png";
import logoArLight from "@/assets/saae-logo-ar-light.png";
import logoArDark from "@/assets/saae-logo-ar-dark.png";
import logoFallback from "@/assets/saae-logo-horizontal.png";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Admin Sign In — SAAE" },
      { name: "description", content: "Sign in to the SAAE content management admin console." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin Sign In — SAAE" },
      { property: "og:description", content: "Sign in to the SAAE admin console." },
    ],
  }),
  component: AdminLogin,
});

const T = {
  en: {
    back: "← Back to site",
    title: "Admin Sign in",
    subtitle: "Enter your admin email to manage news.",
    email: "Email",
    password: "Password",
    signIn: "Sign in",
    invalidEmail: "Invalid email",
    shortPassword: "At least 6 characters",
    signedIn: "Signed in",
    authFailed: "Authentication failed",
    langBtn: "العربية",
  },
  ar: {
    back: "→ العودة إلى الموقع",
    title: "تسجيل دخول المسؤول",
    subtitle: "أدخل بريد المسؤول لإدارة الأخبار.",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    signIn: "تسجيل الدخول",
    invalidEmail: "بريد إلكتروني غير صالح",
    shortPassword: "٦ أحرف على الأقل",
    signedIn: "تم تسجيل الدخول",
    authFailed: "فشل المصادقة",
    langBtn: "English",
  },
};

function AdminLogin() {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const { lang, dir, toggle: toggleLang } = useLang();
  const { theme, toggle: toggleTheme } = useTheme();
  const t = T[lang];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const schema = z.object({
    email: z.string().trim().email(t.invalidEmail).max(255),
    password: z.string().min(6, t.shortPassword).max(72),
  });

  useEffect(() => {
    if (!loading && user && isAdmin) {
      navigate({ to: "/admin" });
    }
  }, [loading, user, isAdmin, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword(parsed.data);
      if (error) throw error;
      toast.success(t.signedIn);
    } catch (err: any) {
      toast.error(err.message ?? t.authFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-16" dir={dir}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-primary">
            {t.back}
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={toggleLang} aria-label="Toggle language">
              <Globe className="h-4 w-4" /> {t.langBtn}
            </Button>
            <Button variant="outline" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <h1 className="mt-4 text-2xl font-bold text-foreground">{t.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t.subtitle}</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">{t.email}</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="password">{t.password}</Label>
            <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t.signIn}
          </Button>
        </form>
      </div>
    </div>
  );
}
