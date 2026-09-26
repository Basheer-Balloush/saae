import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, Languages, Loader2, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConsoleAmbient, useConsoleRoot } from "@/components/console/ConsoleShell";
import "@/components/console/console.css";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Admin Sign In — SAAE" },
      { name: "description", content: "Sign in to the SAAE admin console." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin Sign In — SAAE" },
      { property: "og:description", content: "Sign in to the SAAE admin console." },
    ],
  }),
  component: AdminLogin,
});

/* The door to the console: same ground as the site, one card, two fields. */
function AdminLogin() {
  useConsoleRoot();
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const { lang, dir, toggle } = useLang();
  const ar = lang === "ar";
  const t = (a: string, e: string) => (ar ? a : e);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!loading && user && isAdmin) navigate({ to: "/admin" });
  }, [loading, user, isAdmin, navigate]);

  const schema = z.object({
    email: z.string().trim().email(t("بريد إلكتروني غير صالح", "Invalid email")).max(255),
    password: z.string().min(6, t("٦ أحرف على الأقل", "At least 6 characters")).max(72),
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) return void toast.error(parsed.error.issues[0].message);
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword(parsed.data);
      if (error) throw error;
      toast.success(t("تم تسجيل الدخول", "Signed in"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("فشل تسجيل الدخول", "Sign-in failed"));
    } finally {
      setSubmitting(false);
    }
  };

  // Signed in, but the account has no admin role: say so instead of a silent form.
  const notAdmin = !loading && !!user && !isAdmin;

  return (
    <div
      className="cx px-4 py-12"
      style={{ flexDirection: "column", alignItems: "center", justifyContent: "center" }}
      dir={dir}
    >
      <ConsoleAmbient />
      <div className="w-full max-w-[420px]">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[var(--cx-muted)] hover:text-[var(--cx-teal)]"
          >
            <ArrowLeft className="h-4 w-4 ltr:rotate-180" />
            {t("العودة إلى الموقع", "Back to the site")}
          </Link>
          <button
            type="button"
            onClick={toggle}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--cx-line)] px-3 py-1.5 text-[12.5px] font-bold text-[var(--cx-ink-2)] hover:border-[var(--cx-teal)]"
          >
            <Languages className="h-4 w-4" />
            {ar ? "English" : "العربية"}
          </button>
        </div>

        <div className="cx-card p-7 sm:p-8">
          <div className="flex flex-col items-center text-center">
            <span className="cx-brand-tree" style={{ width: 46, height: 52 }} aria-hidden="true" />
            <div className="mt-3 text-[13px] font-extrabold tracking-[0.2em] text-[#a8cf7e]">
              SAAE
            </div>
            <h1 className="mt-2 text-[24px] font-extrabold leading-tight">
              {t("لوحة الإدارة", "Admin console")}
            </h1>
            <p className="mt-1.5 text-[14px] text-[var(--cx-muted)]">
              {t(
                "الموقع، التعلّم والحضور من مكان واحد.",
                "Website, learning and attendance in one place.",
              )}
            </p>
          </div>

          {notAdmin ? (
            <div className="mt-6 space-y-4 text-center">
              <p className="rounded-xl border border-[var(--cx-red-line)] bg-[var(--cx-red-50)] px-4 py-3 text-[14px] text-[var(--cx-red)]">
                {t(
                  `الحساب ${user?.email ?? ""} ليس حساب مسؤول.`,
                  `${user?.email ?? "This account"} is not an admin account.`,
                )}
              </p>
              <Button variant="outline" className="w-full" onClick={() => supabase.auth.signOut()}>
                <LogOut className="h-4 w-4" />
                {t("الدخول بحساب آخر", "Use another account")}
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-7 space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-[13px] font-bold text-[var(--cx-ink-2)]"
                >
                  {t("البريد الإلكتروني", "Email")}
                </label>
                <Input
                  id="email"
                  type="email"
                  dir="ltr"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-[13px] font-bold text-[var(--cx-ink-2)]"
                >
                  {t("كلمة المرور", "Password")}
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={show ? "text" : "password"}
                    dir="ltr"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pe-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    aria-label={
                      show
                        ? t("إخفاء كلمة المرور", "Hide password")
                        : t("إظهار كلمة المرور", "Show password")
                    }
                    aria-pressed={show}
                    className="absolute end-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[var(--cx-muted)] hover:bg-[var(--cx-hover)] hover:text-[var(--cx-ink)]"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" size="lg" className="h-11 w-full" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("تسجيل الدخول", "Sign in")}
              </Button>
            </form>
          )}
        </div>
        <p className="mt-5 text-center text-[12px] text-[var(--cx-faint)]">
          {t(
            "للمدرّبين: ادخلوا من منصّة التعلّم.",
            "Instructors: sign in from the learning platform.",
          )}
        </p>
      </div>
    </div>
  );
}
