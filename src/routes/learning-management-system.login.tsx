import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
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
import { resendLmsConfirmationEmail } from "@/lib/lms-auth.functions";


export const Route = createFileRoute("/learning-management-system/login")({
  head: () => ({ meta: [{ title: "LMS · Sign in" }], links: LMS_SKIN_LINKS }),
  // `link=expired`: a confirmation link failed (see the LMS layout).
  validateSearch: (raw: Record<string, unknown>): { redirect?: string; link?: "expired" } => ({
    ...lmsRedirectSearchSchema(raw),
    ...(raw?.link === "expired" ? { link: "expired" as const } : {}),
  }),
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
  const ar = lang === "ar";
  const resendConfirmation = useServerFn(resendLmsConfirmationEmail);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const search = Route.useSearch();
  const target = search.redirect ?? "/learning-management-system/profile";
  // Offer a new confirmation link after a failed one, or when sign-in says
  // the email is not confirmed yet.
  const [needsConfirm, setNeedsConfirm] = useState(search.link === "expired");
  const [resending, setResending] = useState(false);

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
      if (error) {
        if (error.code === "email_not_confirmed" || /email not confirmed/i.test(error.message))
          setNeedsConfirm(true);
        throw error;
      }
      toast.success(tr.signedIn);
    } catch (err: unknown) {
      toast.error(localizeAuthError(err, lang, tr.authFailed));
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    const address = email.trim();
    if (!z.string().email().safeParse(address).success) {
      toast.error(tr.invalidEmail);
      return;
    }
    setResending(true);
    try {
      const res = await resendConfirmation({ data: { email: address, lang } });
      if (res.sent) {
        toast.success(
          ar
            ? `أرسلنا رابط تأكيد جديداً إلى ${address} إن كان الحساب بحاجة إلى تأكيد. تفقّد مجلد الرسائل غير المرغوب فيها أيضاً.`
            : `If this account still needs confirming, a new link is on its way to ${address}. Check your spam folder too.`,
        );
      } else {
        toast.error(
          ar
            ? "طلبات كثيرة، انتظر قليلاً ثم حاول مجدداً"
            : "Too many requests. Please wait before trying again",
        );
      }
    } catch (err: unknown) {
      toast.error(localizeAuthError(err, lang, tr.authFailed));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout titleId="auth-title">
      <h1 id="auth-title">{tr.signInTitle}</h1>
      <p className="auth-lede">{tr.signInSubtitle}</p>
      {search.link === "expired" && (
        <p className="auth-lede" role="status">
          {ar
            ? "رابط التأكيد منتهي الصلاحية أو استُخدم من قبل. إن كنت أكّدت بريدك فسجّل الدخول، وإلا فاكتب بريدك واطلب رابطاً جديداً بالأسفل."
            : "That confirmation link has expired or was already used. If you confirmed your email, just sign in. Otherwise enter your email and ask for a new link below."}
        </p>
      )}

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
          <span>{tr.signIn}</span>
        </button>
      </form>
      {needsConfirm && (
        <button type="button" className="auth-secondary" onClick={onResend} disabled={resending}>
          {resending && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>{ar ? "أرسل لي رابط تأكيد جديداً" : "Send me a new confirmation link"}</span>
        </button>
      )}
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
