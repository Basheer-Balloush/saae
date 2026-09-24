import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { toast } from "sonner";
import { Loader2, KeyRound } from "lucide-react";
import { PASSWORD_MIN } from "@/lib/password-policy";
import { localizeAuthError } from "@/lib/auth-error-i18n";
import { AuthLayout } from "@/components/lms-skin/AuthLayout";
import { PasswordInput } from "@/components/lms-skin/PasswordInput";
import { LMS_SKIN_LINKS } from "@/components/lms-skin/skin";

export const Route = createFileRoute("/learning-management-system/reset-password")({
  head: () => ({ meta: [{ title: "LMS · Reset password" }], links: LMS_SKIN_LINKS }),
  component: ResetPage,
});

function ResetPage() {
  const { lang } = useLang();
  const tr = lmsT[lang];
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z.string().min(PASSWORD_MIN).max(72).safeParse(password);
    if (!parsed.success) {
      toast.error(tr.passwordMin);
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: parsed.data });
      if (error) throw error;
      toast.success(tr.passwordUpdated);
      navigate({ to: "/learning-management-system/student" });
    } catch (err: unknown) {
      toast.error(localizeAuthError(err, lang, tr.authFailed));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout titleId="auth-title">
      <span className="auth-icon" aria-hidden="true">
        <KeyRound />
      </span>
      <h1 id="auth-title">{tr.resetTitle}</h1>

      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="password">{tr.newPassword}</label>
          <PasswordInput id="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit" className="auth-submit" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>{tr.updatePassword}</span>
        </button>
      </form>
    </AuthLayout>
  );
}
