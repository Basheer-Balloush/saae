import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAmsAuth } from "@/hooks/useAmsAuth";
import { useLang } from "@/lib/i18n";
import { amsT } from "@/lib/ams-i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import logo from "@/assets/saae-logo.png";

export const Route = createFileRoute("/attendance-management-system/login")({
  head: () => ({ meta: [{ title: "AMS · Sign in" }] }),
  component: AmsLogin,
});

const schema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
});

function AmsLogin() {
  const navigate = useNavigate();
  const { user, hasAccess, loading } = useAmsAuth();
  const { lang } = useLang();
  const tr = amsT[lang];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && hasAccess) {
      navigate({ to: "/attendance-management-system" });
    }
  }, [loading, user, hasAccess, navigate]);

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
      const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
      if (error) throw error;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user!.id)
        .in("role", ["attendance_user", "attendance_admin"]);

      if (!roles || roles.length === 0) {
        await supabase.auth.signOut();
        toast.error(tr.noAccess);
        return;
      }

      toast.success(tr.signedIn);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : tr.authFailed;
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-soft">
        <div className="flex flex-col items-center text-center">
          <img
            src={logo}
            alt="SAAE"
            width={96}
            height={96}
            className="h-24 w-auto"
          />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-foreground text-center">
          {tr.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground text-center">
          {tr.subtitle}
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">{tr.email}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
            />
          </div>
          <div>
            <Label htmlFor="password">{tr.password}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              dir="ltr"
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mx-2" />}
            {submitting ? tr.signingIn : tr.signIn}
          </Button>
        </form>
      </div>
    </div>
  );
}
