import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { lmsT } from "@/lib/lms-i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, KeyRound } from "lucide-react";
import { PASSWORD_MIN } from "@/lib/password-policy";
import { localizeAuthError } from "@/lib/auth-error-i18n";

export const Route = createFileRoute("/learning-management-system/reset-password")({
  head: () => ({ meta: [{ title: "LMS · Reset password" }] }),
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
    const parsed = z.string().min(6).max(72).safeParse(password);
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
      toast.error(err instanceof Error ? err.message : tr.authFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <KeyRound className="h-6 w-6" />
          </span>
        </div>
        <h1 className="mt-3 text-xl font-bold text-foreground text-center">{tr.resetTitle}</h1>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <div>
            <Label htmlFor="password">{tr.newPassword}</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mx-2" />}
            {tr.updatePassword}
          </Button>
        </form>
      </div>
    </div>
  );
}
