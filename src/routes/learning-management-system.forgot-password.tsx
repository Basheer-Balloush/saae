import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { localizeAuthError } from "@/lib/auth-error-i18n";
import { sendLmsPasswordReset } from "@/lib/lms-auth.functions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/lms-skin/AuthLayout";
import { LMS_SKIN_LINKS } from "@/components/lms-skin/skin";

export const Route = createFileRoute("/learning-management-system/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot Password — SAAE Training and Learning Platform" },
      { name: "description", content: "Reset your SAAE Training and Learning Platform password by requesting a secure email link." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Forgot Password — SAAE Training and Learning Platform" },
      { property: "og:description", content: "Reset your SAAE Training and Learning Platform password." },
    ],
    links: LMS_SKIN_LINKS,
  }),
  component: ForgotPage,
});

function ForgotPage() {
  const { lang } = useLang();
  const tr = lmsT[lang];
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const sendPasswordReset = useServerFn(sendLmsPasswordReset);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z.string().trim().email().max(255).safeParse(email);
    if (!parsed.success) {
      toast.error(tr.invalidEmail);
      return;
    }
    setSubmitting(true);
    try {
      await sendPasswordReset({ data: { email: parsed.data, lang } });
      setSent(true);
      toast.success(tr.resetLinkSent);
    } catch (err: unknown) {
      toast.error(localizeAuthError(err, lang, tr.authFailed));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout titleId="auth-title">
      <h1 id="auth-title">{tr.forgotTitle}</h1>
      <p className="auth-lede">{tr.forgotSubtitle}</p>

      {sent ? (
        <p className="auth-note">{tr.resetLinkSent}</p>
      ) : (
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="email">{tr.email}</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" placeholder="name@example.com" />
          </div>
          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{tr.sendResetLink}</span>
          </button>
        </form>
      )}
      <p className="auth-alt">
        <Link to="/learning-management-system/login">{tr.haveAccount}</Link>
      </p>
    </AuthLayout>
  );
}
