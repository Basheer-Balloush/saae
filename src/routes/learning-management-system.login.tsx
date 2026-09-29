import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
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
import { ContinueAsGuest } from "@/components/lms/GuestAccess";
import { mergeGuestIntoAccount } from "@/lib/guest-account.functions";


export const Route = createFileRoute("/learning-management-system/login")({
  head: () => ({ meta: [{ title: "Sign in — SAAE Training and Learning Platform" }], links: LMS_SKIN_LINKS }),
  validateSearch: (raw: Record<string, unknown>) => lmsRedirectSearchSchema(raw),
  component: LmsLogin,
});



const schema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
});

function LmsLogin() {
  const navigate = useNavigate();
  const { user, loading, isGuest } = useLmsAuth();
  const { lang } = useLang();
  const ar = lang === "ar";
  const tr = lmsT[lang];
  const mergeGuest = useServerFn(mergeGuestIntoAccount);
  // While a guest's progress moves into the account, stay on this page.
  const merging = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const search = Route.useSearch();
  const target = search.redirect ?? "/learning-management-system/profile";

  useEffect(() => {
    if (!loading && user && !isGuest && !merging.current) navigate({ to: target });
  }, [loading, user, isGuest, navigate, target]);


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
      // A guest's own token, taken before the session switches, proves the
      // guest is theirs so its progress can move into the account.
      let guestToken: string | null = null;
      if (isGuest) {
        const { data } = await supabase.auth.refreshSession();
        guestToken = data.session?.access_token ?? null;
        merging.current = true;
      }
      const { error } = await supabase.auth.signInWithPassword(parsed.data);
      if (error) {
        merging.current = false;
        throw error;
      }
      if (!guestToken) {
        toast.success(tr.signedIn);
        return;
      }
      try {
        const res = await mergeGuest({ data: { guestAccessToken: guestToken, lang } });
        toast.success(
          res.courses
            ? ar
              ? "سجّلت الدخول، ونقلنا دوراتك وتقدّمك كزائر إلى حسابك."
              : "You are signed in, and your guest courses and progress are now in your account."
            : tr.signedIn,
        );
      } catch (err: unknown) {
        toast.error(localizeAuthError(err, lang, tr.authFailed));
      } finally {
        merging.current = false;
        navigate({ to: target });
      }
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
      {isGuest && (
        <p className="auth-guest-note">
          {ar
            ? "أنت تتصفّح كزائر. سجّل الدخول إلى حسابك وستنتقل إليه دوراتك وتقدّمك."
            : "You are browsing as a guest. Sign in to your account and your courses and progress move into it."}
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
      {!user && !loading && <ContinueAsGuest redirect={search.redirect} />}
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
