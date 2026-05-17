import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { localizeAuthError } from "@/lib/auth-error-i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import logo from "@/assets/saae-logo.png";

export const Route = createFileRoute("/learning-management-system/forgot-password")({
  head: () => ({ meta: [{ title: "LMS · Forgot password" }] }),
  component: ForgotPage,
});

function ForgotPage() {
  const { lang } = useLang();
  const tr = lmsT[lang];
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z.string().trim().email().max(255).safeParse(email);
    if (!parsed.success) {
      toast.error(tr.invalidEmail);
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
        redirectTo: `${window.location.origin}/learning-management-system/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success(tr.resetLinkSent);
    } catch (err: unknown) {
      toast.error(localizeAuthError(err, lang, tr.authFailed));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-10">
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
        <h1 className="mt-3 text-xl font-bold text-foreground text-center">{tr.forgotTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground text-center">{tr.forgotSubtitle}</p>

        {sent ? (
          <p className="mt-6 rounded-xl bg-primary/10 border border-primary/30 p-4 text-sm text-center text-foreground">
            {tr.resetLinkSent}
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            <div>
              <Label htmlFor="email">{tr.email}</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mx-2" />}
              {tr.sendResetLink}
            </Button>
          </form>
        )}
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link to="/learning-management-system/login" className="text-primary hover:underline font-medium">
            {tr.haveAccount}
          </Link>
        </p>
      </div>
    </div>
  );
}
