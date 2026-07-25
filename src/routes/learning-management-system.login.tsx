import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { localizeAuthError } from "@/lib/auth-error-i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import logo from "@/assets/saae-logo.png";

export const Route = createFileRoute("/learning-management-system/login")({
  head: () => ({ meta: [{ title: "LMS · Sign in" }] }),
  component: LmsLogin,
});

const schema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
});

function LmsLogin() {
  const navigate = useNavigate();
  const { user, loading } = useLmsAuth();
  const { lang } = useLang();
  const tr = lmsT[lang];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/learning-management-system/profile" });
  }, [loading, user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      const code = parsed.error.issues[0].path[0];
      toast.error(code === "email" ? tr.invalidEmail : tr.passwordMin);
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword(parsed.data);
      if (error) throw error;
      toast.success(tr.signedIn);
    } catch (err: unknown) {
      toast.error(localizeAuthError(err, lang, tr.authFailed));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-24">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-col items-center text-center">
          <img
            src={logo}
            alt="SAAE"
            width={80}
            height={80}
            className="h-16 w-auto"
          />
        </div>
        <h1 className="mt-3 text-xl font-bold text-foreground text-center">{tr.signInTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground text-center">{tr.signInSubtitle}</p>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <div>
            <Label htmlFor="email">{tr.email}</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
          </div>
          <div>
            <Label htmlFor="password">{tr.password}</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" className="pr-10" />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mx-2" />}
            {tr.signIn}
          </Button>
        </form>
        <div className="mt-4 flex items-center justify-between text-sm">
          <Link to="/learning-management-system/signup" className="text-primary hover:underline font-medium">
            {tr.needAccount}
          </Link>
          <Link to="/learning-management-system/forgot-password" className="text-muted-foreground hover:text-primary">
            {tr.forgotPassword}
          </Link>
        </div>
      </div>
    </div>
  );
}
