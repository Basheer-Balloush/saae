import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useLmsAuth } from "@/hooks/useLmsAuth";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { localizeAuthError } from "@/lib/auth-error-i18n";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { lmsRedirectSearchSchema } from "@/lib/lms-redirect";
import { AuthLayout } from "@/components/lms-skin/AuthLayout";
import { PasswordInput } from "@/components/lms-skin/PasswordInput";
import { LMS_SKIN_LINKS } from "@/components/lms-skin/skin";


export const Route = createFileRoute("/learning-management-system/login")({
  head: () => ({ meta: [{ title: "LMS · Sign in" }], links: LMS_SKIN_LINKS }),
  validateSearch: (raw: Record<string, unknown>) => lmsRedirectSearchSchema(raw),
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
  const [submitting, setSubmitting] = useState(false);
  const search = Route.useSearch();
  const target = search.redirect ?? "/learning-management-system/profile";

  useEffect(() => {
    if (!loading && user) navigate({ to: target });
  }, [loading, user, navigate, target]);


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
    <AuthLayout titleId="auth-title">
      <h1 id="auth-title">{tr.signInTitle}</h1>
      <p className="auth-lede">{tr.signInSubtitle}</p>

      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="email">{tr.email}</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" placeholder="name@example.com" />
        </div>
        <div className="field">
          <label htmlFor="password">{tr.password}</label>
          <PasswordInput id="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit" className="auth-submit" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {tr.signIn}
        </button>
      </form>
      <p className="auth-alt">
        <Link to="/learning-management-system/signup" search={{ redirect: search.redirect }}>
          {tr.needAccount}
        </Link>
      </p>
      <p className="auth-alt">
        <Link to="/learning-management-system/forgot-password">{tr.forgotPassword}</Link>
      </p>
    </AuthLayout>
  );
}
