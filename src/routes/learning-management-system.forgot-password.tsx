import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { localizeAuthError } from "@/lib/auth-error-i18n";
import { sendLmsPasswordReset } from "@/lib/lms-auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import logo from "@/assets/saae-logo.png";

export const Route = createFileRoute("/learning-management-system/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot Password — SAAE Learning Platform" },
      { name: "description", content: "Reset your SAAE Learning Platform password by requesting a secure email link." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Forgot Password — SAAE Learning Platform" },
      { property: "og:description", content: "Reset your SAAE Learning Platform password." },
    ],
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
